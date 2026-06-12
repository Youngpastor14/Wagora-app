import { useState } from 'react';
import { Mail, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

export default function VerificationBanner() {
  const { user, isEmailVerified } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Check 24-hour grace period
  const signupTime = user?.created_at ? new Date(user.created_at).getTime() : 0;
  const hoursElapsed = (Date.now() - signupTime) / (1000 * 60 * 60);
  const isWithinGracePeriod = hoursElapsed < 24;

  // Don't show if verified, dismissed (within grace), or no user
  if (!user || isEmailVerified || (dismissed && isWithinGracePeriod)) return null;

  const handleResend = async () => {
    if (!user.email) return;
    setResending(true);
    await supabase.auth.resend({ type: 'signup', email: user.email });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  };

  // After 24hrs — harder prompt (not dismissable)
  if (!isWithinGracePeriod) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Mail size={15} className="text-amber-500 shrink-0" />
            <p className="text-[13px] text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Please verify your email</span> to keep full access to Wagora. Check your inbox at <strong>{user.email}</strong>.
            </p>
          </div>
          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="shrink-0 flex items-center gap-1.5 text-[12px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors disabled:opacity-60"
          >
            {resent ? (
              <><CheckCircle2 size={13} /> Sent!</>
            ) : resending ? (
              <><RefreshCw size={13} className="animate-spin" /> Sending...</>
            ) : (
              <><RefreshCw size={13} /> Resend email</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Within 24hrs — gentle dismissable banner
  return (
    <div className="bg-[var(--accent-primary)]/8 border-b border-[var(--accent-primary)]/15 px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-[var(--accent-primary)] shrink-0" />
          <p className="text-[12.5px] text-[var(--text-secondary)]">
            Check your inbox to verify <strong>{user.email}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="text-[12px] font-semibold text-[var(--accent-primary)] hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {resent ? '✓ Sent' : resending ? 'Sending...' : 'Resend'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
