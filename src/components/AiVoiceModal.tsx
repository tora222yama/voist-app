import { useEffect, useRef, useState } from 'react';
import { X, Sparkles, Key, Play, Pause, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Illustration, VoicePost } from '../types';

interface AiVoiceModalProps {
  illustration: Illustration;
  onClose: () => void;
  onSuccess: (voicePost: VoicePost) => void;
}

type Step = 'key' | 'options' | 'generating' | 'done' | 'error';
type VoiceGender = 'auto' | 'female' | 'male';

const STORAGE_KEY = 'voist_openai_key';

const VOICE_LABELS: Record<VoiceGender, { label: string; desc: string }> = {
  auto:   { label: 'おまかせ',   desc: 'イラストに合わせて自動選択' },
  female: { label: '女性声優風', desc: '華やか・可憐・力強い' },
  male:   { label: '男性声優風', desc: '渋い・爽やか・重厚' },
};

export function AiVoiceModal({ illustration, onClose, onSuccess }: AiVoiceModalProps) {
  const [step, setStep] = useState<Step>('options');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [showKey, setShowKey] = useState(false);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('auto');
  const [generatingLabel, setGeneratingLabel] = useState('');
  const [script, setScript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // If no key stored yet, start on key entry step
  useEffect(() => {
    if (!apiKey) setStep('key');
  }, []);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const saveKey = () => {
    const trimmed = apiKey.trim();
    if (!trimmed.startsWith('sk-')) { setErrorMsg('APIキーは「sk-」で始まる形式です'); return; }
    localStorage.setItem(STORAGE_KEY, trimmed);
    setErrorMsg('');
    setStep('options');
  };

  const generate = async () => {
    const key = apiKey.trim() || localStorage.getItem(STORAGE_KEY) || '';
    if (!key) { setStep('key'); return; }

    setStep('generating');
    setGeneratingLabel('イラストを解析中...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('ログインが必要です');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-voice-post`;

      // Brief delay to show the first label before network kicks in
      await new Promise(r => setTimeout(r, 600));
      setGeneratingLabel('セリフを生成中...');

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          Apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          illustration_id: illustration.id,
          openai_key: key,
          voice_gender: voiceGender,
        }),
      });

      setGeneratingLabel('音声を合成中...');
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'NO_API_KEY' || data.error?.includes('APIキー')) {
          localStorage.removeItem(STORAGE_KEY);
          setStep('key');
          setErrorMsg(data.error);
          return;
        }
        if (data.error?.includes('invalid_api_key') || data.error?.includes('Incorrect API key')) {
          localStorage.removeItem(STORAGE_KEY);
          setStep('key');
          setErrorMsg('APIキーが無効です。正しいキーを入力してください。');
          return;
        }
        throw new Error(data.error || '生成に失敗しました');
      }

      setScript(data.script);
      setAudioUrl(data.voice_post.audio_url);
      setStep('done');
      onSuccess(data.voice_post as VoicePost);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : '生成に失敗しました');
      setStep('error');
    }
  };

  const togglePlay = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <h2 className="text-white font-semibold">AI声優で声をつける</h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Illustration mini preview */}
        <div className="flex items-center gap-3 px-6 py-3 bg-white/3 border-b border-white/8">
          <img src={illustration.image_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{illustration.title}</p>
            <p className="text-white/40 text-xs truncate">{illustration.description || 'イラスト'}</p>
          </div>
        </div>

        <div className="p-6">
          {/* ── STEP: KEY ENTRY ── */}
          {step === 'key' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-400/8 border border-amber-400/20 rounded-xl">
                <Key size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-amber-200/80 text-sm leading-relaxed">
                  AI声優機能はOpenAI APIを使用します。<br />
                  <span className="text-white/50 text-xs">キーはこのデバイスにのみ保存されます。</span>
                </p>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">
                  OpenAI API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setErrorMsg(''); }}
                    placeholder="sk-..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-xs"
                  >
                    {showKey ? '隠す' : '表示'}
                  </button>
                </div>
                {errorMsg && <p className="text-red-400 text-xs mt-2">{errorMsg}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white transition-all text-sm">
                  キャンセル
                </button>
                <button
                  onClick={saveKey}
                  disabled={!apiKey.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-semibold transition-colors text-sm"
                >
                  保存して続ける
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: OPTIONS ── */}
          {step === 'options' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium tracking-wide uppercase">
                  声のタイプ
                </label>
                <div className="space-y-2">
                  {(Object.entries(VOICE_LABELS) as [VoiceGender, { label: string; desc: string }][]).map(([val, { label, desc }]) => (
                    <button
                      key={val}
                      onClick={() => setVoiceGender(val)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                        voiceGender === val
                          ? 'border-amber-400 bg-amber-400/10'
                          : 'border-white/10 bg-white/3 hover:border-white/30'
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-medium ${voiceGender === val ? 'text-amber-400' : 'text-white'}`}>{label}</p>
                        <p className="text-white/40 text-xs mt-0.5">{desc}</p>
                      </div>
                      {voiceGender === val && (
                        <div className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* API key hint */}
              <button
                onClick={() => { setStep('key'); setErrorMsg(''); }}
                className="flex items-center gap-2 text-white/30 hover:text-white/50 text-xs transition-colors"
              >
                <Key size={11} />
                APIキーを変更
                <ChevronDown size={11} className="-rotate-90" />
              </button>

              <button
                onClick={generate}
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-98 text-black font-bold transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-amber-400/20"
              >
                <Sparkles size={18} />
                AI声優で生成する
              </button>
            </div>
          )}

          {/* ── STEP: GENERATING ── */}
          {step === 'generating' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-amber-400/10 flex items-center justify-center">
                  <Sparkles size={32} className="text-amber-400 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-semibold">{generatingLabel}</p>
                <p className="text-white/40 text-sm">しばらくお待ちください</p>
              </div>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <CheckCircle2 size={18} />
                <span className="font-semibold text-sm">声の生成が完了しました！</span>
              </div>

              {script && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-white/40 text-xs mb-2 font-medium tracking-wide uppercase">生成されたセリフ</p>
                  <p className="text-white text-sm leading-relaxed">「{script}」</p>
                </div>
              )}

              {audioUrl && (
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center text-black flex-shrink-0 transition-colors"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>
                  <div>
                    <p className="text-white text-sm font-medium">AI声優の音声</p>
                    <p className="text-white/40 text-xs">タップして再生</p>
                  </div>
                </div>
              )}

              <p className="text-white/40 text-xs text-center">
                フィードを横にスワイプするとこの声を聴けます
              </p>

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold transition-colors"
              >
                閉じる
              </button>
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
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white transition-all text-sm"
                >
                  閉じる
                </button>
                <button
                  onClick={() => { setStep('options'); setErrorMsg(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold transition-colors text-sm"
                >
                  再試行
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
