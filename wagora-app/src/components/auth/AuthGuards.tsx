import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isOnboardingComplete } = useAuth();
  const location = useLocation();

  if (loading) {
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

  // Redirect to onboarding if not completed (but not if already going there)
  if (!isOnboardingComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isOnboardingComplete } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[var(--accent-primary)]" />
          <p className="text-[13px] text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={isOnboardingComplete ? '/dashboard' : '/onboarding'} replace />;
  }

  return <>{children}</>;
}
