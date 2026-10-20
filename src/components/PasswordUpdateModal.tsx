import { useState } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PasswordUpdateModalProps {
  onClose: () => void;
}

export function PasswordUpdateModal({ onClose }: PasswordUpdateModalProps) {
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [done, setDone]                 = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('パスワードが一致しません'); return; }
    setError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(onClose, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました';
      if (msg.includes('Password should be')) setError('パスワードは6文字以上で入力してください');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-8">
          <div className="mb-8 text-center">
            <span className="text-3xl font-bold tracking-tight text-white">
              vo<span className="text-amber-400">i</span>st
            </span>
            <p className="text-white/40 text-sm mt-1.5">新しいパスワードを設定</p>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-amber-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-white font-medium">パスワードを変更しました</p>
                <p className="text-white/40 text-sm">新しいパスワードでログインできます</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">新しいパスワード</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">パスワードの確認</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? '更新中...' : 'パスワードを変更する'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
