import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  passwordRecovery: false,
  clearPasswordRecovery: () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      setProfile(existing as Profile);
      return;
    }

    // Profile missing (trigger may have failed at signup) — create it now
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const emailBase = authUser?.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '_') || 'user';
    const username = `${emailBase}_${userId.slice(0, 4)}`;
    const { data: created } = await supabase
      .from('profiles')
      .upsert({ id: userId, username, display_name: emailBase, user_type: 'both' }, { onConflict: 'id' })
      .select()
      .maybeSingle();
    if (created) setProfile(created as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
          setLoading(false);
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const clearPasswordRecovery = () => setPasswordRecovery(false);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, passwordRecovery, clearPasswordRecovery, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
