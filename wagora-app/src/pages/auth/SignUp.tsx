import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, User, Building, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
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
        setError(signUpError.message);
        setLoading(false);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred during sign up.');
      setLoading(false);
    }
  };

  const marketingUrl = import.meta.env.VITE_MARKETING_URL || 'http://localhost:5173';

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle2 size={48} className="text-[var(--accent-primary)] animate-pulse" />
        </div>
        <div>
          <h2 className="font-clash text-headline-md font-bold text-token-primary">Check your email</h2>
          <p className="text-token-secondary mt-2">
            We have sent a verification link to <strong className="text-token-primary">{email}</strong>. 
            Please check your inbox and verify your email to complete registration.
          </p>
        </div>
        <Link 
          to="/auth/signin" 
          className="w-full flex items-center justify-center gap-2 bg-token-primary text-[var(--surface-card)] py-2.5 rounded-[var(--radius-md)] font-bold hover:bg-opacity-90 transition-all mt-6"
        >
          Proceed to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center relative">
        <a 
          href={marketingUrl} 
          className="absolute -top-16 left-0 text-xs font-medium text-token-secondary hover:text-token-primary transition-colors flex items-center gap-1"
        >
          ← Back to wagora.com
        </a>
        <h2 className="font-clash text-headline-md font-bold text-token-primary">Create Account</h2>
        <p className="text-token-secondary mt-1">
          {planParam !== 'free' 
            ? `Initialize your Wagora ${planParam.charAt(0).toUpperCase() + planParam.slice(1)} workspace.` 
            : 'Initialize your autonomous sales engine.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-[var(--radius-md)]">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-token-primary mb-1">Full Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User size={16} className="text-token-muted" />
            </div>
            <input 
              type="text" 
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-token-primary placeholder-token-muted focus:outline-none focus:ring-2 focus:ring-token-accent focus:border-transparent transition-all"
              placeholder="John Doe"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-token-primary mb-1">Work Email</label>
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
              placeholder="john@company.com"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-token-primary mb-1">Company Name</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Building size={16} className="text-token-muted" />
            </div>
            <input 
              type="text" 
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-token-primary placeholder-token-muted focus:outline-none focus:ring-2 focus:ring-token-accent focus:border-transparent transition-all"
              placeholder="Acme Corp"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-token-primary mb-1">Password</label>
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
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 pt-1">
          <input 
            type="checkbox" 
            id="terms"
            checked={agreedTerms}
            onChange={(e) => setAgreedTerms(e.target.checked)}
            className="mt-1 border border-[var(--border-default)] rounded-[var(--radius-sm)] focus:ring-token-accent bg-[var(--surface-primary)] h-4 w-4"
          />
          <label htmlFor="terms" className="text-xs text-token-secondary leading-relaxed">
            I agree to the <a href="#" className="font-semibold text-token-accent hover:underline">Terms of Service</a> and <a href="#" className="font-semibold text-token-accent hover:underline">Privacy Policy</a>.
          </label>
        </div>

        <button 
          type="submit"
          disabled={loading || !agreedTerms}
          className="w-full flex items-center justify-center gap-2 bg-token-primary text-[var(--surface-card)] py-2.5 rounded-[var(--radius-md)] font-bold hover:bg-opacity-90 disabled:opacity-50 transition-all mt-6"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              Create Account
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-token-secondary">
        Already have an account?{' '}
        <Link to="/auth/signin" className="font-bold text-token-accent hover:text-[var(--accent-primary-hover)]">
          Sign In
        </Link>
      </p>
    </div>
  );
}
