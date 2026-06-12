import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, RefreshCw, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
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
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-primary)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent-primary)]">
          <Mail size={32} />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-clash text-headline-md font-bold text-token-primary">Verify your email</h2>
        <p className="text-token-secondary max-w-sm mx-auto">
          We sent a verification link to <strong className="text-token-primary">{email || 'your email'}</strong>. 
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

      <div className="pt-4 space-y-3">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || !email}
          className="w-full flex items-center justify-center gap-2 bg-token-primary text-[var(--surface-card)] py-2.5 rounded-[var(--radius-md)] font-bold hover:bg-opacity-90 disabled:opacity-50 transition-all"
        >
          {resending ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Resending...
            </>
          ) : (
            <>
              Resend verification email
              <RefreshCw size={16} />
            </>
          )}
        </button>

        <div className="flex justify-center gap-4 text-sm mt-4">
          <Link to="/auth/signin" className="font-bold text-token-accent hover:text-[var(--accent-primary-hover)]">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
