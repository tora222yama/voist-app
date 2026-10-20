import { useEffect, useRef, useState } from 'react';
import { UserCircle2, Palette, Mic, Layers, Settings, Grid3X3, Music2, Heart, UserPlus, UserCheck, Camera, LogOut, ChevronLeft, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Illustration, Profile, VoicePost } from '../types';
import { VoicePlayer } from './VoicePlayer';
import { IllustrationDetailModal } from './IllustrationDetailModal';
import { FollowListModal } from './FollowListModal';

interface ProfileViewProps {
  userId: string;
  onBack?: () => void;
  onEditProfile?: () => void;
  onUserProfile?: (userId: string) => void;
}

const userTypeLabel: Record<string, { label: string; icon: typeof Palette; color: string }> = {
  illustrator: { label: 'イラストレーター', icon: Palette, color: 'text-sky-400' },
  voice_actor: { label: '声優・声の表現者', icon: Mic, color: 'text-purple-400' },
  both: { label: 'イラスト & 声', icon: Layers, color: 'text-amber-400' },
};

export function ProfileView({ userId, onBack, onEditProfile, onUserProfile }: ProfileViewProps) {
  const { user, profile: myProfile, signOut, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [voicePosts, setVoicePosts] = useState<(VoicePost & { illustrations?: { title: string; image_url: string } })[]>([]);
  const [tab, setTab] = useState<'illustrations' | 'voices'>('illustrations');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState('');
  const [selectedIllustration, setSelectedIllustration] = useState<Illustration | null>(null);
  const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameValue, setUsernameValue] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'illustration' | 'voice'; id: string; storageUrl: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: prof }, { data: ills }, { data: voices }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('illustrations').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('voice_posts').select('*, illustrations(title, image_url)').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);
      if (prof) { setProfile(prof as Profile); setBioValue(prof.bio || ''); setUsernameValue(prof.username || ''); }
      if (ills) setIllustrations(ills as Illustration[]);
      if (voices) setVoicePosts(voices as (VoicePost & { illustrations?: { title: string; image_url: string } })[]);
      setLoading(false);
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (!user || isOwnProfile) return;
    supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', userId).maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [user, userId, isOwnProfile]);

  const toggleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
      setIsFollowing(false);
      setProfile(prev => prev ? { ...prev, followers_count: Math.max(0, prev.followers_count - 1) } : prev);
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setProfile(prev => prev ? { ...prev, followers_count: prev.followers_count + 1 } : prev);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileError('');
    const { error } = await supabase.from('profiles').update({
      bio: bioValue.trim() || null,
      username: usernameValue.trim(),
    }).eq('id', user.id);
    setSavingProfile(false);
    if (error) {
      setProfileError(error.message.includes('unique') ? 'このユーザーネームは使用中です' : error.message);
    } else {
      setProfile(prev => prev ? { ...prev, bio: bioValue.trim() || null, username: usernameValue.trim() } : prev);
      setEditingBio(false);
      setEditingUsername(false);
      refreshProfile();
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('illustrations').upload(path, file, { contentType: file.type, upsert: true });
    if (!uploadErr) {
      const { data: { publicUrl } } = supabase.storage.from('illustrations').getPublicUrl(path);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
      refreshProfile();
    }
    setUploadingAvatar(false);
  };

  const extractStoragePath = (url: string, bucket: string) => {
    const marker = `/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    return idx >= 0 ? decodeURIComponent(url.slice(idx + marker.length)) : '';
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !user) return;
    setDeleting(true);
    const { type, id, storageUrl } = deleteConfirm;

    if (type === 'illustration') {
      const path = extractStoragePath(storageUrl, 'illustrations');
      if (path) await supabase.storage.from('illustrations').remove([path]);
      await supabase.from('illustrations').delete().eq('id', id).eq('user_id', user.id);
      setIllustrations(prev => prev.filter(i => i.id !== id));
    } else {
      const path = extractStoragePath(storageUrl, 'audio');
      if (path) await supabase.storage.from('audio').remove([path]);
      await supabase.from('voice_posts').delete().eq('id', id).eq('user_id', user.id);
      setVoicePosts(prev => prev.filter(vp => vp.id !== id));
    }

    setDeleteConfirm(null);
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/40">ユーザーが見つかりません</p>
      </div>
    );
  }

  const typeInfo = userTypeLabel[profile.user_type] || userTypeLabel.both;
  const TypeIcon = typeInfo.icon;

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/80 backdrop-blur-md flex items-center gap-3 px-5 py-4 border-b border-white/5">
        {onBack && (
          <button onClick={onBack} className="text-white/60 hover:text-white transition-colors">
            <ChevronLeft size={22} />
          </button>
        )}
        <span className="text-white font-semibold text-base flex-1 truncate">@{profile.username}</span>
        {isOwnProfile && (
          <button onClick={() => signOut()} className="text-white/40 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        )}
      </div>

      {/* Profile header */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-start gap-4 mb-5">
          <div className="relative flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center ring-2 ring-white/10">
                <UserCircle2 size={36} className="text-white/30" />
              </div>
            )}
            {isOwnProfile && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center hover:bg-amber-300 transition-colors"
                >
                  {uploadingAvatar ? (
                    <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera size={13} className="text-black" />
                  )}
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {editingUsername && isOwnProfile ? (
              <input
                type="text"
                value={usernameValue}
                onChange={e => setUsernameValue(e.target.value)}
                onBlur={() => setEditingUsername(false)}
                autoFocus
                className="text-white text-xl font-bold bg-white/5 border border-amber-400/50 rounded-lg px-2 py-1 w-full focus:outline-none"
              />
            ) : (
              <h1
                className={`text-white text-xl font-bold truncate ${isOwnProfile ? 'cursor-pointer hover:text-amber-400 transition-colors' : ''}`}
                onClick={() => isOwnProfile && setEditingUsername(true)}
              >
                {profile.display_name || profile.username}
              </h1>
            )}
            <p className="text-white/40 text-sm">@{profile.username}</p>
            <div className={`flex items-center gap-1.5 mt-1.5 text-sm ${typeInfo.color}`}>
              <TypeIcon size={14} />
              <span>{typeInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {isOwnProfile && editingBio ? (
          <div className="mb-4 space-y-2">
            <textarea
              value={bioValue}
              onChange={e => setBioValue(e.target.value)}
              maxLength={200}
              rows={3}
              autoFocus
              placeholder="自己紹介を入力..."
              className="w-full bg-white/5 border border-white/20 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-amber-400/50"
            />
            {profileError && <p className="text-red-400 text-xs">{profileError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setEditingBio(false); setEditingUsername(false); }} className="flex-1 py-1.5 rounded-lg border border-white/10 text-white/50 text-sm hover:text-white transition-colors">キャンセル</button>
              <button onClick={saveProfile} disabled={savingProfile} className="flex-1 py-1.5 rounded-lg bg-amber-400 text-black text-sm font-semibold hover:bg-amber-300 disabled:opacity-50 transition-colors">
                {savingProfile ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`text-white/60 text-sm leading-relaxed mb-4 ${isOwnProfile ? 'cursor-pointer hover:text-white/80 transition-colors' : ''} ${!profile.bio ? 'text-white/30 italic' : ''}`}
            onClick={() => isOwnProfile && setEditingBio(true)}
          >
            {profile.bio || (isOwnProfile ? '自己紹介を追加（タップで編集）' : '')}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 mb-5">
          <div className="text-center">
            <p className="text-white font-bold text-lg">{illustrations.length}</p>
            <p className="text-white/40 text-xs">イラスト</p>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">{voicePosts.length}</p>
            <p className="text-white/40 text-xs">声</p>
          </div>
          <button
            onClick={() => setFollowListType('followers')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <p className="text-white font-bold text-lg">{profile.followers_count}</p>
            <p className="text-white/40 text-xs">フォロワー</p>
          </button>
          <button
            onClick={() => setFollowListType('following')}
            className="text-center hover:opacity-80 transition-opacity"
          >
            <p className="text-white font-bold text-lg">{profile.following_count}</p>
            <p className="text-white/40 text-xs">フォロー中</p>
          </button>
        </div>

        {/* Action buttons */}
        {isOwnProfile ? (
          <button
            onClick={() => setEditingBio(true)}
            className="w-full py-2.5 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Settings size={15} />
            プロフィールを編集
          </button>
        ) : user ? (
          <button
            onClick={toggleFollow}
            className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              isFollowing
                ? 'border border-white/20 text-white/70 hover:text-white hover:border-white/40'
                : 'bg-amber-400 hover:bg-amber-300 text-black'
            }`}
          >
            {isFollowing ? <><UserCheck size={16} /> フォロー中</> : <><UserPlus size={16} /> フォローする</>}
          </button>
        ) : null}
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-white/10 sticky top-[61px] z-10 bg-[#0a0a0a]">
        <button
          onClick={() => setTab('illustrations')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-b-2 ${tab === 'illustrations' ? 'text-white border-amber-400' : 'text-white/40 border-transparent hover:text-white/60'}`}
        >
          <Grid3X3 size={15} />
          イラスト ({illustrations.length})
        </button>
        <button
          onClick={() => setTab('voices')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors border-b-2 ${tab === 'voices' ? 'text-white border-amber-400' : 'text-white/40 border-transparent hover:text-white/60'}`}
        >
          <Music2 size={15} />
          声 ({voicePosts.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {tab === 'illustrations' ? (
          illustrations.length === 0 ? (
            <div className="text-center py-16">
              <Grid3X3 size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm">まだイラストがありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {illustrations.map(ill => (
                <div key={ill.id} className="relative aspect-square rounded-xl overflow-hidden group">
                  <button
                    onClick={() => setSelectedIllustration(ill)}
                    className="block w-full h-full"
                  >
                    <img src={ill.image_url} alt={ill.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </button>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-medium truncate">{ill.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-white/60 text-xs">
                        <span className="flex items-center gap-0.5"><Heart size={10} /> {ill.likes_count}</span>
                        <span className="flex items-center gap-0.5"><Mic size={10} /> {ill.voice_count}</span>
                      </div>
                    </div>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => setDeleteConfirm({ type: 'illustration', id: ill.id, storageUrl: ill.image_url })}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-red-400 hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          voicePosts.length === 0 ? (
            <div className="text-center py-16">
              <Mic size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/30 text-sm">まだ声の投稿がありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {voicePosts.map(vp => (
                <div key={vp.id} className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                  <div className="flex gap-3 p-3 pb-0">
                    {vp.illustrations?.image_url && (
                      <img src={vp.illustrations.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm truncate">{vp.title || '声の投稿'}</p>
                          <p className="text-white/40 text-xs truncate">{vp.illustrations?.title}</p>
                        </div>
                        {isOwnProfile && (
                          <button
                            onClick={() => setDeleteConfirm({ type: 'voice', id: vp.id, storageUrl: vp.audio_url })}
                            className="flex-shrink-0 text-white/30 hover:text-red-400 transition-colors p-0.5"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-white/40 text-xs">
                        <Heart size={11} />
                        <span>{vp.likes_count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-3 pb-3 pt-2">
                    <VoicePlayer voicePost={vp} compact />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setDeleteConfirm(null)} />
          <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold text-lg">本当に削除しますか？</h3>
            <p className="text-white/50 text-sm leading-relaxed">
              {deleteConfirm.type === 'illustration'
                ? 'このイラストに紐付いているすべての声も削除されます。'
                : 'この声の投稿を削除します。'}
              この操作は取り消せません。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all disabled:opacity-40 font-medium text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />削除中...</>
                ) : (
                  <><Trash2 size={15} />削除する</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedIllustration && (
        <IllustrationDetailModal
          illustration={selectedIllustration}
          onClose={() => setSelectedIllustration(null)}
          onUserProfile={(uid) => { setSelectedIllustration(null); onUserProfile?.(uid); }}
        />
      )}
      {followListType && (
        <FollowListModal
          userId={userId}
          type={followListType}
          onClose={() => setFollowListType(null)}
          onUserProfile={(uid) => { setFollowListType(null); onUserProfile?.(uid); }}
        />
      )}
    </div>
  );
}
