import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2 } from 'lucide-react';
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
      <main className="w-full max-w-[400px] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 rounded-xl shadow-sm relative z-10 text-center space-y-6">
        <div className="flex justify-center">
          <CheckCircle2 size={48} className="text-[var(--accent-primary)] animate-pulse" />
        </div>
        <div>
          <h2 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Check your email</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
            We have sent password reset instructions to <strong className="text-[var(--text-primary)]">{email}</strong>.
          </p>
        </div>
        <Link 
          to="/auth/signin" 
          className="w-full h-12 bg-[var(--text-primary)] hover:bg-[var(--accent-primary-hover)] hover:text-white text-[var(--background-primary)] font-semibold text-sm rounded transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer"
        >
          Back to Sign In
        </Link>
      </main>
    );
  }

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Auth Card */}
      <main className="w-full max-w-[400px] bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-8 shadow-sm relative z-10">
        <header className="mb-8 text-center">
          <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Reset Password</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">We'll send you a link to reset your password.</p>
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
              placeholder="you@company.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <button 
            type="submit"
            disabled={loading || !email}
            className="w-full h-12 bg-[var(--text-primary)] hover:bg-[var(--accent-primary-hover)] hover:text-white text-[var(--background-primary)] font-semibold text-sm rounded transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Sending Link...
              </span>
            ) : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Remembered your password?{' '}
            <Link to="/auth/signin" className="font-semibold text-[var(--text-primary)] hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
