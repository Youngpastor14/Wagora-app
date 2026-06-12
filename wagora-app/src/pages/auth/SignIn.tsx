import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
        setError(signInError.message);
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
    <div className="space-y-6">
      <div className="text-center relative">
        <a 
          href={marketingUrl} 
          className="absolute -top-16 left-0 text-xs font-medium text-token-secondary hover:text-token-primary transition-colors flex items-center gap-1"
        >
          ← Back to wagora.com
        </a>
        <h2 className="font-clash text-headline-md font-bold text-token-primary">Welcome back</h2>
        <p className="text-token-secondary mt-1">Sign in to your Wagora workspace.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-[var(--radius-md)]">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-token-primary mb-1">Email address</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-token-muted" />
            </div>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-token-primary placeholder-token-muted focus:outline-none focus:ring-2 focus:ring-token-accent focus:border-transparent transition-all"
              placeholder="you@company.com"
              disabled={loading || googleLoading}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-token-primary">Password</label>
            <Link 
              to="/auth/forgot-password" 
              className="text-sm font-medium text-token-accent hover:text-[var(--accent-primary-hover)]"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock size={16} className="text-token-muted" />
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-token-primary placeholder-token-muted focus:outline-none focus:ring-2 focus:ring-token-accent focus:border-transparent transition-all"
              placeholder="••••••••"
              disabled={loading || googleLoading}
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-2 bg-token-primary text-[var(--surface-card)] py-2.5 rounded-[var(--radius-md)] font-bold hover:bg-opacity-90 disabled:opacity-50 transition-all mt-6"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border-default)]"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-[var(--surface-card)] text-token-muted">Or continue with</span>
        </div>
      </div>

      <button 
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
        className="w-full flex items-center justify-center gap-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-token-primary py-2.5 rounded-[var(--radius-md)] font-medium hover:bg-[var(--surface-elevated)] disabled:opacity-50 transition-all"
      >
        {googleLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        )}
        Sign in with Google
      </button>

      <p className="text-center text-sm text-token-secondary">
        Don't have an account?{' '}
        <Link to="/auth/signup" className="font-bold text-token-accent hover:text-[var(--accent-primary-hover)]">
          Request access
        </Link>
      </p>
    </div>
  );
}
