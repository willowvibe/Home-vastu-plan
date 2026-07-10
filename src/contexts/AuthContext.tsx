import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  error: Error | null;
}

interface AuthContextValue {
  /** Whether Supabase Auth is configured in this build. */
  isEnabled: boolean;
  /** True while the initial session is being restored. */
  isLoading: boolean;
  /** Whether a user is currently signed in. */
  isAuthenticated: boolean;
  /** The current Supabase user, or null when anonymous. */
  user: User | null;
  /** The current Supabase session, or null when anonymous. */
  session: Session | null;
  /** Sign in with email + password. */
  signIn: (credentials: AuthCredentials) => Promise<AuthResult>;
  /** Sign up with email + password. */
  signUp: (credentials: AuthCredentials) => Promise<AuthResult>;
  /** Send a password reset email. */
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Send a magic-link sign-in email (works for new and existing users). */
  sendMagicLink: (email: string) => Promise<AuthResult>;
  /** Start Google OAuth sign-in. */
  signInWithGoogle: () => Promise<AuthResult>;
  /** Sign the current user out. */
  signOut: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const disabledValue: AuthContextValue = {
  isEnabled: false,
  isLoading: false,
  isAuthenticated: false,
  user: null,
  session: null,
  signIn: async () => ({ error: new Error('Supabase Auth is not configured') }),
  signUp: async () => ({ error: new Error('Supabase Auth is not configured') }),
  resetPassword: async () => ({ error: new Error('Supabase Auth is not configured') }),
  sendMagicLink: async () => ({ error: new Error('Supabase Auth is not configured') }),
  signInWithGoogle: async () => ({ error: new Error('Supabase Auth is not configured') }),
  signOut: async () => ({ error: null }),
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!supabase);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        console.error('[Auth] Failed to restore session:', error.message);
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useMemo(
    () =>
      async ({ email, password }: AuthCredentials): Promise<AuthResult> => {
        if (!supabase) return { error: new Error('Supabase Auth is not configured') };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ?? null };
      },
    []
  );

  const signUp = useMemo(
    () =>
      async ({ email, password }: AuthCredentials): Promise<AuthResult> => {
        if (!supabase) return { error: new Error('Supabase Auth is not configured') };
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error ?? null };
      },
    []
  );

  const resetPassword = useMemo(
    () =>
      async (email: string): Promise<AuthResult> => {
        if (!supabase) return { error: new Error('Supabase Auth is not configured') };
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback`,
        });
        return { error: error ?? null };
      },
    []
  );

  const sendMagicLink = useMemo(
    () =>
      async (email: string): Promise<AuthResult> => {
        if (!supabase) return { error: new Error('Supabase Auth is not configured') };
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        return { error: error ?? null };
      },
    []
  );

  const signInWithGoogle = useMemo(
    () => async (): Promise<AuthResult> => {
      if (!supabase) return { error: new Error('Supabase Auth is not configured') };
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      return { error: error ?? null };
    },
    []
  );

  const signOut = useMemo(
    () => async (): Promise<AuthResult> => {
      if (!supabase) return { error: null };
      const { error } = await supabase.auth.signOut();
      return { error: error ?? null };
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isEnabled: !!supabase,
      isLoading,
      isAuthenticated: !!user,
      user,
      session,
      signIn,
      signUp,
      resetPassword,
      sendMagicLink,
      signInWithGoogle,
      signOut,
    }),
    [
      isLoading,
      user,
      session,
      signIn,
      signUp,
      resetPassword,
      sendMagicLink,
      signInWithGoogle,
      signOut,
    ]
  );

  if (!supabase) {
    return <AuthContext.Provider value={disabledValue}>{children}</AuthContext.Provider>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** Read the current auth state and auth actions. */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
