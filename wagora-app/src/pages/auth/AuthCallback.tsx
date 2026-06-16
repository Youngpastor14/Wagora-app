import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

/**
 * AuthCallback — Handles Supabase PKCE code exchange and OAuth redirects.
 *
 * This page is the redirectTo target for:
 *   - Google OAuth sign-in/sign-up
 *   - Email verification links
 *   - Magic link sign-in (if ever used)
 *
 * Flow:
 * 1. URL contains ?code=... (PKCE) → exchange code for session
 * 2. URL contains ?token_hash=...&type=... (email confirm) → Supabase handles via detectSessionInUrl
 * 3. Wait for SIGNED_IN event → redirect to onboarding or dashboard
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const redirectUser = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', userId)
          .single();

        if (isMounted) {
          navigate(
            profile?.onboarding_completed ? '/dashboard' : '/onboarding',
            { replace: true }
          );
        }
      } catch {
        if (isMounted) {
          navigate('/onboarding', { replace: true });
        }
      }
    };

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');

        // Surface any OAuth errors immediately
        if (errorParam) {
          setError(errorDescription || errorParam);
          return;
        }

        // Exchange PKCE code for session if present
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // If exchange fails, check if we already have a session (duplicate call guard)
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && isMounted) {
              await redirectUser(session.user.id);
              return;
            }
            if (isMounted) setError(exchangeError.message);
            return;
          }
        }

        // Check if a session already exists (handles token_hash email confirmation)
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user && isMounted) {
          await redirectUser(existingSession.user.id);
          return;
        }

        // Listen for the SIGNED_IN event (fires after code exchange completes)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) {
            subscription.unsubscribe();
            return;
          }

          if (event === 'SIGNED_IN' && session?.user) {
            subscription.unsubscribe();
            await redirectUser(session.user.id);
          } else if (event === 'PASSWORD_RECOVERY') {
            subscription.unsubscribe();
            navigate('/auth/reset-password', { replace: true });
          } else if (event === 'SIGNED_OUT') {
            subscription.unsubscribe();
            navigate('/auth/signin', { replace: true });
          }
        });

        // Safety timeout: after 12 seconds, stop waiting and redirect to sign-in
        const timeout = setTimeout(() => {
          if (isMounted) {
            subscription.unsubscribe();
            navigate('/auth/signin', {
              replace: true,
              state: { message: 'Session verification timed out. Please sign in again.' }
            });
          }
        }, 12000);

        // Cleanup
        return () => {
          clearTimeout(timeout);
          subscription.unsubscribe();
        };
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Authentication failed. Please try signing in again.');
        }
      }
    };

    handleCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)] p-4">
        <div className="max-w-md w-full bg-[var(--surface-card)] border border-red-500/20 rounded-xl p-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-500" />
            </div>
          </div>
          <div>
            <h1 className="font-clash text-xl font-bold text-[var(--text-primary)] mb-2">
              Authentication Failed
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{error}</p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate('/auth/signin', { replace: true })}
              className="w-full h-11 bg-[var(--text-primary)] text-[var(--background-primary)] font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
            >
              Back to Sign In
            </button>
            <button
              onClick={() => navigate('/auth/signup', { replace: true })}
              className="w-full h-11 border border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold text-sm rounded-lg hover:bg-[var(--surface-elevated)] transition-colors"
            >
              Create new account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)]">
      <div className="flex flex-col items-center gap-5">
        {/* Wagora logo mark */}
        <div className="w-12 h-12 flex items-center justify-center bg-[var(--text-primary)] text-[var(--background-primary)] rounded-lg shadow-lg">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor">
            <rect width="14" height="14" rx="2"/>
            <rect x="18" width="14" height="14" rx="2"/>
            <rect y="18" width="14" height="14" rx="2"/>
            <rect x="18" y="18" width="14" height="14" rx="2"/>
          </svg>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <Loader2 size={22} className="animate-spin text-[var(--accent-primary)]" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Verifying your session…
          </p>
          <p className="text-xs text-[var(--text-muted)] max-w-[200px]">
            You'll be redirected automatically in a moment
          </p>
        </div>
      </div>
    </div>
  );
}
