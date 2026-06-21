import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute
 *
 * Renders a full-page spinner ONLY during the initial cold-start
 * where we don't yet know if a session exists (loading = true and user = null).
 *
 * Once loading is false:
 *  - No user → redirect to sign-in
 *  - User exists but onboarding not done → redirect to onboarding
 *  - Otherwise → render children
 *
 * NOTE: loading can briefly be true even after the session is known
 * (while profile fetches in background). We only show the spinner
 * on the FIRST render before any session is resolved.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isOnboardingComplete } = useAuth();
  const location = useLocation();

  // Show spinner only for the very first resolution (no cached session yet)
  if (loading && user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[var(--accent-primary)]" />
          <p className="text-[13px] text-[var(--text-muted)]">Loading Wagora...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }

  // Redirect to onboarding if profile is loaded and onboarding is not done.
  // If profile hasn't loaded yet (null), don't redirect — wait silently.
  // This prevents flashing the onboarding screen for users who are already done.
  if (
    !loading &&
    !isOnboardingComplete &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

/**
 * PublicRoute
 *
 * Auth pages (sign-in, sign-up) are rendered IMMEDIATELY without any
 * loading spinner. We only redirect away if we KNOW a valid session exists.
 *
 * This makes the auth pages feel instant — they appear in < 100ms
 * while the session check happens in the background.
 */
export function PublicRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isOnboardingComplete } = useAuth();

  // IMPORTANT: Don't block on loading here.
  // Auth pages should appear instantly. If the user turns out to be
  // signed in already, they'll be redirected once loading resolves.
  if (!loading && user) {
    return <Navigate to={isOnboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  }

  return <>{children}</>;
}
