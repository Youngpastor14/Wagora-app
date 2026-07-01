import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUp() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read pre-selected plan from URL query param (e.g., ?plan=pro)
  const planParam = searchParams.get('plan') || 'free';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !companyName || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!agreedTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await signUp(email, password, fullName, companyName);

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        let friendlyError = signUpError.message;
        if (msg.includes('user already registered') || msg.includes('already exists')) {
          friendlyError = 'An account with this email already exists. Please sign in instead.';
        } else if (msg.includes('password should be')) {
          friendlyError = 'Password must be at least 6 characters.';
        } else if (msg.includes('invalid email')) {
          friendlyError = 'Please enter a valid email address.';
        }
        setError(friendlyError);
        setLoading(false);
      } else {
        navigate('/auth/verify-email', {
          state: { email },
          replace: true,
        });
      }
    } catch (err: any) {
      const isNetworkError =
        err?.message?.toLowerCase().includes('fetch') ||
        err?.message?.toLowerCase().includes('network') ||
        err?.name === 'TypeError';
      setError(
        isNetworkError
          ? 'Connection failed. Check your internet and try again.'
          : (err?.message || 'An unexpected error occurred during sign up.')
      );
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: googleError } = await signInWithGoogle();
      if (googleError) {
        setError(googleError.message);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      const isNetworkError =
        err?.message?.toLowerCase().includes('fetch') ||
        err?.message?.toLowerCase().includes('network') ||
        err?.name === 'TypeError';
      setError(
        isNetworkError
          ? 'Connection failed. Check your internet and try again.'
          : (err?.message || 'An unexpected error occurred during Google sign up.')
      );
      setGoogleLoading(false);
    }
  };

  const marketingUrl = import.meta.env.VITE_MARKETING_URL || 'https://getwagora.com';

  // Shared input class — identical to SignIn
  const inputClass =
    'w-full h-11 px-4 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] text-[var(--text-primary)]';

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Auth Card — same max-w and padding as SignIn */}
      <main className="w-full max-w-[400px] bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-6 sm:p-8 shadow-sm relative z-10">
        {/* Header — identical structure to SignIn */}
        <header className="mb-8 relative">
          <a
            href={marketingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 mb-6"
          >
            ← Back to getwagora.com
          </a>
          <h1 className="font-clash text-[28px] font-semibold text-[var(--text-primary)] leading-tight tracking-tight">
            Build your pipeline.
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Let Wagora run it.
          </p>
        </header>

        {/* Google Sign Up — above form, same as SignIn order */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-3 border border-[var(--border-subtle)] py-3 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer disabled:opacity-50 text-[var(--text-primary)] font-medium text-sm mb-6"
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
          Sign up with Google
        </button>

        {/* Divider */}
        <div className="relative mb-6 flex items-center">
          <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
          <span className="px-3 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">or</span>
          <div className="flex-grow border-t border-[var(--border-subtle)]"></div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-[var(--radius-md)] mb-6">
            {error}
          </div>
        )}

        {/* Form — same spacing system as SignIn (space-y-6) */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="fullName">
              FULL NAME
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Alex Operator"
              disabled={loading || googleLoading}
              autoComplete="name"
            />
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="companyName">
              COMPANY NAME
            </label>
            <input
              id="companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
              placeholder="Acme Corp"
              disabled={loading || googleLoading}
              autoComplete="organization"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="signup-email">
              EMAIL ADDRESS
            </label>
            <input
              id="signup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="operator@company.com"
              disabled={loading || googleLoading}
              autoComplete="email"
            />
          </div>

          {/* Password — with show/hide toggle */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="signup-password">
              PASSWORD
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-11`}
                placeholder="••••••••"
                disabled={loading || googleLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">Minimum 6 characters</p>
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-[var(--border-subtle)] bg-[var(--surface-card)] checked:bg-[var(--accent-primary)] checked:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all"
              />
              {/* Custom checkmark */}
              <svg
                className="pointer-events-none absolute inset-0 hidden h-4 w-4 peer-checked:block"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path d="M3.5 8l3 3 6-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <label htmlFor="terms" className="text-xs text-[var(--text-secondary)] leading-relaxed cursor-pointer">
              I agree to the{' '}
              <a
                href="https://getwagora.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--text-primary)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a
                href="https://getwagora.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--text-primary)] hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
            </label>
          </div>

          {/* CTA — identical class structure to SignIn submit button */}
          <button
            type="submit"
            disabled={loading || googleLoading || !agreedTerms}
            className="w-full h-12 bg-[var(--text-primary)] hover:bg-[var(--accent-primary-hover)] hover:text-white text-[var(--background-primary)] font-semibold text-sm rounded transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        {/* Footer inside card — identical to SignIn */}
        <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link to="/auth/signin" className="text-[var(--text-primary)] font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>

      {/* Aesthetic Footer — identical to SignIn */}
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
