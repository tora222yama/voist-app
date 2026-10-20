import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Mic, Share2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, UserCircle2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Illustration, VoicePost } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { VoicePlayer } from './VoicePlayer';
import { AiVoiceModal } from './AiVoiceModal';
import { AnimeSceneBg } from './AnimeSceneBg';
import { VoiceRecordModal } from './VoiceRecordModal';
import { IllustrationDetailModal } from './IllustrationDetailModal';

interface FeedItem {
  illustration: Illustration;
  voicePosts: VoicePost[];
}

interface IllustrationFeedProps {
  onAuthRequired: () => void;
  onUserProfile: (userId: string) => void;
  onAiCreate?: () => void;
}

export function IllustrationFeed({ onAuthRequired, onUserProfile, onAiCreate }: IllustrationFeedProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [illIdx, setIllIdx] = useState(0);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [likedIllustrations, setLikedIllustrations] = useState<Set<string>>(new Set());
  const [likedVoicePosts, setLikedVoicePosts] = useState<Set<string>>(new Set());
  const [transitioning, setTransitioning] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [playSignal, setPlaySignal] = useState(0);
  const [slideDir, setSlideDir] = useState<'up' | 'down' | 'left' | 'right' | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastWheelRef = useRef<number>(0);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const { data: illustrations } = await supabase
      .from('illustrations')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!illustrations || illustrations.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ids = illustrations.map(i => i.id);
    const { data: voices } = await supabase
      .from('voice_posts')
      .select('*, profiles(*)')
      .in('illustration_id', ids)
      .order('likes_count', { ascending: false });

    const voiceMap: Record<string, VoicePost[]> = {};
    (voices || []).forEach(v => {
      if (!voiceMap[v.illustration_id]) voiceMap[v.illustration_id] = [];
      voiceMap[v.illustration_id].push(v as VoicePost);
    });

    setItems(illustrations.map(ill => ({
      illustration: ill as Illustration,
      voicePosts: voiceMap[ill.id] || [],
    })));
    setLoading(false);
  }, []);

  const loadLikes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('likes').select('illustration_id, voice_post_id').eq('user_id', user.id);
    if (!data) return;
    const illLikes = new Set<string>();
    const voiceLikes = new Set<string>();
    data.forEach(l => {
      if (l.illustration_id) illLikes.add(l.illustration_id);
      if (l.voice_post_id) voiceLikes.add(l.voice_post_id);
    });
    setLikedIllustrations(illLikes);
    setLikedVoicePosts(voiceLikes);
  }, [user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);
  useEffect(() => { loadLikes(); }, [loadLikes]);
  useEffect(() => { setVoiceIdx(0); }, [illIdx]);

  const navigate = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (transitioning) return;
    const current = items[illIdx];
    if (!current) return;

    if (dir === 'up') {
      if (illIdx >= items.length - 1) return;
      setSlideDir('up');
      setTransitioning(true);
      setTimeout(() => { setIllIdx(i => i + 1); setTransitioning(false); setSlideDir(null); }, 180);
    } else if (dir === 'down') {
      if (illIdx <= 0) return;
      setSlideDir('down');
      setTransitioning(true);
      setTimeout(() => { setIllIdx(i => i - 1); setTransitioning(false); setSlideDir(null); }, 180);
    } else if (dir === 'left') {
      if (voiceIdx >= current.voicePosts.length - 1) return;
      setSlideDir('left');
      setTransitioning(true);
      setTimeout(() => { setVoiceIdx(v => v + 1); setTransitioning(false); setSlideDir(null); }, 180);
    } else if (dir === 'right') {
      if (voiceIdx <= 0) return;
      setSlideDir('right');
      setTransitioning(true);
      setTimeout(() => { setVoiceIdx(v => v - 1); setTransitioning(false); setSlideDir(null); }, 180);
    }
  }, [transitioning, items, illIdx, voiceIdx]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); navigate('down'); }
      if (e.key === 'ArrowDown') { e.preventDefault(); navigate('up'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigate('right'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate('left'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelRef.current < 600) return;
    lastWheelRef.current = now;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      navigate(e.deltaY > 0 ? 'up' : 'down');
    } else {
      navigate(e.deltaX > 0 ? 'left' : 'right');
    }
  }, [navigate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    // Horizontal swipe: just 30px, and not strongly vertical
    if (absDx > 30 && absDy < absDx * 1.5) {
      navigate(dx < 0 ? 'left' : 'right');
    // Vertical swipe: 50px, and clearly more vertical than horizontal
    } else if (absDy > 50 && absDy > absDx * 1.5) {
      navigate(dy < 0 ? 'up' : 'down');
    }
  };

  const toggleLikeIllustration = async (illustrationId: string) => {
    if (!user) { onAuthRequired(); return; }
    const isLiked = likedIllustrations.has(illustrationId);
    const newSet = new Set(likedIllustrations);
    if (isLiked) {
      newSet.delete(illustrationId);
      setLikedIllustrations(newSet);
      setItems(prev => prev.map(item =>
        item.illustration.id === illustrationId
          ? { ...item, illustration: { ...item.illustration, likes_count: Math.max(0, item.illustration.likes_count - 1) } }
          : item
      ));
      await supabase.from('likes').delete().eq('user_id', user.id).eq('illustration_id', illustrationId);
    } else {
      newSet.add(illustrationId);
      setLikedIllustrations(newSet);
      setItems(prev => prev.map(item =>
        item.illustration.id === illustrationId
          ? { ...item, illustration: { ...item.illustration, likes_count: item.illustration.likes_count + 1 } }
          : item
      ));
      await supabase.from('likes').insert({ illustration_id: illustrationId });
    }
  };

  const toggleLikeVoicePost = async (voicePostId: string, illustrationId: string) => {
    if (!user) { onAuthRequired(); return; }
    const isLiked = likedVoicePosts.has(voicePostId);
    const newSet = new Set(likedVoicePosts);
    if (isLiked) {
      newSet.delete(voicePostId);
      setLikedVoicePosts(newSet);
      setItems(prev => prev.map(item =>
        item.illustration.id === illustrationId
          ? {
              ...item,
              voicePosts: item.voicePosts.map(vp =>
                vp.id === voicePostId ? { ...vp, likes_count: Math.max(0, vp.likes_count - 1) } : vp
              ),
            }
          : item
      ));
      await supabase.from('likes').delete().eq('user_id', user.id).eq('voice_post_id', voicePostId);
    } else {
      newSet.add(voicePostId);
      setLikedVoicePosts(newSet);
      setItems(prev => prev.map(item =>
        item.illustration.id === illustrationId
          ? {
              ...item,
              voicePosts: item.voicePosts.map(vp =>
                vp.id === voicePostId ? { ...vp, likes_count: vp.likes_count + 1 } : vp
              ),
            }
          : item
      ));
      await supabase.from('likes').insert({ voice_post_id: voicePostId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-white/40 text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="relative flex items-center justify-center h-full overflow-hidden">
        {/* Anime space background */}
        <AnimeSceneBg scene="space" className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Content overlay */}
        <div className="relative z-10 text-center px-8 flex flex-col items-center">
          {/* Spacer to push text below the astronaut center */}
          <div className="mt-64" />
          <h2 className="text-white font-semibold text-xl mb-3 drop-shadow-lg">
            まだ投稿がありません
          </h2>
          <p className="text-white/60 text-sm leading-relaxed drop-shadow">
            最初のイラストを投稿して<br />voistの世界を始めましょう
          </p>
        </div>
      </div>
    );
  }

  const current = items[illIdx];
  if (!current) return null;

  const { illustration, voicePosts } = current;
  // voiceIdx is 0-based index into voicePosts (no "illustration-only" slot)
  const currentVoice = voicePosts[voiceIdx] ?? null;
  const hasVoices = voicePosts.length > 0;

  const slideTransform = transitioning && slideDir
    ? slideDir === 'up' ? 'translateY(-8px) scale(0.97)' :
      slideDir === 'down' ? 'translateY(8px) scale(0.97)' :
      slideDir === 'left' ? 'translateX(-8px) scale(0.97)' :
      'translateX(8px) scale(0.97)'
    : 'translate(0,0) scale(1)';

  return (
    <div
      className="relative h-full overflow-hidden select-none"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Illustration background */}
      <div
        className="absolute inset-0 transition-all duration-180 ease-out"
        style={{ transform: slideTransform, opacity: transitioning ? 0.7 : 1 }}
      >
        <button
          type="button"
          onClick={() => setPlaySignal(s => s + 1)}
          className="block w-full h-full"
          aria-label="イラスト詳細を表示"
        >
          <img
            src={illustration.image_url}
            alt={illustration.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </button>
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-safe-top pt-4">
        <div className="flex flex-col">
          {hasVoices ? (
            <span className="text-amber-400 text-xs font-medium tracking-wide uppercase mb-0.5">
              声 {voiceIdx + 1} / {voicePosts.length}
            </span>
          ) : (
            <span className="text-white/40 text-xs font-medium tracking-wide uppercase mb-0.5">イラスト</span>
          )}
        </div>
        {/* Voice dots (one per voice post) */}
        {hasVoices && (
          <div className="flex items-center gap-1">
            {voicePosts.map((_, i) => (
              <button
                key={i}
                onClick={() => setVoiceIdx(i)}
                className={`transition-all rounded-full ${
                  i === voiceIdx
                    ? 'w-5 h-1.5 bg-amber-400'
                    : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right action buttons */}
      <div className="absolute right-4 bottom-36 z-20 flex flex-col items-center gap-5">
        <button
          onClick={() => onUserProfile(illustration.user_id)}
          className="flex flex-col items-center gap-1 group"
        >
          {illustration.profiles?.avatar_url ? (
            <img
              src={illustration.profiles.avatar_url}
              alt={illustration.profiles.username}
              className="w-11 h-11 rounded-full ring-2 ring-amber-400 object-cover group-hover:ring-amber-300 transition-all"
            />
          ) : (
            <div className="w-11 h-11 rounded-full ring-2 ring-amber-400 bg-white/10 flex items-center justify-center group-hover:ring-amber-300 transition-all">
              <UserCircle2 size={20} className="text-white/60" />
            </div>
          )}
        </button>

        <button
          onClick={() => toggleLikeIllustration(illustration.id)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all group-active:scale-90 ${likedIllustrations.has(illustration.id) ? 'text-red-500' : 'text-white group-hover:text-red-400'}`}>
            <Heart size={22} fill={likedIllustrations.has(illustration.id) ? 'currentColor' : 'none'} />
          </div>
          <span className="text-white/70 text-xs font-medium">{illustration.likes_count}</span>
        </button>

        <button
          onClick={() => { if (!user) { onAuthRequired(); return; } setShowVoiceModal(true); }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all group-active:scale-90 ${hasVoices ? 'text-amber-400' : 'text-white group-hover:text-amber-400'}`}>
            <Mic size={22} />
          </div>
          <span className="text-white/70 text-xs font-medium">{illustration.voice_count}</span>
        </button>

        <button
          onClick={() => { if (!user) { onAuthRequired(); return; } setShowAiModal(true); }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all group-active:scale-90 text-amber-400/70 group-hover:text-amber-400 group-hover:bg-amber-400/10">
            <Sparkles size={20} />
          </div>
          <span className="text-white/50 text-xs font-medium">AI声</span>
        </button>

        <button className="flex flex-col items-center gap-1 group">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all group-active:scale-90 text-white group-hover:text-amber-400">
            <Share2 size={20} />
          </div>
        </button>
      </div>

      {/* Bottom info */}
      <div
        className="absolute bottom-20 left-0 right-16 z-20 px-5 transition-all duration-300 ease-out"
        style={{
          transform: transitioning && (slideDir === 'left' || slideDir === 'right')
            ? `translateX(${slideDir === 'left' ? '-16px' : '16px'})`
            : 'translateX(0)',
          opacity: transitioning && (slideDir === 'left' || slideDir === 'right') ? 0.4 : 1,
        }}
      >
        {hasVoices && currentVoice ? (
          <div className="space-y-2.5">
            {/* Illustration attribution (compact) */}
            <div className="flex items-center gap-1.5 text-white/40 text-xs">
              <button
                onClick={() => onUserProfile(illustration.user_id)}
                className="flex items-center gap-1.5 hover:text-white/70 transition-colors"
              >
                {illustration.profiles?.avatar_url ? (
                  <img src={illustration.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <UserCircle2 size={14} />
                )}
                <span>@{illustration.profiles?.username}</span>
              </button>
              <span>·</span>
              <span className="truncate text-white/60 font-medium">{illustration.title}</span>
            </div>

            {/* Voice post info */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUserProfile(currentVoice.user_id)}
                className="flex items-center gap-2 group"
              >
                {currentVoice.profiles?.avatar_url ? (
                  <img src={currentVoice.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <UserCircle2 size={14} className="text-white/60" />
                  </div>
                )}
                <span className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors">
                  @{currentVoice.profiles?.username}
                </span>
                <span className="text-white/40 text-xs">の声</span>
              </button>
              <button
                onClick={() => toggleLikeVoicePost(currentVoice.id, illustration.id)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm"
              >
                <Heart
                  size={14}
                  className={likedVoicePosts.has(currentVoice.id) ? 'text-red-500' : 'text-white/60'}
                  fill={likedVoicePosts.has(currentVoice.id) ? 'currentColor' : 'none'}
                />
                <span className="text-white/70 text-xs">{currentVoice.likes_count}</span>
              </button>
            </div>

            {/* Illustrator × Voice actor attribution */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => onUserProfile(illustration.user_id)}
                className="flex items-center gap-1 text-sky-400/70 hover:text-sky-400 transition-colors"
              >
                {illustration.profiles?.avatar_url ? (
                  <img src={illustration.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <UserCircle2 size={11} />
                )}
                <span>@{illustration.profiles?.username}</span>
              </button>
              <span className="text-amber-400/60 font-medium">×</span>
              <button
                onClick={() => onUserProfile(currentVoice.user_id)}
                className="flex items-center gap-1 text-purple-400/70 hover:text-purple-400 transition-colors"
              >
                {currentVoice.profiles?.avatar_url ? (
                  <img src={currentVoice.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <UserCircle2 size={11} />
                )}
                <span>@{currentVoice.profiles?.username}</span>
              </button>
            </div>

            {currentVoice.title && (
              <p className="text-white font-semibold text-base leading-tight">{currentVoice.title}</p>
            )}

            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4">
              <VoicePlayer key={currentVoice.id} voicePost={currentVoice} autoPlay={true} playSignal={playSignal} />
            </div>
          </div>
        ) : (
          /* No voices: illustration info only */
          <div className="space-y-2">
            <button
              onClick={() => onUserProfile(illustration.user_id)}
              className="flex items-center gap-2 group"
            >
              {illustration.profiles?.avatar_url ? (
                <img src={illustration.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                  <UserCircle2 size={14} className="text-white/60" />
                </div>
              )}
              <span className="text-white/70 text-sm group-hover:text-amber-400 transition-colors">
                @{illustration.profiles?.username}
              </span>
            </button>
            <h2 className="text-white font-bold text-xl leading-tight">{illustration.title}</h2>
            {illustration.description && (
              <p className="text-white/60 text-sm line-clamp-2">{illustration.description}</p>
            )}
            {illustration.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {illustration.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-amber-400/80 text-xs px-2 py-0.5 bg-amber-400/10 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vertical navigation hints */}
      <div className="absolute left-1/2 -translate-x-1/2 top-20 z-10 pointer-events-none">
        {illIdx > 0 && (
          <div className="flex flex-col items-center text-white/20 animate-bounce">
            <ChevronUp size={20} />
          </div>
        )}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-10 pointer-events-none">
        {illIdx < items.length - 1 && (
          <div className="flex flex-col items-center text-white/20 animate-bounce">
            <ChevronDown size={20} />
          </div>
        )}
      </div>

      {/* Horizontal navigation hints */}
      {voiceIdx > 0 && (
        <button
          onClick={() => navigate('right')}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 active:scale-90 transition-all shadow-lg"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {voiceIdx < voicePosts.length - 1 && (
        <button
          onClick={() => navigate('left')}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-amber-400/20 backdrop-blur-sm border border-amber-400/30 flex items-center justify-center text-amber-400 hover:bg-amber-400/30 active:scale-90 transition-all shadow-lg"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Vertical position indicator */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1">
        {items.slice(Math.max(0, illIdx - 2), Math.min(items.length, illIdx + 3)).map((_, i) => {
          const globalI = Math.max(0, illIdx - 2) + i;
          return (
            <div
              key={globalI}
              className={`rounded-full transition-all ${globalI === illIdx ? 'w-1 h-5 bg-amber-400' : 'w-1 h-2 bg-white/20'}`}
            />
          );
        })}
      </div>

      {/* AI Voice Modal */}
      {showAiModal && (
        <AiVoiceModal
          illustration={illustration}
          onClose={() => setShowAiModal(false)}
          onSuccess={(newVoicePost) => {
            setItems(prev => prev.map((item, i) =>
              i === illIdx
                ? { ...item, voicePosts: [...item.voicePosts, newVoicePost], illustration: { ...item.illustration, voice_count: item.illustration.voice_count + 1 } }
                : item
            ));
            setShowAiModal(false);
          }}
        />
      )}

      {/* Voice Record Modal (pre-selected to current illustration) */}
      {showVoiceModal && (
        <VoiceRecordModal
          preselectedIllustration={{
            id: illustration.id,
            title: illustration.title,
            image_url: illustration.image_url,
          }}
          onClose={() => setShowVoiceModal(false)}
          onSuccess={() => {
            setItems(prev => prev.map((item, i) =>
              i === illIdx
                ? { ...item, illustration: { ...item.illustration, voice_count: item.illustration.voice_count + 1 } }
                : item
            ));
            setShowVoiceModal(false);
          }}
        />
      )}

      {/* Illustration Detail Modal */}
      {showDetail && (
        <IllustrationDetailModal
          illustration={illustration}
          onClose={() => setShowDetail(false)}
          onUserProfile={onUserProfile}
        />
      )}
    </div>
  );
}
