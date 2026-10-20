import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-OpenAI-Key",
};

// Valid voices for tts-1-hd
const FEMALE_VOICES = ["nova", "shimmer", "alloy"] as const;
const MALE_VOICES   = ["onyx", "echo", "fable"] as const;
const ALL_VOICES    = [...FEMALE_VOICES, ...MALE_VOICES] as const;

function pickVoice(id: string, gender?: string): string {
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  if (gender === "male")   return MALE_VOICES[sum % MALE_VOICES.length];
  if (gender === "female") return FEMALE_VOICES[sum % FEMALE_VOICES.length];
  return ALL_VOICES[sum % ALL_VOICES.length];
}

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
    const { illustration_id, openai_key, voice_gender } = await req.json();
    if (!illustration_id) return respond({ error: "illustration_id is required" }, 400);

    const openaiKey = openai_key || req.headers.get("X-OpenAI-Key") || Deno.env.get("OPENAI_API_KEY");
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

    const { data: ill } = await supabase
      .from("illustrations")
      .select("*, profiles(username, display_name)")
      .eq("id", illustration_id)
      .maybeSingle();
    if (!ill) return respond({ error: "Illustration not found" }, 404);

    // ── Step 1: GPT-4o vision → character script ──
    const visionRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `あなたはプロのアニメ声優です。イラストの人物キャラクターになりきり、そのキャラクターが実際に話す自然な日本語のセリフを生成してください。

条件:
- 必ず一人称（私、俺、僕、あたし など）で話す
- 60〜90文字程度の口語体
- 感情・性格・状況が伝わるセリフ
- 読点（、）を使って自然なリズムを作る
- セリフのみ出力（かぎかっこ不要）`,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: ill.image_url, detail: "low" } },
              {
                type: "text",
                text: [`タイトル: ${ill.title}`, ill.description || "", ill.tags?.length ? `タグ: ${ill.tags.join(", ")}` : ""]
                  .filter(Boolean).join("\n"),
              },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0.85,
      }),
    });

    if (!visionRes.ok) throw new Error(`Vision: ${await visionRes.text()}`);
    const script: string = (await visionRes.json()).choices[0].message.content.trim();

    // ── Step 2: TTS with tts-1-hd ──
    const voice = pickVoice(ill.id, voice_gender);

    const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
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

    if (!ttsRes.ok) throw new Error(`TTS: ${await ttsRes.text()}`);
    const audioBuffer = await ttsRes.arrayBuffer();

    // ── Step 3: Upload audio ──
    const path = `${user.id}/ai-${Date.now()}.mp3`;
    const { error: uploadErr } = await supabase.storage
      .from("audio").upload(path, audioBuffer, { contentType: "audio/mpeg" });
    if (uploadErr) throw uploadErr;

    const { data: { publicUrl } } = supabase.storage.from("audio").getPublicUrl(path);
    const estimatedDuration = Math.max(3, Math.ceil(script.length / 6));

    // ── Step 4: Insert voice_post ──
    const { data: voicePost, error: insertErr } = await supabase
      .from("voice_posts")
      .insert({ illustration_id, user_id: user.id, title: "AI声優", description: script, audio_url: publicUrl, duration: estimatedDuration })
      .select("*, profiles(*)")
      .single();
    if (insertErr) throw insertErr;

    return respond({ success: true, voice_post: voicePost, script });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // Don't leak internal/upstream error details to the client
    const safeMsg = msg.includes("Vision:") || msg.includes("TTS:") || msg.includes("GPT")
      ? "AI生成サービスでエラーが発生しました"
      : "生成に失敗しました";
    return respond({ error: safeMsg }, 500);
  }
});
