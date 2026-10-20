import { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Upload, Play, Pause, Square, FileAudio, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Illustration } from '../types';

interface VoiceRecordModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedIllustration?: { id: string; title: string; image_url: string };
}

type RecordState = 'idle' | 'recording' | 'recorded' | 'uploading';

export function VoiceRecordModal({ onClose, onSuccess, preselectedIllustration }: VoiceRecordModalProps) {
  const { user } = useAuth();
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [selectedIllId, setSelectedIllId] = useState<string>(preselectedIllustration?.id ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState('');
  const [showIllSelect, setShowIllSelect] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number>(0);
  const recordingTimeRef = useRef<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselectedIllustration) return; // no need to fetch if pre-selected
    supabase
      .from('illustrations')
      .select('id, title, image_url, user_id, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setIllustrations(data as Illustration[]);
      });
  }, [preselectedIllustration]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewAudioRef.current?.pause();
    };
  }, [previewUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Pick best supported format (Safari needs mp4, others prefer webm)
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const mimeUsed = mr.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeUsed });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        const dur = recordingTimeRef.current;
        setAudioDuration(dur > 0 ? dur : null);
        setRecordState('recorded');
        clearInterval(timerRef.current);
      };
      mr.start(100);
      setRecordState('recording');
      setRecordingTime(0);
      recordingTimeRef.current = 0;
      timerRef.current = window.setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch {
      setError('マイクへのアクセスを許可してください');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { setError('音声ファイルを選択してください'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('ファイルサイズは50MB以下にしてください'); return; }
    setAudioFile(file);
    setAudioBlob(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setRecordState('recorded');
    setError('');
  };

  const togglePreview = () => {
    if (!previewUrl) return;
    if (!previewAudioRef.current) {
      const audio = new Audio(previewUrl);
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setAudioDuration(audio.duration);
        }
      };
      audio.onended = () => setIsPlayingPreview(false);
      previewAudioRef.current = audio;
    }
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().then(() => setIsPlayingPreview(true)).catch(() => {});
    }
  };

  const resetAudio = () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setAudioBlob(null);
    setAudioFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsPlayingPreview(false);
    setRecordState('idle');
    setRecordingTime(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedIllId || (!audioBlob && !audioFile)) return;
    setError('');
    setRecordState('uploading');

    try {
      const source = audioBlob || audioFile!;
      const getExtFromMime = (mime: string) => {
        if (mime.includes('mp4')) return 'mp4';
        if (mime.includes('ogg')) return 'ogg';
        return 'webm';
      };
      const ext = audioBlob ? getExtFromMime(audioBlob.type) : (audioFile!.name.split('.').pop() || 'mp3');
      const path = `${user.id}/${Date.now()}.${ext}`;
      const contentType = audioBlob ? audioBlob.type : (audioFile!.type || 'audio/mpeg');

      const { error: uploadError } = await supabase.storage
        .from('audio')
        .upload(path, source, { contentType });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(path);

      const { error: insertError } = await supabase.from('voice_posts').insert({
        illustration_id: selectedIllId,
        title: title.trim() || null,
        description: description.trim() || null,
        audio_url: publicUrl,
        duration: (audioDuration != null && Number.isFinite(audioDuration)) ? audioDuration : null,
      });

      if (insertError) throw insertError;
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
      setRecordState('recorded');
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const selectedIll = illustrations.find(i => i.id === selectedIllId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#111] z-10 flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">声を届ける</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Illustration selector */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">
              声をつけるイラスト *
            </label>
            {preselectedIllustration ? (
              /* Read-only: illustration is pre-selected from feed */
              <div className="w-full bg-white/5 border border-amber-400/30 rounded-xl px-4 py-3 flex items-center gap-3">
                <img src={preselectedIllustration.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{preselectedIllustration.title}</p>
                  <p className="text-amber-400/60 text-xs mt-0.5">このイラストに声を届ける</p>
                </div>
              </div>
            ) : (
              /* Dropdown: user picks illustration */
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowIllSelect(!showIllSelect)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left flex items-center justify-between hover:border-amber-400/50 transition-all"
                >
                  {selectedIll ? (
                    <div className="flex items-center gap-3">
                      <img src={selectedIll.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="text-white text-sm font-medium">{selectedIll.title}</p>
                        <p className="text-white/40 text-xs">@{(selectedIll as unknown as { profiles?: { username: string } }).profiles?.username}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-white/30">イラストを選択してください</span>
                  )}
                  <ChevronDown size={16} className={`text-white/40 transition-transform ${showIllSelect ? 'rotate-180' : ''}`} />
                </button>
                {showIllSelect && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden z-20 max-h-60 overflow-y-auto shadow-2xl">
                    {illustrations.length === 0 ? (
                      <p className="text-white/40 text-sm p-4 text-center">イラストがありません</p>
                    ) : (
                      illustrations.map(ill => (
                        <button
                          key={ill.id}
                          type="button"
                          onClick={() => { setSelectedIllId(ill.id); setShowIllSelect(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${selectedIllId === ill.id ? 'bg-amber-400/10' : ''}`}
                        >
                          <img src={ill.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          <div>
                            <p className="text-white text-sm font-medium">{ill.title}</p>
                            <p className="text-white/40 text-xs">@{(ill as unknown as { profiles?: { username: string } }).profiles?.username}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recording area */}
          <div className="bg-white/3 border border-white/10 rounded-xl p-5">
            {recordState === 'idle' && (
              <div className="flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-amber-400/20"
                >
                  <Mic size={32} className="text-black" />
                </button>
                <p className="text-white/50 text-sm">タップして録音開始</p>
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/30 text-xs">または</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-white/50 hover:text-amber-400 transition-colors text-sm"
                >
                  <FileAudio size={16} />
                  音声ファイルをアップロード
                </button>
                <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />
              </div>
            )}

            {recordState === 'recording' && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="relative w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 flex items-center justify-center transition-all"
                  >
                    <Square size={24} className="text-white" fill="white" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-red-400">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-mono text-lg font-semibold">{formatTime(recordingTime)}</span>
                </div>
                <p className="text-white/50 text-sm">録音中... タップして停止</p>
              </div>
            )}

            {(recordState === 'recorded' || recordState === 'uploading') && previewUrl && (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={togglePreview}
                    className="w-14 h-14 rounded-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center transition-all"
                  >
                    {isPlayingPreview ? <Pause size={22} className="text-black" /> : <Play size={22} className="text-black ml-0.5" />}
                  </button>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {audioFile ? audioFile.name : '録音データ'}
                    </p>
                    {audioDuration != null && Number.isFinite(audioDuration) && audioDuration > 0 && (
                      <p className="text-white/40 text-xs">{formatTime(Math.floor(audioDuration))}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetAudio}
                  disabled={recordState === 'uploading'}
                  className="text-white/40 hover:text-white/70 text-sm transition-colors disabled:opacity-30"
                >
                  やり直す
                </button>
              </div>
            )}
          </div>

          {/* Title and description */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="声のタイトル（任意）"
              maxLength={100}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">説明</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="この声への思いや演技について（任意）"
              maxLength={300}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!selectedIllId || (!audioBlob && !audioFile) || recordState === 'uploading' || recordState === 'recording'}
              className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {recordState === 'uploading' ? (
                <><Loader2 size={18} className="animate-spin" /> 投稿中...</>
              ) : (
                <><MicOff size={18} /> 声を投稿</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
