import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await resetPassword(email);
      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle2 size={48} className="text-[var(--accent-primary)] animate-pulse" />
        </div>
        <div>
          <h2 className="font-clash text-headline-md font-bold text-token-primary">Check your email</h2>
          <p className="text-token-secondary mt-2">
            We have sent password reset instructions to <strong className="text-token-primary">{email}</strong>.
          </p>
        </div>
        <Link 
          to="/auth/signin" 
          className="w-full flex items-center justify-center gap-2 bg-token-primary text-[var(--surface-card)] py-2.5 rounded-[var(--radius-md)] font-bold hover:bg-opacity-90 transition-all mt-6"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-clash text-headline-md font-bold text-token-primary">Reset Password</h2>
        <p className="text-token-secondary mt-1">We'll send you a link to reset your password.</p>
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
              disabled={loading}
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading || !email}
          className="w-full flex items-center justify-center gap-2 bg-token-primary text-[var(--surface-card)] py-2.5 rounded-[var(--radius-md)] font-bold hover:bg-opacity-90 disabled:opacity-50 transition-all mt-6"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Sending Link...
            </>
          ) : (
            <>
              Send Reset Link
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-token-secondary">
        Remembered your password?{' '}
        <Link to="/auth/signin" className="font-bold text-token-accent hover:text-[var(--accent-primary-hover)]">
          Sign In
        </Link>
      </p>
    </div>
  );
}
