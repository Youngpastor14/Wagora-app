import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUp() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

    setLoading(true);
    setError(null);

    try {
      // Sign up the user via Supabase
      const { error: signUpError } = await signUp(email, password, fullName, companyName);
      
      if (signUpError) {
        // User-friendly error messages
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
        // Redirect to verify-email page with email pre-filled so they can resend
        navigate('/auth/verify-email', {
          state: { email },
          replace: true,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during sign up.');
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
      setError(err?.message || 'An unexpected error occurred during Google sign up.');
      setGoogleLoading(false);
    }
  };

  const marketingUrl = import.meta.env.VITE_MARKETING_URL || 'http://localhost:5173';

  if (success) {
    return (
      <main className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 rounded-xl shadow-sm relative z-10 text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 size={48} className="text-[var(--accent-primary)] animate-pulse" />
        </div>
        <div>
          <h2 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Check your email</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
            We have sent a verification link to <strong className="text-[var(--text-primary)]">{email}</strong>. 
            Please check your inbox and verify your email to complete registration.
          </p>
        </div>
        <Link 
          to="/auth/signin" 
          className="w-full h-12 bg-[var(--text-primary)] hover:bg-[var(--accent-primary-hover)] hover:text-white text-[var(--background-primary)] font-semibold text-sm rounded transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer"
        >
          Proceed to Sign In
        </Link>
      </main>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-6 animate-fade-in">
      {/* Auth Card */}
      <main className="w-full max-w-md bg-[var(--surface-card)] border border-[var(--border-subtle)] p-6 rounded-xl shadow-sm relative z-10">
        <header className="mb-6 relative">
          <a 
            href={marketingUrl} 
            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 mb-6"
          >
            ← Back to wagora.com
          </a>
          <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            Build your pipeline.
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Let Wagora run it.
          </p>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-[var(--radius-md)] mb-6">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="fullName">
              Full name
            </label>
            <input 
              id="fullName"
              type="text" 
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--background-primary)] border border-[var(--border-default)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              placeholder="Alex Operator"
              disabled={loading || googleLoading}
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="email">
              Email
            </label>
            <input 
              id="email"
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--background-primary)] border border-[var(--border-default)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              placeholder="alex@operator.io"
              disabled={loading || googleLoading}
              autoComplete="email"
            />
          </div>

          {/* Company Name */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="companyName">
              Company Name
            </label>
            <input 
              id="companyName"
              type="text" 
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--background-primary)] border border-[var(--border-default)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              placeholder="Acme Corp"
              disabled={loading || googleLoading}
              autoComplete="organization"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase" htmlFor="password">
              Password
            </label>
            <input 
              id="password"
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-4 bg-[var(--background-primary)] border border-[var(--border-default)] rounded-lg text-sm focus:ring-1 focus:ring-[var(--accent-primary)] focus:outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]"
              placeholder="••••••••"
              disabled={loading || googleLoading}
              autoComplete="new-password"
            />
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-2 pt-1">
            <input 
              type="checkbox" 
              id="terms"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-1 border border-[var(--border-default)] rounded-[var(--radius-sm)] focus:ring-[var(--accent-primary)] bg-[var(--background-primary)] h-4 w-4 shrink-0 cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-[var(--text-secondary)] leading-relaxed cursor-pointer select-none">
              I agree to the <a href="#" className="font-semibold text-[var(--text-primary)] hover:underline">Terms of Service</a> and <a href="#" className="font-semibold text-[var(--text-primary)] hover:underline">Privacy Policy</a>.
            </label>
          </div>

          {/* CTA */}
          <button 
            type="submit"
            disabled={loading || googleLoading || !agreedTerms}
            className="w-full bg-[var(--text-primary)] text-[var(--background-primary)] font-semibold py-3.5 rounded-lg hover:opacity-90 transition-opacity flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 mt-6"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <span className="text-xs uppercase tracking-wider font-bold">Get started</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
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
          onClick={handleGoogleSignUp}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-3 border border-[var(--border-subtle)] py-3 rounded-lg hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer disabled:opacity-50 text-[var(--text-primary)] font-medium text-sm"
        >
          {googleLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <img 
              alt="Google" 
              className="w-4 h-4 grayscale contrast-200" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCX1dMK2fPbELfME1ozQ3jkE0_jN4vYxOmUVqFJXRu2_hv-8D1KZ_GejEhrDuPqJ4cj5o-0jBM98ouf9degIzeQWaBQS9MzbFhBIdpa0lVsvCss8Zgda_WqSQ3lA2aKcXfpa-lRi5g_AYzeoMvu2-4gCnQs68Pd7GKMMOGisJrOrSzVCml5Co79ccIpzUgnUbqeueWztLQXM5i4TiZJL-ZSjT7NpxSRWxCz5CD_msvC0D9bo7tWvYgo7Kh0bRdXQxsL02gV8-Z_3SY"
            />
          )}
          <span className="text-sm font-medium">Sign up with Google</span>
        </button>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Already have an account?{' '}
            <Link to="/auth/signin" className="font-semibold text-[var(--text-primary)] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
