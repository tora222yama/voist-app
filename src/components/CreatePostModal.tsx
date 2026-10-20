import { useEffect, useRef, useState } from 'react';
import {
  X, Image, Mic, Square, Play, Pause, FileAudio,
  Tag, Plus, Upload, Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CreatePostModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type RecordState = 'idle' | 'recording' | 'recorded' | 'uploading';
type SubmitState = 'idle' | 'uploading_image' | 'saving_ill' | 'uploading_audio' | 'saving_voice' | 'done';

export function CreatePostModal({ onClose, onSuccess }: CreatePostModalProps) {
  const { user } = useAuth();

  // Illustration fields
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput]       = useState('');
  const [tags, setTags]               = useState<string[]>([]);

  // Voice fields
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [audioBlob, setAudioBlob]     = useState<Blob | null>(null);
  const [audioFile, setAudioFile]     = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Submit
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [error, setError]             = useState('');

  const imageInputRef  = useRef<HTMLInputElement>(null);
  const audioInputRef  = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const timerRef       = useRef<number>(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      previewAudioRef.current?.pause();
    };
  }, [audioPreviewUrl]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('画像ファイルを選択してください'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('ファイルサイズは20MB以下にしてください'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9\u3040-\u9fff_]/g, '');
    if (!t || tags.includes(t) || tags.length >= 10) return;
    setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        setRecordState('recorded');
        clearInterval(timerRef.current);
      };
      mr.start(100);
      setRecordState('recording');
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      setError('マイクへのアクセスを許可してください');
    }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { setError('音声ファイルを選択してください'); return; }
    if (file.size > 50 * 1024 * 1024) { setError('ファイルサイズは50MB以下にしてください'); return; }
    setAudioFile(file);
    setAudioBlob(null);
    setAudioPreviewUrl(URL.createObjectURL(file));
    setRecordState('recorded');
    setError('');
  };

  const toggleAudioPreview = () => {
    if (!audioPreviewUrl) return;
    if (!previewAudioRef.current) {
      const a = new Audio(audioPreviewUrl);
      a.onloadedmetadata = () => setAudioDuration(a.duration);
      a.onended = () => setIsPlayingPreview(false);
      previewAudioRef.current = a;
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
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    setIsPlayingPreview(false);
    setRecordState('idle');
    setRecordingTime(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const extractErrorMessage = (err: unknown): string => {
    if (!err) return '投稿に失敗しました';
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return String(err);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !imageFile || !title.trim()) return;
    setError('');

    try {
      // ── 1. Upload illustration image ──
      setSubmitState('uploading_image');
      const ext = (imageFile.name.split('.').pop() || 'jpg').toLowerCase();
      const imgPath = `${user.id}/${Date.now()}.${ext}`;
      const { error: imgErr } = await supabase.storage
        .from('illustrations')
        .upload(imgPath, imageFile, { contentType: imageFile.type || 'image/jpeg', upsert: false });
      if (imgErr) throw new Error(`画像アップロード失敗: ${extractErrorMessage(imgErr)}`);
      const { data: { publicUrl: imageUrl } } = supabase.storage.from('illustrations').getPublicUrl(imgPath);

      // ── 2. Insert illustration ──
      setSubmitState('saving_ill');
      const { data: ill, error: illErr } = await supabase
        .from('illustrations')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          image_url: imageUrl,
          tags,
        })
        .select()
        .single();
      if (illErr) throw new Error(`イラスト保存失敗: ${extractErrorMessage(illErr)}`);

      // ── 3. Upload voice (optional) ──
      if (audioBlob || audioFile) {
        setSubmitState('uploading_audio');
        const source = audioBlob ?? audioFile!;
        const audioExt = audioBlob ? 'webm' : (audioFile!.name.split('.').pop() || 'mp3');
        const audioPath = `${user.id}/${Date.now()}.${audioExt}`;
        const contentType = audioBlob ? 'audio/webm' : (audioFile!.type || 'audio/mpeg');
        const { error: audioErr } = await supabase.storage
          .from('audio')
          .upload(audioPath, source, { contentType, upsert: false });
        if (audioErr) throw new Error(`音声アップロード失敗: ${extractErrorMessage(audioErr)}`);
        const { data: { publicUrl: audioUrl } } = supabase.storage.from('audio').getPublicUrl(audioPath);

        setSubmitState('saving_voice');
        const { error: vpErr } = await supabase.from('voice_posts').insert({
          illustration_id: ill.id,
          user_id: user.id,
          audio_url: audioUrl,
          duration: audioDuration ?? null,
        });
        if (vpErr) throw new Error(`声の保存失敗: ${extractErrorMessage(vpErr)}`);
      }

      setSubmitState('done');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
      setSubmitState('idle');
    }
  };

  const isUploading = submitState !== 'idle' && submitState !== 'done';
  const submitLabel: Record<SubmitState, string> = {
    idle:           '投稿する',
    uploading_image: '画像をアップロード中...',
    saving_ill:     'イラストを保存中...',
    uploading_audio: '音声をアップロード中...',
    saving_voice:   '声を保存中...',
    done:           '完了',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={!isUploading ? onClose : undefined} />
      <div className="relative w-full sm:max-w-lg bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-[#111] z-10 flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">投稿する</h2>
          {!isUploading && (
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ══ ILLUSTRATION SECTION ══ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image size={16} className="text-amber-400" />
              <span className="text-white font-semibold text-sm">イラスト</span>
              <span className="text-amber-400/60 text-xs">必須</span>
            </div>

            {/* Image drop zone */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className={`w-full rounded-xl border-2 border-dashed transition-all overflow-hidden ${
                imagePreview ? 'border-transparent aspect-video p-0' : 'border-white/15 hover:border-amber-400/40 bg-white/3 aspect-video flex flex-col items-center justify-center gap-3'
              }`}
            >
              {imagePreview ? (
                <div className="relative w-full h-full group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium">タップして変更</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
                    <Image size={26} className="text-white/30" />
                  </div>
                  <div className="text-center">
                    <p className="text-white/50 text-sm font-medium">タップして画像を選択</p>
                    <p className="text-white/30 text-xs mt-0.5">PNG, JPG, WebP（最大 20MB）</p>
                  </div>
                </>
              )}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="作品タイトル"
                required
                maxLength={100}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">説明（任意）</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="作品について…"
                maxLength={500}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">タグ（任意・最大10個）</label>
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="タグを入力してEnter"
                    maxLength={30}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all text-sm"
                  />
                </div>
                <button type="button" onClick={addTag} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-amber-400 hover:border-amber-400/40 transition-all flex-shrink-0">
                  <Plus size={15} />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button key={tag} type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs hover:bg-amber-400/20 transition-colors">
                      #{tag}<X size={10} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-white/20 text-xs font-medium">＋</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* ══ VOICE SECTION ══ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mic size={16} className="text-amber-400" />
              <span className="text-white font-semibold text-sm">声</span>
              <span className="text-white/30 text-xs">任意</span>
            </div>

            <div className="bg-white/3 border border-white/10 rounded-xl p-5">
              {recordState === 'idle' && (
                <div className="flex flex-col items-center gap-4">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 flex items-center justify-center transition-all shadow-lg shadow-amber-400/20"
                  >
                    <Mic size={26} className="text-black" />
                  </button>
                  <p className="text-white/50 text-sm">タップして録音</p>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/25 text-xs">または</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>
                  <button type="button" onClick={() => audioInputRef.current?.click()} className="flex items-center gap-2 text-white/40 hover:text-amber-400 transition-colors text-sm">
                    <FileAudio size={15} />音声ファイルをアップロード
                  </button>
                  <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioFileSelect} className="hidden" />
                </div>
              )}

              {recordState === 'recording' && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                    <button type="button" onClick={stopRecording} className="relative w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 flex items-center justify-center transition-all">
                      <Square size={20} className="text-white" fill="white" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-red-400">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-mono text-lg font-semibold">{formatTime(recordingTime)}</span>
                  </div>
                  <p className="text-white/40 text-sm">録音中 — タップして停止</p>
                </div>
              )}

              {recordState === 'recorded' && audioPreviewUrl && (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-4">
                    <button type="button" onClick={toggleAudioPreview}
                      className="w-12 h-12 rounded-full bg-amber-400 hover:bg-amber-300 flex items-center justify-center transition-all">
                      {isPlayingPreview ? <Pause size={18} className="text-black" /> : <Play size={18} className="text-black ml-0.5" />}
                    </button>
                    <div>
                      <p className="text-white text-sm font-medium">{audioFile ? audioFile.name : '録音データ'}</p>
                      {audioDuration && <p className="text-white/40 text-xs">{formatTime(Math.floor(audioDuration))}</p>}
                    </div>
                  </div>
                  <button type="button" onClick={resetAudio} className="text-white/30 hover:text-white/60 text-xs transition-colors">
                    やり直す
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-40 transition-all font-medium"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!imageFile || !title.trim() || isUploading || recordState === 'recording'}
              className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-400/15"
            >
              {isUploading
                ? <><Loader2 size={16} className="animate-spin" />{submitLabel[submitState]}</>
                : <><Upload size={16} />{submitLabel.idle}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
