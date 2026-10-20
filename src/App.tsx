import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { PasswordUpdateModal } from './components/PasswordUpdateModal';
import { BottomNav } from './components/BottomNav';
import { IllustrationFeed } from './components/IllustrationFeed';
import { ProfileView } from './components/ProfileView';
import { CreatePostModal } from './components/CreatePostModal';
import { AiCharacterModal } from './components/AiCharacterModal';
import { AnimeSceneBg } from './components/AnimeSceneBg';
import { Page } from './types';

function AppContent() {
  const { user, loading, passwordRecovery, clearPasswordRecovery } = useAuth();
  const [page, setPage]               = useState<Page>('feed');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showAuth, setShowAuth]       = useState(false);
  const [showCreate, setShowCreate]   = useState(false);
  const [showAiCreate, setShowAiCreate] = useState(false);
  const [feedKey, setFeedKey]         = useState(0);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
        <AnimeSceneBg scene="ocean" className="absolute inset-0 w-full h-full opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-[#0a0a0a]/50" />
        <div className="relative flex flex-col items-center gap-4 z-10">
          <span className="text-4xl font-bold tracking-tight text-white drop-shadow-lg">
            vo<span className="text-amber-400">i</span>st
          </span>
          <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const handleUploadClick = () => {
    if (!user) { setShowAuth(true); return; }
    setShowCreate(true);
  };

  const handleNavigate = (p: Page) => { setPage(p); setViewingUserId(null); };
  const handleViewProfile = (userId: string) => { setViewingUserId(userId); setPage('user'); };
  const handleFeedRefresh = () => setFeedKey(k => k + 1);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] overflow-hidden font-sans">
      <div className="h-full pb-16">
        {page === 'feed' && (
          <IllustrationFeed
            key={feedKey}
            onAuthRequired={() => setShowAuth(true)}
            onUserProfile={handleViewProfile}
            onAiCreate={() => { if (!user) { setShowAuth(true); return; } setShowAiCreate(true); }}
          />
        )}
        {page === 'profile' && user && (
          <ProfileView userId={user.id} onEditProfile={() => {}} onBack={() => setPage('feed')} onUserProfile={handleViewProfile} />
        )}
        {page === 'user' && viewingUserId && (
          <ProfileView
            userId={viewingUserId}
            onBack={() => { setPage('feed'); setViewingUserId(null); }}
            onUserProfile={handleViewProfile}
          />
        )}
      </div>

      <BottomNav
        currentPage={page}
        onNavigate={handleNavigate}
        onUploadClick={handleUploadClick}
        onAuthRequired={() => setShowAuth(true)}
      />

      {showAuth    && <AuthModal onClose={() => setShowAuth(false)} />}
      {passwordRecovery && <PasswordUpdateModal onClose={clearPasswordRecovery} />}
      {showCreate  && <CreatePostModal onClose={() => setShowCreate(false)} onSuccess={handleFeedRefresh} />}
      {showAiCreate && (
        <AiCharacterModal
          onClose={() => setShowAiCreate(false)}
          onSuccess={() => { setShowAiCreate(false); handleFeedRefresh(); }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
