import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import React from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthProvider, useAuth } from './AuthContext';

type AuthListener = (event: string, session: Session | null) => void;

interface MockSupabaseClient {
  auth: {
    getSession: Mock<() => Promise<{ data: { session: Session | null }; error: Error | null }>>;
    signInWithPassword: Mock<
      (creds: { email: string; password: string }) => Promise<{ error: Error | null }>
    >;
    signUp: Mock<(creds: { email: string; password: string }) => Promise<{ error: Error | null }>>;
    signOut: Mock<() => Promise<{ error: Error | null }>>;
    resetPasswordForEmail: Mock<
      (email: string, options: { redirectTo: string }) => Promise<{ error: Error | null }>
    >;
    onAuthStateChange: Mock<
      (cb: AuthListener) => { data: { subscription: { unsubscribe: () => void } } }
    >;
  };
}

function mockAuth() {
  return (supabase as unknown as MockSupabaseClient).auth;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn((cb?: AuthListener) => {
        if (cb) cb('INITIAL', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    mockAuth().getSession.mockReset();
    mockAuth().signInWithPassword.mockReset();
    mockAuth().signUp.mockReset();
    mockAuth().signOut.mockReset();
    mockAuth().resetPasswordForEmail.mockReset();
    mockAuth().onAuthStateChange.mockReset();
    mockAuth().getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in a loading state with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isEnabled).toBe(true);
  });

  it('restores an existing session', async () => {
    const user = { id: 'u-1', email: 'a@b.com' } as unknown as User;
    mockAuth().getSession.mockResolvedValue({
      data: { session: { user, access_token: 'tok' } as unknown as Session },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(user);
  });

  it('subscribes to auth state changes and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    expect(mockAuth().onAuthStateChange).toHaveBeenCalled();
    unmount();
  });

  it('updates user when auth state changes', async () => {
    let listener: AuthListener | null = null;
    mockAuth().onAuthStateChange.mockImplementation((cb: AuthListener) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const user = { id: 'u-2', email: 'c@d.com' } as unknown as User;
    listener?.('SIGNED_IN', { user, access_token: 'tok2' } as unknown as Session);

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual(user);
  });

  it('signs in with email and password', async () => {
    mockAuth().signInWithPassword.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await result.current.signIn({ email: 'a@b.com', password: 'secret' });

    expect(mockAuth().signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
    });
    expect(response.error).toBeNull();
  });

  it('surfaces sign-in errors', async () => {
    const error = new Error('Invalid credentials');
    mockAuth().signInWithPassword.mockResolvedValue({ error });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await result.current.signIn({ email: 'a@b.com', password: 'wrong' });

    expect(response.error).toBe(error);
  });

  it('signs up with email and password', async () => {
    mockAuth().signUp.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await result.current.signUp({ email: 'new@b.com', password: 'secret' });

    expect(mockAuth().signUp).toHaveBeenCalledWith({ email: 'new@b.com', password: 'secret' });
    expect(response.error).toBeNull();
  });

  it('sends password reset email with app redirect', async () => {
    mockAuth().resetPasswordForEmail.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await result.current.resetPassword('a@b.com');

    expect(mockAuth().resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: expect.stringContaining('/auth/callback'),
    });
    expect(response.error).toBeNull();
  });

  it('signs out', async () => {
    mockAuth().signOut.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await result.current.signOut();

    expect(mockAuth().signOut).toHaveBeenCalled();
    expect(response.error).toBeNull();
  });

  it('throws when useAuth is called outside provider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });
});
