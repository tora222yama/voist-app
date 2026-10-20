import { Home, Plus, UserCircle2, Search } from 'lucide-react';
import { Page } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onUploadClick: () => void;
  onAuthRequired: () => void;
}

export function BottomNav({ currentPage, onNavigate, onUploadClick, onAuthRequired }: BottomNavProps) {
  const { user, profile } = useAuth();

  const handleProfile = () => {
    if (!user) { onAuthRequired(); return; }
    onNavigate('profile');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/8 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        <button
          onClick={() => onNavigate('feed')}
          className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${currentPage === 'feed' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
        >
          <Home size={22} strokeWidth={currentPage === 'feed' ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">ホーム</span>
        </button>

        <button
          onClick={() => onNavigate('feed')}
          className="flex flex-col items-center gap-1 px-5 py-2 rounded-xl text-white/30 hover:text-white/60 transition-all"
        >
          <Search size={22} strokeWidth={1.5} />
          <span className="text-[10px] font-medium">探す</span>
        </button>

        <button
          onClick={onUploadClick}
          className="relative -top-3 flex items-center justify-center w-14 h-14 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all shadow-lg shadow-amber-400/30"
        >
          <Plus size={26} strokeWidth={2.5} className="text-black" />
        </button>

        <button
          onClick={handleProfile}
          className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${currentPage === 'profile' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className={`w-[22px] h-[22px] rounded-full object-cover ${currentPage === 'profile' ? 'ring-2 ring-amber-400' : ''}`} />
          ) : (
            <UserCircle2 size={22} strokeWidth={currentPage === 'profile' ? 2.5 : 1.5} />
          )}
          <span className="text-[10px] font-medium">マイページ</span>
        </button>
      </div>
    </div>
  );
}
