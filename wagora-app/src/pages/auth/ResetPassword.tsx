import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // Supabase sends a recovery token — detectSessionInUrl picks it up automatically.
  // We wait for the PASSWORD_RECOVERY event before showing the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if we already have a recovery session from the URL hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // Timeout — if no recovery session after 8s, show error
    const timeout = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev) setSessionError(true);
        return prev;
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setSuccess(true);
      // Auto-redirect after 3 seconds
      setTimeout(() => navigate('/dashboard', { replace: true }), 3000);
    }
  };

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)] p-4">
        <div className="max-w-md w-full bg-[var(--surface-card)] border border-red-500/20 rounded-xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle size={24} className="text-red-500" />
            </div>
          </div>
          <h1 className="font-clash text-xl font-bold text-[var(--text-primary)]">Link Expired</h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            This password reset link has expired or is invalid. Please request a new one.
          </p>
          <button
            onClick={() => navigate('/auth/forgot-password', { replace: true })}
            className="w-full h-11 bg-[var(--text-primary)] text-[var(--background-primary)] font-semibold text-sm rounded-lg hover:opacity-90 transition-opacity"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)] p-4">
        <div className="max-w-md w-full bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-8 text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 size={48} className="text-[var(--accent-primary)] animate-pulse" />
          </div>
          <h1 className="font-clash text-xl font-bold text-[var(--text-primary)]">Password Updated</h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Your password has been changed successfully. Redirecting you to the dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--accent-primary)]" />
          <p className="text-sm text-[var(--text-secondary)]">Verifying reset link…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-primary)] p-4">
      <main className="w-full max-w-[400px] bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-8 shadow-sm">
        <header className="mb-8">
          <div className="w-8 h-8 flex items-center justify-center bg-[var(--text-primary)] text-[var(--background-primary)] rounded-sm mb-6">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
              <rect width="14" height="14" rx="2"/>
              <rect x="18" width="14" height="14" rx="2"/>
              <rect y="18" width="14" height="14" rx="2"/>
              <rect x="18" y="18" width="14" height="14" rx="2"/>
            </svg>
          </div>
          <h1 className="font-clash text-[28px] font-semibold text-[var(--text-primary)] leading-tight tracking-tight">
            Set new password
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Choose a strong password for your Wagora account.
          </p>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="new-password">
              New Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-10 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="confirm-password">
              Confirm Password
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-10 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
                placeholder="Repeat your password"
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[var(--text-primary)] hover:opacity-90 text-[var(--background-primary)] font-semibold text-sm rounded transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Updating…
              </span>
            ) : 'Update Password'}
          </button>
        </form>
      </main>
    </div>
  );
}
