import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

export default function SignIn() {
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we were redirected from another page
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        // Supabase returns 'Invalid login credentials' for both wrong password
        // AND unconfirmed email — detect the unconfirmed case and help the user
        const msg = signInError.message.toLowerCase();
        if (
          msg.includes('email not confirmed') ||
          msg.includes('invalid login credentials')
        ) {
          // Check if the user exists but hasn't confirmed their email
          const { data: { user: checkUser } } = await supabase.auth.getUser();
          const emailConfirmed = checkUser?.email_confirmed_at;

          if (!emailConfirmed) {
            // Route to verification page with the email pre-filled
            navigate('/auth/verify-email', {
              state: { email },
              replace: false,
            });
            setLoading(false);
            return;
          }
        }

        // Map common Supabase error messages to user-friendly text
        let friendlyError = signInError.message;
        if (msg.includes('invalid login credentials')) {
          friendlyError = 'Incorrect email or password. Please try again.';
        } else if (msg.includes('too many requests')) {
          friendlyError = 'Too many sign-in attempts. Please wait a few minutes and try again.';
        } else if (msg.includes('user not found')) {
          friendlyError = 'No account found with this email. Please sign up first.';
        }

        setError(friendlyError);
        setLoading(false);
      } else {
        // AuthContext handles session updates, ProtectedRoute handles redirection to /onboarding if needed
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during sign in.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: googleError } = await signInWithGoogle();
      if (googleError) {
        setError(googleError.message);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during Google sign in.');
      setGoogleLoading(false);
    }
  };

  const marketingUrl = import.meta.env.VITE_MARKETING_URL || 'http://localhost:5173';

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Auth Card */}
      <main className="w-full max-w-[400px] bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-8 shadow-sm relative z-10">
        <header className="mb-8 relative">
          <a 
            href={marketingUrl} 
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 mb-6"
          >
            ← Back to wagora.com
          </a>
          <h1 className="font-clash text-[28px] font-semibold text-[var(--text-primary)] leading-tight tracking-tight">
            Welcome back.
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Sign in to the Operator Console.
          </p>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-[var(--radius-md)] mb-6">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="email">
              EMAIL ADDRESS
            </label>
            <input 
              id="email"
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              placeholder="operator@wagora.io"
              disabled={loading || googleLoading}
              autoComplete="email"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="password">
                PASSWORD
              </label>
              <Link 
                to="/auth/forgot-password" 
                className="text-[11px] font-bold text-[var(--accent-primary)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input 
              id="password"
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              placeholder="••••••••"
              disabled={loading || googleLoading}
              autoComplete="current-password"
            />
          </div>

          {/* CTA */}
          <button 
            type="submit"
            disabled={loading || googleLoading}
            className="w-full h-12 bg-[var(--text-primary)] hover:bg-[var(--accent-primary-hover)] hover:text-white text-[var(--background-primary)] font-semibold text-sm rounded transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </span>
            ) : "Sign in"}
          </button>
        </form>

        <div className="relative my-6 flex items-center">
          <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
          <span className="px-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">or</span>
          <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
        </div>

        {/* Google OAuth Button */}
        <button 
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-3 border border-[var(--border-subtle)] py-3 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer disabled:opacity-50 text-[var(--text-primary)] font-medium text-sm"
        >
          {googleLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Sign in with Google
        </button>

        {/* Footer inside card */}
        <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Don't have an account?{' '}
            <Link to="/auth/signup" className="text-[var(--text-primary)] font-semibold hover:underline">
              Start free
            </Link>
          </p>
        </div>
      </main>

      {/* Aesthetic Footer Placeholder */}
      <footer className="mt-4">
        <div className="flex items-center gap-3 opacity-40">
          <span className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)]">SECURE ACCESS</span>
          <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full"></span>
          <span className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)]">OPERATOR V1.0</span>
        </div>
      </footer>
    </div>
  );
}
