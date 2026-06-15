import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyEmail() {
  const { user, isEmailVerified } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const email = location.state?.email || user?.email || '';

  useEffect(() => {
    if (isEmailVerified) {
      navigate('/onboarding', { replace: true });
    }
  }, [isEmailVerified, navigate]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendStatus('idle');
    setErrorMessage('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/signin`
        }
      });

      if (error) {
        setResendStatus('error');
        setErrorMessage(error.message);
      } else {
        setResendStatus('success');
      }
    } catch (err: any) {
      setResendStatus('error');
      setErrorMessage(err?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Auth Card */}
      <main className="w-full max-w-[400px] bg-[var(--surface-card)] border border-[var(--border-subtle)] p-8 rounded-xl shadow-sm relative z-10 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[var(--background-secondary)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent-primary)]">
            <Mail size={32} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Verify your email</h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
            We sent a verification link to <strong className="text-[var(--text-primary)]">{email || 'your email'}</strong>. 
            Please click it to activate your account.
          </p>
        </div>

        {resendStatus === 'success' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm p-3 rounded-[var(--radius-md)] flex items-center justify-center gap-2">
            <CheckCircle2 size={16} />
            Verification email resent successfully!
          </div>
        )}

        {resendStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-[var(--radius-md)]">
            {errorMessage}
          </div>
        )}

        <div className="pt-4 space-y-4">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || !email}
            className="w-full h-12 bg-[var(--text-primary)] hover:bg-[var(--accent-primary-hover)] hover:text-white text-[var(--background-primary)] font-semibold text-sm rounded transition-all active:scale-[0.98] flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {resending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Resending...
              </span>
            ) : "Resend verification email"}
          </button>

          <div className="pt-4 border-t border-[var(--border-subtle)] text-center">
            <Link to="/auth/signin" className="text-sm font-semibold text-[var(--text-primary)] hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
