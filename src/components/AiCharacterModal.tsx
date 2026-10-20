import { useEffect, useRef, useState } from 'react';
import {
  X, Sparkles, Key, Play, Pause, Wand2, User, Sword, Stars,
  CheckCircle2, AlertCircle, ChevronDown, Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Illustration, VoicePost } from '../types';

interface AiCharacterModalProps {
  onClose: () => void;
  onSuccess: (illustration: Illustration, voicePost: VoicePost) => void;
}

type Step = 'input' | 'key' | 'generating' | 'done' | 'error';
type CharStyle = 'anime' | 'fantasy' | 'manga';
type VoiceGender = 'auto' | 'female' | 'male';

const STORAGE_KEY = 'voist_openai_key';

const STYLE_OPTIONS: { value: CharStyle; label: string; desc: string; icon: typeof Wand2 }[] = [
  { value: 'anime',   label: 'アニメ',    desc: '鮮やかなアニメスタイル',   icon: Stars },
  { value: 'fantasy', label: 'ファンタジー', desc: '幻想的なRPGスタイル',   icon: Sword },
  { value: 'manga',   label: 'マンガ',    desc: 'クールなマンガスタイル',   icon: User  },
];

const VOICE_OPTIONS: { value: VoiceGender; label: string; desc: string }[] = [
  { value: 'auto',   label: 'おまかせ',   desc: 'AIが自動選択' },
  { value: 'female', label: '女性声優',   desc: '可憐・明るい・力強い' },
  { value: 'male',   label: '男性声優',   desc: '渋い・爽やか・重厚' },
];

const CONCEPT_SUGGESTIONS = [
  '明るくて元気な魔法少女',
  '孤高の侍、静かな目を持つ',
  '未来都市を漂うサイバーパンクの少年',
  '深海を守る人魚の戦士',
  '図書館に住む謎の魔法使い少女',
  '二刀流の鬼狩り少女',
];

const GEN_STEPS = [
  'キャラクターを描いています…',
  'セリフを考えています…',
  '声を録音しています…',
];

