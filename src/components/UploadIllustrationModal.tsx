import { useRef, useState } from 'react';
import { X, Upload, Image, Tag, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UploadIllustrationModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadIllustrationModal({ onClose, onSuccess }: UploadIllustrationModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('画像ファイルを選択してください'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('ファイルサイズは20MB以下にしてください'); return; }
    setImageFile(file);
    setError('');
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9\u3040-\u9fff_]/g, '');
    if (!t || tags.includes(t) || tags.length >= 10) return;
    setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !imageFile) return;
    setError('');
    setUploading(true);
    setProgress(10);

    try {
      const ext = imageFile.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}.${ext}`;

      setProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('illustrations')
        .upload(path, imageFile, { contentType: imageFile.type });

      if (uploadError) throw uploadError;
      setProgress(60);

      const { data: { publicUrl } } = supabase.storage
        .from('illustrations')
        .getPublicUrl(path);

      setProgress(80);
      const { error: insertError } = await supabase.from('illustrations').insert({
        title: title.trim(),
        description: description.trim() || null,
        image_url: publicUrl,
        tags,
      });

      if (insertError) throw insertError;
      setProgress(100);
      setTimeout(() => { onSuccess(); onClose(); }, 300);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#111] border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#111] z-10 flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">イラストを投稿</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image drop zone */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${
              preview ? 'border-transparent p-0' : 'border-white/20 hover:border-amber-400/50 bg-white/3 p-6'
            }`}
          >
            {preview ? (
              <div className="relative w-full h-full">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-sm font-medium">画像を変更</span>
                </div>
              </div>
            ) : (
              <>
                <Image size={36} className="text-white/30 mb-3" />
                <span className="text-white/50 text-sm font-medium">クリックして画像を選択</span>
                <span className="text-white/30 text-xs mt-1">PNG, JPG, GIF, WebP (最大20MB)</span>
              </>
            )}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">タイトル *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="イラストのタイトル"
              required
              maxLength={100}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">説明</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="作品について説明してください（任意）"
              maxLength={500}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">タグ (最大10個)</label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
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
              <button
                type="button"
                onClick={addTag}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-amber-400 hover:border-amber-400/50 transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-sm hover:bg-amber-400/20 transition-colors"
                  >
                    #{tag}
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {uploading && progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/40">
                <span>アップロード中...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
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
              disabled={!imageFile || !title.trim() || uploading}
              className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 size={18} className="animate-spin" /> 投稿中...</>
              ) : (
                <><Upload size={18} /> 投稿する</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
