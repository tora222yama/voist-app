import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FEMALE_VOICES = ["nova", "shimmer", "alloy"] as const;
const MALE_VOICES   = ["onyx", "echo", "fable"] as const;
const ALL_VOICES    = [...FEMALE_VOICES, ...MALE_VOICES] as const;

function pickVoice(seed: string, gender?: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  if (gender === "male")   return MALE_VOICES[sum % MALE_VOICES.length];
  if (gender === "female") return FEMALE_VOICES[sum % FEMALE_VOICES.length];
  return ALL_VOICES[sum % ALL_VOICES.length];
}

async function humanTTS(
  openaiKey: string,
  script: string,
  voice: string,
  _characterContext: string,
): Promise<ArrayBuffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "tts-1-hd",
      input: script,
      voice,
      response_format: "mp3",
      speed: 0.90,
    }),
  });
  if (!res.ok) throw new Error(`TTS: ${await res.text()}`);
  return res.arrayBuffer();
}

// ── Illustration style prompts focused on HUMAN characters ──
const STYLE_PROMPTS: Record<string, string> = {
  anime: [
    "Stunning anime character portrait illustration.",
    "Human anime girl or boy, detailed face with large expressive eyes, flowing hair with fine strands,",
    "beautiful skin, dynamic expression showing emotion, intricate costume details.",
    "Professional anime key visual quality, vibrant colors, clean linework, soft cel-shading.",
    "Upper-body portrait, shallow depth of field, blurred bokeh background.",
  ].join(" "),

  fantasy: [
    "High-quality fantasy RPG character portrait.",
    "Human character with detailed face and expressive eyes, fantasy costume with intricate armor or robes,",
    "dramatic hair style, glowing magical effects on hands or accessories.",
    "Painterly digital art style with cinematic lighting, rich warm colors.",
    "Character-focused upper-body composition, atmospheric soft background.",
  ].join(" "),

  manga: [
    "Professional manga-style character illustration.",
    "Human character with bold clean linework, highly expressive face, detailed hair with highlights,",
    "dynamic pose, personality-filled eyes, clean black-and-white tones with selective amber/blue color accents.",
    "Sharp crisp linework, professional manga magazine quality.",
    "Portrait composition focusing on face and upper body.",
  ].join(" "),
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { concept, style = "anime", voice_gender, openai_key } = await req.json();
    if (!concept?.trim()) return respond({ error: "concept is required" }, 400);
    if (concept.length > 200) return respond({ error: "concept is too long (max 200 chars)" }, 400);

    const validStyles = ["anime", "fantasy", "manga"];
    if (!validStyles.includes(style)) return respond({ error: "invalid style" }, 400);

    const openaiKey = openai_key || Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return respond({ error: "OpenAI APIキーが必要です", code: "NO_API_KEY" }, 400);
    if (typeof openaiKey !== "string" || !openaiKey.startsWith("sk-")) {
      return respond({ error: "OpenAI APIキーが必要です", code: "NO_API_KEY" }, 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Authorization required" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return respond({ error: "Unauthorized" }, 401);

    const styleDesc = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.anime;

    // ── Step 1: DALL-E 3 — human character illustration ──
    const dallePrompt = [
      styleDesc,
      `Character concept: ${concept}.`,
      "IMPORTANT: The subject MUST be a single human/humanoid character person.",
      "Face clearly visible, emotional expression, detailed eyes and hair.",
      "NO landscape, NO scenery, NO abstract art, NO text, NO watermark.",
      "The entire image is focused on this one human character.",
    ].join(" ");

    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: dallePrompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "vivid",
        response_format: "url",
      }),
    });

    if (!dalleRes.ok) {
      const err = await dalleRes.text();
      if (err.includes("invalid_api_key") || err.includes("Incorrect API key")) {
        return respond({ error: "APIキーが無効です", code: "INVALID_API_KEY" }, 400);
      }
      throw new Error(`DALL-E 3: ${err}`);
    }
    const { data: [{ url: tempImageUrl }] } = await dalleRes.json();

    // Re-upload from OpenAI CDN to Supabase Storage (CDN URL expires in ~1h)
    const imgBuffer = await (await fetch(tempImageUrl)).arrayBuffer();
    const imagePath = `${user.id}/ai-${Date.now()}.png`;
    const { error: imgUploadErr } = await supabase.storage
      .from("illustrations").upload(imagePath, imgBuffer, { contentType: "image/png" });
    if (imgUploadErr) throw imgUploadErr;
    const { data: { publicUrl: imagePublicUrl } } = supabase.storage
      .from("illustrations").getPublicUrl(imagePath);

    // ── Step 2: GPT-4o vision → title, description, character script ──
    const metaRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `あなたはプロのアニメ声優兼クリエイターです。生成されたキャラクターイラストを見て、以下をJSON形式で返してください:
1. title: キャラクターの作品タイトル（15文字以内）
2. description: 作品の雰囲気・世界観（40文字以内）
3. script: このキャラクターが実際に口にする一人称の生きたセリフ（60〜100文字）
   - 自然な日本語口語体
   - キャラクターの感情・個性を表現
   - 声優が感情を込めて演じられる内容
JSONのみ返してください: {"title":"...","description":"...","script":"..."}`,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: tempImageUrl, detail: "low" } },
              { type: "text", text: `キャラクター設定: ${concept}` },
            ],
          },
        ],
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!metaRes.ok) throw new Error(`GPT-4o: ${await metaRes.text()}`);
    const { title, description, script } = JSON.parse((await metaRes.json()).choices[0].message.content);

    // ── Step 3: Insert illustration ──
    const { data: ill, error: illErr } = await supabase
      .from("illustrations")
      .insert({
        user_id: user.id,
        title: title ?? concept.slice(0, 30),
        description: description ?? "",
        image_url: imagePublicUrl,
        tags: [style, "AI生成", "キャラクター"],
      })
      .select().single();
    if (illErr) throw illErr;

    // ── Step 4: Human TTS via gpt-4o-audio-preview ──
    const voice = pickVoice(ill.id, voice_gender);
    const characterContext = `${title ?? concept} — ${description ?? ""}。${concept}`;
    const audioBytes = await humanTTS(openaiKey, script, voice, characterContext);

    // ── Step 5: Upload audio ──
    const audioPath = `${user.id}/ai-${Date.now()}.mp3`;
    const { error: audioErr } = await supabase.storage
      .from("audio").upload(audioPath, audioBytes, { contentType: "audio/mpeg" });
    if (audioErr) throw audioErr;
    const { data: { publicUrl: audioPublicUrl } } = supabase.storage.from("audio").getPublicUrl(audioPath);

    // ── Step 6: Insert voice_post ──
    const estimatedDuration = Math.max(3, Math.ceil(script.length / 6));
    const { data: voicePost, error: vpErr } = await supabase
      .from("voice_posts")
      .insert({ illustration_id: ill.id, user_id: user.id, title: "AI声優", description: script, audio_url: audioPublicUrl, duration: estimatedDuration })
      .select("*, profiles(*)")
      .single();
    if (vpErr) throw vpErr;

    await supabase.from("illustrations").update({ voice_count: 1 }).eq("id", ill.id);

    return respond({ success: true, illustration: { ...ill, image_url: imagePublicUrl }, voice_post: voicePost, script });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // Don't leak internal/upstream error details to the client
    const safeMsg = msg.includes("Vision:") || msg.includes("TTS:") || msg.includes("DALL")
      ? "AI生成サービスでエラーが発生しました"
      : "生成に失敗しました";
    return respond({ error: safeMsg }, 500);
  }
});
