import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, MessageSquare, Handshake, BarChart3, Phone, Megaphone, Target, Flag, Send, ArrowRight, DollarSign, Mail, X } from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useProspects } from '@/hooks/useProspects';
import { useConversations } from '@/hooks/useConversations';
import { useDeals } from '@/hooks/useDeals';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

const activityIcons: Record<string, typeof TrendingUp> = {
  prospect_found: Users,
  reply_received: MessageSquare,
  deal_closed: Handshake,
  campaign_status: Megaphone,
  outreach_sent: Send,
  call_booked: Phone,
  flagged: Flag,
};

const activityColors: Record<string, string> = {
  prospect_found: 'var(--accent-primary)',
  reply_received: 'var(--accent-primary)',
  deal_closed: 'var(--accent-primary)',
  campaign_status: 'var(--status-paused)',
  outreach_sent: '#818cf8',
  call_booked: '#818cf8',
  flagged: 'var(--destructive)',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // Fetch real data from hooks
  const { campaigns, loading: loadingCampaigns } = useCampaigns();
  const { prospects, loading: loadingProspects } = useProspects();
  const { conversations, loadingConversations } = useConversations();
  const { deals, loading: loadingDeals } = useDeals();
  const { activities, loading: loadingActivities } = useActivities(8);

  const loading = loadingCampaigns || loadingProspects || loadingConversations || loadingDeals || loadingActivities;

  // UX-09: Gmail connection banner — show when user has campaigns but none are Live
  // (this is exactly the state after onboarding: Draft campaign, no Gmail yet)
  const [gmailBannerDismissed, setGmailBannerDismissed] = useState(() => {
    try { return sessionStorage.getItem('wagora-gmail-banner-dismissed') === '1'; } catch { return false; }
  });
  const hasCampaigns = campaigns.length > 0;
  const hasLiveCampaign = campaigns.some(c => c.status === 'Live');
  const showGmailBanner = !loading && hasCampaigns && !hasLiveCampaign && !gmailBannerDismissed;

  const dismissGmailBanner = () => {
    setGmailBannerDismissed(true);
    try { sessionStorage.setItem('wagora-gmail-banner-dismissed', '1'); } catch { /* ignore */ }
  };

  // Aggregate metrics
  const totalCampaigns = campaigns.length;
  const liveCampaigns = campaigns.filter(c => c.status === 'Live').length;
  
  const totalProspects = prospects.length;
  
  const activeConvs = conversations.filter(c => c.status !== 'Closed').length;
  const unreadConvs = conversations.filter(c => c.unread).length;
  
  const closedDeals = deals.filter(d => d.status === 'Payment confirmed' || d.status === 'Complete');
  const closedDealsCount = closedDeals.length;
  
  const revenueClosed = closedDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);

  // Calculate reply rate (prospects who replied / total prospects with outreach sent)
  const contactedProspects = prospects.filter(p => p.status !== 'New').length;
  const repliedProspects = prospects.filter(p => p.status === 'Replied' || p.status === 'Call booked' || p.status === 'Closed').length;
  const replyRate = contactedProspects > 0 ? Math.round((repliedProspects / contactedProspects) * 100) : 0;

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(val);
  };

  const metrics = [
    { label: 'Live Campaigns', value: liveCampaigns.toString(), trend: `${totalCampaigns} total`, icon: Megaphone },
    { label: 'Total Prospects', value: totalProspects.toLocaleString(), trend: contactedProspects > 0 ? `${contactedProspects} reached` : 'No outreach yet', icon: Users },
    { label: 'Active Chats', value: activeConvs.toString(), trend: unreadConvs > 0 ? `${unreadConvs} unread` : 'All read', icon: MessageSquare },
    { label: 'Reply Rate', value: `${replyRate}%`, trend: contactedProspects > 0 ? `${repliedProspects} replies` : 'No responses', icon: Target },
    { label: 'Deals Closed', value: closedDealsCount.toString(), trend: 'This month', icon: Handshake },
    { label: 'Value Closed', value: formatCurrency(revenueClosed), trend: 'Won pipeline', icon: DollarSign },
  ];

  if (loading) {
    return (
      <div className="p-4 sm:p-8 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="space-y-2">
            <div className="w-48 h-8 bg-[var(--surface-elevated)] rounded-[var(--radius-md)] animate-pulse" />
            <div className="w-64 h-4 bg-[var(--surface-elevated)] rounded-[var(--radius-sm)] animate-pulse" />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none w-32 h-10 bg-[var(--surface-elevated)] rounded-[var(--radius-md)] animate-pulse" />
            <div className="flex-1 sm:flex-none w-32 h-10 bg-[var(--surface-elevated)] rounded-[var(--radius-md)] animate-pulse" />
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <div className="w-16 h-3 bg-[var(--surface-elevated)] rounded animate-pulse" />
                <div className="w-5 h-5 bg-[var(--surface-elevated)] rounded-full animate-pulse" />
              </div>
              <div className="w-12 h-6 bg-[var(--surface-elevated)] rounded animate-pulse mt-4" />
            </div>
          ))}
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] h-20">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-24 h-4 bg-[var(--surface-elevated)] rounded animate-pulse" />
                <div className="w-36 h-3 bg-[var(--surface-elevated)] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Activity Feed Skeleton */}
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="w-24 h-5 bg-[var(--surface-elevated)] rounded animate-pulse" />
            <div className="w-16 h-3 bg-[var(--surface-elevated)] rounded animate-pulse" />
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <div className="w-7 h-7 rounded-full bg-[var(--surface-elevated)] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-[var(--surface-elevated)] rounded animate-pulse" />
                  <div className="w-1/4 h-3 bg-[var(--surface-elevated)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Welcome Card for new users */}
      {totalCampaigns === 0 && (
        <div className="bg-[var(--surface-card)] border-2 border-[var(--accent-primary)]/30 p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,var(--color-primary)_0%,transparent_40%)] opacity-5" />
          <div className="space-y-1.5 relative z-10">
            <h2 className="font-clash text-headline-sm font-bold text-token-primary">
              Welcome to Wagora, {profile?.full_name?.split(' ')[0] || 'Sales Builder'}!
            </h2>
            <p className="text-sm text-token-secondary max-w-xl">
              Your autonomous sales workspace is initialized and ready. Launch your first outreach campaign using our step-by-step AI campaign setup.
            </p>
          </div>
          <button
            onClick={() => navigate('/ai-setup')}
            className="flex items-center gap-2 bg-token-primary text-[var(--surface-card)] px-5 py-2.5 rounded-[var(--radius-md)] font-bold text-sm hover:opacity-90 transition-all shrink-0 z-10"
          >
            Create first campaign with AI
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* UX-09: Gmail connection banner — critical next step after onboarding */}
      {showGmailBanner && (
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 bg-[var(--surface-card)] border border-amber-500/30 rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] overflow-hidden">
          {/* Subtle amber glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(245,158,11,0.06)_0%,transparent_60%)] pointer-events-none" />
          <div className="flex items-start gap-3 relative z-10">
            <div className="w-9 h-9 rounded-[var(--radius-md)] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Mail size={16} className="text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Connect Gmail to activate your campaign</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-lg">
                Your campaign is saved as a draft. Connect your Gmail account in Settings › Platforms to start sending outreach.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 relative z-10 w-full sm:w-auto">
            <button
              onClick={() => navigate('/settings?tab=platforms')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-[var(--radius-md)] transition-colors"
            >
              <Mail size={14} /> Connect Gmail
            </button>
            <button
              onClick={dismissGmailBanner}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] rounded-[var(--radius-md)] transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Here is where things stand.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/analytics')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] hover:bg-[var(--surface-card)] transition-colors"
          >
            <BarChart3 size={15} />
            View reports
          </button>
          <button
            onClick={() => navigate('/ai-setup')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-white px-4 py-2 text-sm font-bold rounded-[var(--radius-md)] hover:bg-[var(--accent-primary-hover)] transition-colors"
          >
            <Megaphone size={15} />
            New campaign
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div key={i} className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
              <div className="flex items-center gap-2 text-[var(--text-secondary)] mb-3">
                <Icon size={14} />
                <span className="text-[10px] uppercase tracking-wider font-semibold">{metric.label}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="font-clash text-xl font-bold text-[var(--text-primary)] leading-none">{metric.value}</span>
                <span className="text-[9px] font-bold text-[var(--text-muted)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded truncate max-w-[80px]">
                  {metric.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'New Campaign (AI)', desc: 'Launch a campaign using natural language', path: '/ai-setup', icon: Megaphone },
          { label: 'View Prospects', desc: 'Manage your sales lead pipeline', path: '/prospects', icon: Users },
          { label: 'View Conversations', desc: 'Interact with AI-engaged leads', path: '/conversations', icon: MessageSquare },
        ].map((action, i) => (
          <button
            key={i}
            onClick={() => navigate(action.path)}
            className="flex items-center gap-3 p-4 bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] hover:border-[var(--accent-primary)] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] flex items-center justify-center shrink-0 group-hover:bg-[rgba(0,200,150,0.1)] transition-colors">
              <action.icon size={18} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{action.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{action.desc}</p>
            </div>
            <ArrowRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors shrink-0" />
          </button>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="font-clash font-bold text-[var(--text-primary)]">Activity</h3>
          <button onClick={() => navigate('/notifications')} className="text-xs font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors">
            View all
          </button>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--text-muted)]">
              No recent activity. Launch campaigns to start seeing outreach events.
            </div>
          ) : (
            activities.map(a => {
              const Icon = activityIcons[a.type] || TrendingUp;
              const color = activityColors[a.type] || 'var(--text-muted)';
              return (
                <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
                  >
                    <Icon size={13} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">{a.message}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {new Date(a.created_at).toLocaleDateString()} at {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {a.meta && (
                    <span className="text-xs font-bold font-mono text-[var(--accent-primary)] bg-[rgba(0,200,150,0.1)] px-2 py-0.5 rounded shrink-0">
                      {a.meta}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
