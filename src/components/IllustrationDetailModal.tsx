import { useEffect, useState } from 'react';
import { X, Heart, UserCircle2, Mic, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Illustration, VoicePost, Profile } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { VoicePlayer } from './VoicePlayer';

interface IllustrationDetailModalProps {
  illustration: Illustration;
  onClose: () => void;
  onUserProfile: (userId: string) => void;
}

interface VoicePostWithProfile extends VoicePost {
  profiles: Profile | null;
}

export function IllustrationDetailModal({ illustration, onClose, onUserProfile }: IllustrationDetailModalProps) {
  const { user } = useAuth();
  const [voicePosts, setVoicePosts] = useState<VoicePostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedVoices, setLikedVoices] = useState<Set<string>>(new Set());
  const [likedIll, setLikedIll] = useState(false);
  const [playSignal, setPlaySignal] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: voices } = await supabase
        .from('voice_posts')
        .select('*, profiles(*)')
        .eq('illustration_id', illustration.id)
        .order('likes_count', { ascending: false });

      if (voices) {
        setVoicePosts(voices as VoicePostWithProfile[]);
        if (voices.length > 0) {
          setTimeout(() => setPlaySignal(s => s + 1), 300);
        }
      }

      if (user) {
        const { data: likes } = await supabase
          .from('likes')
          .select('illustration_id, voice_post_id')
          .eq('user_id', user.id);
        if (likes) {
          const vLikes = new Set<string>();
          let illLiked = false;
          likes.forEach(l => {
            if (l.voice_post_id) vLikes.add(l.voice_post_id);
            if (l.illustration_id === illustration.id) illLiked = true;
          });
          setLikedVoices(vLikes);
          setLikedIll(illLiked);
        }
      }

      setLoading(false);
    };
    load();
  }, [illustration.id, user]);

  const toggleLikeVoice = async (voicePostId: string) => {
    if (!user) return;
    const isLiked = likedVoices.has(voicePostId);
    const newSet = new Set(likedVoices);
    if (isLiked) {
      newSet.delete(voicePostId);
      setLikedVoices(newSet);
      setVoicePosts(prev => prev.map(vp =>
        vp.id === voicePostId ? { ...vp, likes_count: Math.max(0, vp.likes_count - 1) } : vp
      ));
      await supabase.from('likes').delete().eq('user_id', user.id).eq('voice_post_id', voicePostId);
    } else {
      newSet.add(voicePostId);
      setLikedVoices(newSet);
      setVoicePosts(prev => prev.map(vp =>
        vp.id === voicePostId ? { ...vp, likes_count: vp.likes_count + 1 } : vp
      ));
      await supabase.from('likes').insert({ voice_post_id: voicePostId });
    }
  };

  const toggleLikeIll = async () => {
    if (!user) return;
    if (likedIll) {
      setLikedIll(false);
      await supabase.from('likes').delete().eq('user_id', user.id).eq('illustration_id', illustration.id);
    } else {
      setLikedIll(true);
      await supabase.from('likes').insert({ illustration_id: illustration.id });
    }
  };

  const illustrator = illustration.profiles;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f0f0f] z-10 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-base">イラスト詳細</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Illustration image */}
        <button
          type="button"
          onClick={() => setPlaySignal(s => s + 1)}
          className="block w-full aspect-square relative"
          aria-label="声を再生"
        >
          <img src={illustration.image_url} alt={illustration.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent pointer-events-none" />
        </button>

        {/* Illustrator attribution */}
        <div className="px-5 -mt-8 relative z-10">
          <button
            onClick={() => onUserProfile(illustration.user_id)}
            className="flex items-center gap-3 group"
          >
            {illustrator?.avatar_url ? (
              <img src={illustrator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/50 group-hover:ring-amber-400 transition-all" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-white/10 ring-2 ring-amber-400/50 flex items-center justify-center group-hover:ring-amber-400 transition-all">
                <UserCircle2 size={18} className="text-white/60" />
              </div>
            )}
            <div className="text-left">
              <p className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors">@{illustrator?.username}</p>
              <p className="text-white/40 text-xs">イラストレーター</p>
            </div>
          </button>
        </div>

        {/* Illustration info */}
        <div className="px-5 pt-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-white font-bold text-lg leading-tight flex-1">{illustration.title}</h3>
            <button
              onClick={toggleLikeIll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 transition-all flex-shrink-0 ${likedIll ? 'text-red-500' : 'text-white/60 hover:text-red-400'}`}
            >
              <Heart size={15} fill={likedIll ? 'currentColor' : 'none'} />
              <span className="text-xs font-medium">{illustration.likes_count}</span>
            </button>
          </div>

          {illustration.description && (
            <p className="text-white/60 text-sm leading-relaxed">{illustration.description}</p>
          )}

          {illustration.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {illustration.tags.map(tag => (
                <span key={tag} className="text-amber-400/80 text-xs px-2.5 py-1 bg-amber-400/10 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Voice posts section */}
        <div className="px-5 pt-6 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Mic size={16} className="text-amber-400" />
            <h3 className="text-white font-semibold text-sm">
              このイラストの声 {voicePosts.length > 0 && `(${voicePosts.length})`}
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : voicePosts.length === 0 ? (
            <div className="text-center py-8">
              <Mic size={28} className="text-white/20 mx-auto mb-2" />
              <p className="text-white/30 text-sm">まだ声がついていません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {voicePosts.map((vp, idx) => (
                <div key={vp.id} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                  {/* Voice actor attribution */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onUserProfile(vp.user_id)}
                      className="flex items-center gap-2.5 group min-w-0"
                    >
                      {vp.profiles?.avatar_url ? (
                        <img src={vp.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-amber-400/30 group-hover:ring-amber-400 transition-all" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-amber-400/30 group-hover:ring-amber-400 transition-all">
                          <UserCircle2 size={14} className="text-white/50" />
                        </div>
                      )}
                      <div className="text-left min-w-0">
                        <p className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors truncate">@{vp.profiles?.username}</p>
                        <p className="text-white/40 text-xs">声優</p>
                      </div>
                    </button>

                    <button
                      onClick={() => toggleLikeVoice(vp.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 transition-all flex-shrink-0 ${likedVoices.has(vp.id) ? 'text-red-500' : 'text-white/60 hover:text-red-400'}`}
                    >
                      <Heart size={13} fill={likedVoices.has(vp.id) ? 'currentColor' : 'none'} />
                      <span className="text-xs">{vp.likes_count}</span>
                    </button>
                  </div>

                  {/* Illustrator × Voice actor label */}
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span className="text-sky-400/70">イラスト: @{illustrator?.username}</span>
                    <span className="text-amber-400/60">×</span>
                    <span className="text-purple-400/70">声: @{vp.profiles?.username}</span>
                  </div>

                  {vp.title && (
                    <p className="text-white text-sm font-medium">{vp.title}</p>
                  )}

                  {vp.description && (
                    <p className="text-white/50 text-xs leading-relaxed">{vp.description}</p>
                  )}

                  <VoicePlayer voicePost={vp} compact playSignal={idx === 0 ? playSignal : 0} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
