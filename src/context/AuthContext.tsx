import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  needsProfileSetup: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearNeedsProfileSetup: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  useEffect(() => {
    // Get initial session. Supabase's client already handles the OAuth redirect on its own —
    // detectSessionInUrl (default true) parses #access_token=... from the URL, persists the
    // session, and strips the hash, all before this promise resolves. No manual parsing needed.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Every new Google sign-in gets a profiles row via the handle_new_user trigger, but it only
  // has whatever Google handed us (name, email) — school/grade/etc. are still empty. Detect
  // that once per session so the app can prompt the user to finish setting up their profile.
  useEffect(() => {
    if (!user) {
      setNeedsProfileSetup(false);
      return;
    }

    let cancelled = false;
    supabase
      .from('profiles')
      .select('first_name, last_name, school, grade, graduation_year')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setNeedsProfileSetup(false);
          return;
        }
        setNeedsProfileSetup(
          !data.first_name || !data.last_name || !data.school || !data.grade || !data.graduation_year,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // Supabase redirects the browser away immediately on success — this function only
      // returns (without setting loading back to false) on failure.
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const clearNeedsProfileSetup = () => setNeedsProfileSetup(false);

  const value = {
    user,
    loading,
    needsProfileSetup,
    signInWithGoogle,
    signOut,
    deleteAccount,
    clearNeedsProfileSetup,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
