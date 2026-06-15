import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

/**
 * AuthCallback — Handles Supabase PKCE code exchange.
 *
 * Both Google OAuth and email verification redirect here:
 *   - Google OAuth: returns ?code=... in the URL
 *   - Email verification: returns ?token_hash=...&type=email
 *
 * Supabase's detectSessionInUrl (set in client.ts) automatically
 * picks up the session from the URL hash/params, so we just need
 * to wait for the auth state change and redirect accordingly.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        // Handle PKCE code exchange from URL params
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');

        if (errorParam) {
          setError(errorDescription || errorParam);
          return;
        }

        if (code) {
          // Exchange the PKCE code for a session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError(exchangeError.message);
            return;
          }
        }

        // Wait for the session to be fully established via onAuthStateChange
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (cancelled) return;

          if (session?.user) {
            // Check if onboarding is complete
            const { data: profile } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', session.user.id)
              .single();

            if (!cancelled) {
              navigate(
                profile?.onboarding_completed ? '/dashboard' : '/onboarding',
                { replace: true }
              );
            }
            subscription.unsubscribe();
          } else if (_event === 'SIGNED_OUT') {
            if (!cancelled) {
              navigate('/auth/signin', { replace: true });
            }
            subscription.unsubscribe();
          }
        });

        // Fallback: if there's already a session (hash-based flow), redirect immediately
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession?.user && !cancelled) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', existingSession.user.id)
            .single();

          navigate(
            profile?.onboarding_completed ? '/dashboard' : '/onboarding',
            { replace: true }
          );
          subscription.unsubscribe();
          return;
        }

        // Timeout fallback — if nothing happens in 10 seconds, redirect to signin
        const timeout = setTimeout(() => {
          if (!cancelled) {
            subscription.unsubscribe();
            navigate('/auth/signin', { replace: true });
          }
        }, 10000);

        return () => {
          clearTimeout(timeout);
          subscription.unsubscribe();
        };
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Authentication failed. Please try again.');
        }
      }
    };

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)]">
        <div className="max-w-md w-full mx-4 bg-[var(--surface-card)] border border-red-500/20 rounded-xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-500" />
            </div>
          </div>
          <h1 className="font-clash text-xl font-bold text-[var(--text-primary)]">
            Authentication Failed
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{error}</p>
          <button
            onClick={() => navigate('/auth/signin', { replace: true })}
            className="w-full h-11 bg-[var(--text-primary)] text-[var(--background-primary)] font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 flex items-center justify-center bg-[var(--text-primary)] text-[var(--background-primary)] rounded-sm">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor">
            <rect width="14" height="14" rx="2"/>
            <rect x="18" width="14" height="14" rx="2"/>
            <rect y="18" width="14" height="14" rx="2"/>
            <rect x="18" y="18" width="14" height="14" rx="2"/>
          </svg>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={20} className="animate-spin text-[var(--accent-primary)]" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Verifying your session…
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            You'll be redirected automatically
          </p>
        </div>
      </div>
    </div>
  );
}
