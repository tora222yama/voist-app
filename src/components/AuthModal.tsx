import { useState } from 'react';
import { X, Eye, EyeOff, Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  onClose: () => void;
}

type Mode = 'signin' | 'signup' | 'forgot';

export function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode]               = useState<Mode>('signin');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [username, setUsername]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [resetSent, setResetSent]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: username } },
        });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'エラーが発生しました';
      if (msg.includes('User already registered'))        setError('このメールアドレスはすでに登録されています');
      else if (msg.includes('Invalid login credentials')) setError('メールアドレスまたはパスワードが正しくありません');
      else if (msg.includes('Password should be'))        setError('パスワードは6文字以上で入力してください');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => { setMode(next); setError(''); setResetSent(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10">
          <X size={18} />
        </button>

        <div className="p-8">
          <div className="mb-8 text-center">
            <span className="text-3xl font-bold tracking-tight text-white">
              vo<span className="text-amber-400">i</span>st
            </span>
            <p className="text-white/40 text-sm mt-1.5">
              {mode === 'signin' ? 'おかえりなさい' : mode === 'signup' ? 'イラストと声の世界へ' : 'パスワードのリセット'}
            </p>
          </div>

          {/* ── Forgot password ── */}
          {mode === 'forgot' && (
            resetSent ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-amber-400" />
                </div>
                <div className="text-center space-y-1.5">
                  <p className="text-white font-medium">メールを送信しました</p>
                  <p className="text-white/40 text-sm leading-relaxed">
                    <span className="text-white/60">{email}</span> にパスワードリセット用のURLを送りました。メールを確認してください。
                  </p>
                </div>
                <button
                  onClick={() => switchMode('signin')}
                  className="mt-2 text-amber-400 hover:text-amber-300 transition-colors text-sm font-medium"
                >
                  ログイン画面に戻る
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-white/50 text-sm leading-relaxed">
                  登録済みのメールアドレスを入力してください。パスワードリセット用のURLをお送りします。
                </p>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">メールアドレス</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? '送信中...' : 'リセットURLを送る'}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="w-full flex items-center justify-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm"
                >
                  <ArrowLeft size={14} />
                  ログインに戻る
                </button>
              </form>
            )
          )}

          {/* ── Sign in / Sign up ── */}
          {mode !== 'forgot' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">ユーザーネーム</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="your_username"
                    required
                    minLength={3}
                    maxLength={28}
                    pattern="[a-zA-Z0-9_]+"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium tracking-wide uppercase">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-white/50 font-medium tracking-wide uppercase">パスワード</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs text-white/40 hover:text-amber-400 transition-colors"
                    >
                      パスワードを忘れた場合
                    </button>
                  )}
                </div>
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
                {loading ? '処理中...' : mode === 'signin' ? 'ログイン' : '登録する'}
              </button>
            </form>
          )}

          {mode !== 'forgot' && (
            <p className="text-center text-white/40 text-sm mt-6">
              {mode === 'signin' ? 'アカウントをお持ちでない方は ' : 'すでにアカウントをお持ちの方は '}
              <button onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} className="text-amber-400 hover:text-amber-300 transition-colors font-medium">
                {mode === 'signin' ? '新規登録' : 'ログイン'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