export function AiCharacterModal({ onClose, onSuccess }: AiCharacterModalProps) {
  const [step, setStep]             = useState<Step>(() => localStorage.getItem(STORAGE_KEY) ? 'input' : 'key');
  const [apiKey, setApiKey]         = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [showKey, setShowKey]       = useState(false);
  const [concept, setConcept]       = useState('');
  const [charStyle, setCharStyle]   = useState<CharStyle>('anime');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('auto');
  const [genStep, setGenStep]       = useState(0);
  const [result, setResult]         = useState<{ image: string; script: string; audioUrl: string } | null>(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const genTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (genTimerRef.current) clearInterval(genTimerRef.current);
  }, []);

  const saveKey = () => {
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith('sk-')) { setErrorMsg('APIキーは「sk-」で始まります'); return; }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setErrorMsg('');
    setStep('input');
  };

  const generate = async () => {
    const key = apiKey.trim() || localStorage.getItem(STORAGE_KEY) || '';
    if (!key) { setStep('key'); return; }
    if (!concept.trim()) return;

    setStep('generating');
    setGenStep(0);

    // Cycle through gen step labels while waiting
    let idx = 0;
    genTimerRef.current = setInterval(() => {
      idx = Math.min(idx + 1, GEN_STEPS.length - 1);
      setGenStep(idx);
    }, 4000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('ログインが必要です');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-generate-character`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ concept, style: charStyle, voice_gender: voiceGender, openai_key: key }),
      });

      clearInterval(genTimerRef.current!);
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'NO_API_KEY' || data.code === 'INVALID_API_KEY') {
          localStorage.removeItem(STORAGE_KEY);
          setApiKey('');
          setStep('key');
          setErrorMsg(data.error);
          return;
        }
        throw new Error(data.error || '生成に失敗しました');
      }

      setResult({
        image:    data.illustration.image_url,
        script:   data.script,
        audioUrl: data.voice_post.audio_url,
      });
      setStep('done');
      onSuccess(data.illustration as Illustration, data.voice_post as VoicePost);
    } catch (err: unknown) {
      clearInterval(genTimerRef.current!);
      setErrorMsg(err instanceof Error ? err.message : '生成に失敗しました');
      setStep('error');
    }
  };

  const togglePlay = () => {
    if (!result?.audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(result.audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={step !== 'generating' ? onClose : undefined} />
      <div className="relative w-full sm:max-w-md bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-[#111] z-10 flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wand2 size={18} className="text-amber-400" />
            <h2 className="text-white font-semibold">AIキャラクターを作る</h2>
          </div>
          {step !== 'generating' && (
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-6">

          {/* ── STEP: API KEY ── */}
          {step === 'key' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-400/8 border border-amber-400/20 rounded-xl">
                <Key size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-amber-200/70 text-sm leading-relaxed">
                  DALL-E 3・GPT-4o・TTSを使用します。<br />
                  <span className="text-white/40 text-xs">キーはこのデバイスのみに保存されます。</span>
                </p>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">OpenAI API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setErrorMsg(''); }}
                    placeholder="sk-..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 font-mono text-sm transition-all"
                  />
                  <button type="button" onClick={() => setShowKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs transition-colors">
                    {showKey ? '隠す' : '表示'}
                  </button>
                </div>
                {errorMsg && <p className="text-red-400 text-xs mt-2">{errorMsg}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all">キャンセル</button>
                <button
                  onClick={saveKey}
                  disabled={!apiKey.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
                >保存して続ける</button>
              </div>
            </div>
          )}

          {/* ── STEP: INPUT ── */}
          {step === 'input' && (
            <div className="space-y-5">
              {/* Concept */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium tracking-wide uppercase">キャラクターのイメージ</label>
                <textarea
                  value={concept}
                  onChange={e => setConcept(e.target.value)}
                  placeholder="どんなキャラクターを作りますか？"
                  rows={3}
                  maxLength={200}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 resize-none text-sm transition-all"
                />
                {/* Suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CONCEPT_SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setConcept(s)}
                      className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-amber-400 hover:border-amber-400/40 text-xs transition-all"
                    >{s}</button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium tracking-wide uppercase">イラストスタイル</label>
                <div className="grid grid-cols-3 gap-2">
                  {STYLE_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setCharStyle(value)}
                      className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all ${
                        charStyle === value
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-white/10 bg-white/3 hover:border-white/30'
                      }`}
                    >
                      <Icon size={18} className={charStyle === value ? 'text-amber-400' : 'text-white/50'} />
                      <div className="text-center">
                        <p className={`text-xs font-semibold ${charStyle === value ? 'text-amber-400' : 'text-white'}`}>{label}</p>
                        <p className="text-white/30 text-[10px] mt-0.5 leading-tight">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium tracking-wide uppercase">声のタイプ</label>
                <div className="grid grid-cols-3 gap-2">
                  {VOICE_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      onClick={() => setVoiceGender(value)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                        voiceGender === value
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-white/10 bg-white/3 hover:border-white/30'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${voiceGender === value ? 'text-amber-400' : 'text-white'}`}>{label}</p>
                      <p className="text-white/30 text-[10px] leading-tight text-center">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* API key change */}
              <button
                onClick={() => { setStep('key'); setErrorMsg(''); }}
                className="flex items-center gap-1.5 text-white/30 hover:text-white/50 text-xs transition-colors"
              >
                <Key size={11} />APIキーを変更
                <ChevronDown size={11} className="-rotate-90" />
              </button>

              <button
                onClick={generate}
                disabled={!concept.trim()}
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-bold transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-amber-400/20 active:scale-98"
              >
                <Wand2 size={18} />
                AIで生成する
              </button>
            </div>
          )}

          {/* ── STEP: GENERATING ── */}
          {step === 'generating' && (
            <div className="flex flex-col items-center gap-6 py-10">
              {/* Animated ring */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-amber-400/10 flex items-center justify-center">
                  <Wand2 size={34} className="text-amber-400" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-amber-400/20 border-t-amber-400 animate-spin" style={{ animationDuration: '1.2s' }} />
                <div className="absolute inset-2 rounded-full border border-amber-400/10 border-b-amber-400/40 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
              </div>

              {/* Steps */}
              <div className="w-full space-y-2">
                {GEN_STEPS.map((label, i) => (
                  <div key={i} className={`flex items-center gap-3 py-2.5 px-4 rounded-xl transition-all ${
                    i === genStep ? 'bg-amber-400/10 border border-amber-400/30' :
                    i < genStep ? 'opacity-40' : 'opacity-20'
                  }`}>
                    {i < genStep ? (
                      <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0" />
                    ) : i === genStep ? (
                      <Loader2 size={16} className="text-amber-400 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${i === genStep ? 'text-white font-medium' : 'text-white/50'}`}>{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-xs">最大30秒ほどかかります</p>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 size={18} />
                <span className="font-semibold text-sm">キャラクターが生まれました！</span>
              </div>

              {/* Generated illustration */}
              <div className="relative rounded-xl overflow-hidden aspect-square w-full">
                <img src={result.image} alt="Generated character" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {/* Audio player overlay */}
                  <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-xl px-4 py-3 border border-white/10">
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center text-black flex-shrink-0 transition-colors shadow-lg"
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">AI声優の声</p>
                      <p className="text-white/40 text-xs truncate">「{result.script.slice(0, 28)}…」</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Script */}
              <div className="bg-white/4 border border-white/10 rounded-xl p-4">
                <p className="text-white/40 text-xs mb-1.5 font-medium uppercase tracking-wide">生成されたセリフ</p>
                <p className="text-white text-sm leading-relaxed">「{result.script}」</p>
              </div>

              <p className="text-white/30 text-xs text-center">フィードに追加されました</p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('input'); setResult(null); audioRef.current?.pause(); setIsPlaying(false); }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all"
                >もう一体作る</button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm transition-colors"
                >閉じる</button>
              </div>
            </div>
          )}

          {/* ── STEP: ERROR ── */}
          {step === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-400 font-medium text-sm">生成に失敗しました</p>
                  <p className="text-red-300/60 text-xs mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-all">閉じる</button>
                <button
                  onClick={() => { setStep('input'); setErrorMsg(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm transition-colors"
                >再試行</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
