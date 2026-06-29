import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isEmailVerified: boolean;
  isOnboardingComplete: boolean;
  plan: Profile['plan'] | null;
  trialEndsAt: string | null;
  isTrialExpired: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, fullName: string, businessName: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
  markOnboardingComplete: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// How long to wait for a profile fetch before giving up (ms).
// After this timeout the user is still signed in — profile is just null for now.
const PROFILE_FETCH_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Track the most recent fetch request so stale responses are discarded
  const fetchSeqRef = useRef(0);

  /**
   * Fetches the user profile from Supabase with a hard timeout.
   * Never throws — on error or timeout it resolves with null and continues.
   */
  const fetchProfile = useCallback(async (userId: string): Promise<void> => {
    const seq = ++fetchSeqRef.current;

    try {
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), PROFILE_FETCH_TIMEOUT_MS)
      );

      const result = await Promise.race([fetchPromise, timeoutPromise]);

      // Discard if a newer fetch has started
      if (seq !== fetchSeqRef.current) return;

      if (result && 'data' in result && result.data) {
        setProfile(result.data as Profile);
      }
      // else: profile stays null — user is still authenticated
    } catch {
      // Network or RLS error — don't block the user, just continue with null profile
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  /**
   * Synchronously patches the in-memory profile to mark onboarding complete.
   * Must be called BEFORE navigate() so ProtectedRoute sees the updated value
   * on its next render and does not redirect back to /onboarding.
   */
  const markOnboardingComplete = useCallback(() => {
    setProfile((prev) => prev ? { ...prev, onboarding_completed: true } : prev);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Bootstrap: check for an existing session immediately
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!isMounted) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);

      if (existingSession?.user) {
        // Fetch profile but NEVER block the app waiting for it.
        // setLoading(false) fires immediately so the route guard renders instantly.
        setLoading(false);
        fetchProfile(existingSession.user.id);
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });

    // Listen for ongoing auth events (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Non-blocking: don't await — let profile fetch happen in background
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        fetchSeqRef.current++; // discard any in-flight fetch
      }

      // Always clear loading when auth state changes
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    businessName: string
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, business_name: businessName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    fetchSeqRef.current++; // cancel any in-flight profile fetch
    setProfile(null);
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  }, []);

  // Computed values
  const isEmailVerified = !!user?.email_confirmed_at;
  const isOnboardingComplete = profile?.onboarding_completed ?? false;
  const plan = profile?.plan ?? null;
  const trialEndsAt = profile?.trial_ends_at ?? null;
  const isTrialExpired = trialEndsAt ? new Date(trialEndsAt) < new Date() : false;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isEmailVerified,
      isOnboardingComplete,
      plan,
      trialEndsAt,
      isTrialExpired,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
      markOnboardingComplete,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
