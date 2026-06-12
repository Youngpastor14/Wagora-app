import { useState } from 'react';
import { Crown, Check, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

const plans = [
  { id: 'free', name: 'Free (Trial)', price: '$0', period: '/mo', features: ['1 campaign', '50 prospects/mo', 'Email only', '5 conversations'] },
  { id: 'pro', name: 'Pro', price: '$29', period: '/mo', features: ['3 campaigns', '200 prospects/mo', 'Email + LinkedIn', '50 conversations'] },
  { id: 'growth', name: 'Growth', price: '$79', period: '/mo', features: ['10 campaigns', '1,000 prospects/mo', 'All platforms', 'Unlimited conversations', 'Analytics'] },
  { id: 'agency', name: 'Agency', price: '$199', period: '/mo', features: ['Unlimited campaigns', '5,000 prospects/mo', 'All platforms', 'Unlimited everything', 'Priority support', 'Team seats'] },
];

export default function BillingSettings() {
  const { toast } = useToast();
  const { profile, plan, trialEndsAt, refreshProfile } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const activePlanId = plan || 'free';
  const activePlan = plans.find(p => p.id === activePlanId) || plans[0];

  const handlePlanChange = async (planId: string) => {
    if (!profile) return;
    setLoadingPlan(planId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ plan: planId as any })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      toast(`Successfully updated plan to ${planId.toUpperCase()}.`, { type: 'success' });
    } catch (err: any) {
      toast(`Failed to update plan: ${err.message}`, { type: 'error' });
    } finally {
      setLoadingPlan(null);
    }
  };

  const getTrialDaysLeft = () => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const trialDaysLeft = getTrialDaysLeft();

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-clash font-bold text-[var(--text-primary)]">Billing Plan</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Modify your subscription tier and view usage parameters</p>
          </div>
          {activePlanId === 'free' ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] shrink-0 self-start sm:self-auto">
              <Calendar size={14} className="text-[var(--status-paused)]" />
              <span className="text-xs font-bold text-[var(--text-primary)]">{trialDaysLeft} trial days remaining</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(232,255,74,0.15)] border border-[rgba(232,255,74,0.3)] shrink-0 self-start sm:self-auto">
              <Crown size={14} className="text-[var(--accent-secondary)]" />
              <span className="text-xs font-bold text-[var(--text-primary)]">Premium member</span>
            </div>
          )}
        </div>
        <div className="flex items-end gap-1 mb-1">
          <span className="font-clash text-3xl font-bold text-[var(--text-primary)]">{activePlan.name}</span>
          <span className="text-sm text-[var(--text-muted)] mb-1 ml-2">{activePlan.price}{activePlan.period}</span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mt-2">
          {activePlanId === 'free' 
            ? 'Running on the initial free tier. Upgrade below to connect LinkedIn and Instagram platforms.' 
            : `Your workspace has access to the full ${activePlan.name} features.`}
        </p>
      </div>

      {/* Plan Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(p => {
          const isCurrent = p.id === activePlanId;
          const isLoading = loadingPlan === p.id;
          return (
            <div
              key={p.id}
              className={`bg-[var(--surface-card)] rounded-[var(--radius-lg)] border p-5 transition-all flex flex-col justify-between ${
                isCurrent
                  ? 'border-[var(--accent-primary)] shadow-[var(--shadow-elevated)] ring-1 ring-[var(--accent-primary)]'
                  : 'border-[var(--border-default)] shadow-[var(--shadow-card)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-clash font-bold text-[var(--text-primary)]">{p.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] bg-[rgba(0,200,150,0.1)] px-2 py-0.5 rounded-full">Current</span>
                  )}
                </div>
                <div className="flex items-end gap-0.5 mb-4">
                  <span className="font-clash text-2xl font-bold text-[var(--text-primary)]">{p.price}</span>
                  <span className="text-xs text-[var(--text-muted)] mb-1">{p.period}</span>
                </div>
                <ul className="space-y-2">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Check size={12} className="text-[var(--accent-primary)] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              {!isCurrent && (
                <button 
                  onClick={() => handlePlanChange(p.id)}
                  disabled={!!loadingPlan}
                  className="w-full mt-5 py-2 text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isLoading && <Loader2 size={12} className="animate-spin" />}
                  {p.id === 'free' ? 'Downgrade' : 'Select plan'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Billing History */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
        <div className="p-5 border-b border-[var(--border-subtle)]">
          <h3 className="font-clash font-bold text-[var(--text-primary)]">Billing history</h3>
        </div>
        <EmptyState headline="No invoices yet." body="" />
      </div>
    </div>
  );
}
