import { useEffect, useState } from 'react';
import { X, UserCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface FollowListModalProps {
  userId: string;
  type: 'followers' | 'following';
  onClose: () => void;
  onUserProfile: (userId: string) => void;
}

export function FollowListModal({ userId, type, onClose, onUserProfile }: FollowListModalProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (type === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select('follower_id, profiles!follows_follower_id_fkey(*)')
          .eq('following_id', userId);
        if (data) {
          setUsers(data.map((r: any) => r.profiles).filter(Boolean) as Profile[]);
        }
      } else {
        const { data } = await supabase
          .from('follows')
          .select('following_id, profiles!follows_following_id_fkey(*)')
          .eq('follower_id', userId);
        if (data) {
          setUsers(data.map((r: any) => r.profiles).filter(Boolean) as Profile[]);
        }
      }
      setLoading(false);
    };
    load();
  }, [userId, type]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#0f0f0f] border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#0f0f0f] z-10 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-base">
            {type === 'followers' ? 'フォロワー' : 'フォロー中'}
          </h2>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <UserCircle2 size={32} className="text-white/20 mx-auto mb-2" />
            <p className="text-white/30 text-sm">
              {type === 'followers' ? 'フォロワーはまだいません' : 'フォロー中のユーザーはいません'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => { onClose(); onUserProfile(u.id); }}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors"
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <UserCircle2 size={18} className="text-white/50" />
                  </div>
                )}
                <div className="text-left min-w-0">
                  <p className="text-white text-sm font-medium truncate">@{u.username}</p>
                  {u.display_name && (
                    <p className="text-white/40 text-xs truncate">{u.display_name}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
