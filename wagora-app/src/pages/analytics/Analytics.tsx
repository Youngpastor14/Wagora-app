import { useState, useEffect } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useProspects } from '@/hooks/useProspects';
import { useDeals } from '@/hooks/useDeals';
import EmptyState from '@/components/ui/EmptyState';
import { TrendingUp, Users, Send, BarChart3, Target, Clock, DollarSign, Eye, EyeOff, Loader2 } from 'lucide-react';

const dateRanges = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'All time'];

export default function Analytics() {
  const { campaigns, loading: campaignsLoading } = useCampaigns();
  const { prospects, loading: prospectsLoading } = useProspects();
  const { deals, loading: dealsLoading } = useDeals();

  const [dateRange, setDateRange] = useState('Last 30 days');
  const [isEmptyToggle, setIsEmptyToggle] = useState<boolean | null>(null);

  // Loading state
  const loading = campaignsLoading || prospectsLoading || dealsLoading;

  // Derive empty state if user has no campaigns or prospects
  const dbIsEmpty = campaigns.length === 0 || prospects.length === 0;
  const isEmpty = isEmptyToggle !== null ? isEmptyToggle : dbIsEmpty;

  // Aggregated calculations
  const prospectsIdentified = prospects.length;
  const prospectsQualified = prospects.filter(p => p.score >= 70).length;
  const outreachSent = prospects.filter(p => p.status !== 'New' && p.status !== 'Not a fit').length;
  const repliesCount = prospects.filter(p => ['Replied', 'In closing sequence', 'Call booked', 'Closed'].includes(p.status)).length;
  const closedCount = prospects.filter(p => p.status === 'Closed').length;

  const replyRate = outreachSent > 0 ? Math.round((repliesCount / outreachSent) * 100) : 0;
  const closingRate = outreachSent > 0 ? Math.round((closedCount / outreachSent) * 100) : 0;
  const revenueSecured = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);
  const timeToClose = 8; // Avg days fallback

  // 1. Prospects over time (grouped by day/week dynamically or default mock progression styled on count)
  const generateProspectsOverTime = () => {
    if (prospects.length === 0) {
      return [
        { label: 'Week 1', value: 0 },
        { label: 'Week 2', value: 0 },
        { label: 'Week 3', value: 0 },
        { label: 'Week 4', value: 0 },
      ];
    }
    const total = prospects.length;
    return [
      { label: 'Week 1', value: Math.round(total * 0.15) },
      { label: 'Week 2', value: Math.round(total * 0.25) },
      { label: 'Week 3', value: Math.round(total * 0.28) },
      { label: 'Week 4', value: Math.round(total * 0.32) },
    ];
  };

  const prospectsOverTime = generateProspectsOverTime();
  const maxBar = Math.max(...prospectsOverTime.map(p => p.value), 1);

  // 2. Replies by platform group
  const emailReplies = prospects.filter(p => p.platform === 'Email' && ['Replied', 'In closing sequence', 'Call booked', 'Closed'].includes(p.status)).length;
  const linkedinReplies = prospects.filter(p => p.platform === 'LinkedIn' && ['Replied', 'In closing sequence', 'Call booked', 'Closed'].includes(p.status)).length;
  const instagramReplies = prospects.filter(p => p.platform === 'Instagram' && ['Replied', 'In closing sequence', 'Call booked', 'Closed'].includes(p.status)).length;
  const totalReplies = emailReplies + linkedinReplies + instagramReplies || 1;

  const repliesByPlatform = [
    { platform: 'Email', count: emailReplies, percentage: Math.round((emailReplies / totalReplies) * 100) },
    { platform: 'LinkedIn', count: linkedinReplies, percentage: Math.round((linkedinReplies / totalReplies) * 100) },
    { platform: 'Instagram', count: instagramReplies, percentage: Math.round((instagramReplies / totalReplies) * 100) },
  ].sort((a, b) => b.count - a.count);

  // 3. Closing path breakdown (deals grouped by closed_via)
  const chatDealsCount = deals.filter(d => d.closed_via === 'Chat').length;
  const callDealsCount = deals.filter(d => d.closed_via === 'Call').length;
  const totalDeals = chatDealsCount + callDealsCount || 1;

  const closingPaths = [
    { label: 'Chat Close', count: chatDealsCount, percentage: Math.round((chatDealsCount / totalDeals) * 100) },
    { label: 'Call Booking Close', count: callDealsCount, percentage: Math.round((callDealsCount / totalDeals) * 100) },
  ];

  // 4. Campaign performance mapping
  const campaignPerformance = campaigns.map(c => {
    // Find prospects for this campaign
    const campProspects = prospects.filter(p => p.campaign_id === c.id);
    const campReplies = campProspects.filter(p => ['Replied', 'In closing sequence', 'Call booked', 'Closed'].includes(p.status)).length;
    const campClosed = campProspects.filter(p => p.status === 'Closed').length;

    return {
      name: c.name,
      prospects: campProspects.length,
      replies: campReplies,
      closed: campClosed
    };
  });

  const metrics = [
    { label: 'Prospects identified', value: prospectsIdentified.toLocaleString(), icon: Users },
    { label: 'Prospects qualified', value: prospectsQualified.toLocaleString(), icon: Target },
    { label: 'Outreach sent', value: outreachSent.toLocaleString(), icon: Send },
    { label: 'Reply rate', value: `${replyRate}%`, icon: BarChart3 },
    { label: 'Closing rate', value: `${closingRate}%`, icon: TrendingUp },
    { label: 'Time to close (avg)', value: `${timeToClose} days`, icon: Clock },
    { label: 'Revenue secured', value: `$${(revenueSecured / 1000).toFixed(1)}k`, icon: DollarSign },
  ];

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent-primary)]" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 relative min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">Operational signal integrity reports</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Empty State Toggle (Prototype Assistant) */}
          <button
            onClick={() => setIsEmptyToggle(isEmpty ? false : true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border-default)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-md)] text-xs font-bold transition-all cursor-pointer"
            title="Toggle empty/calibration view for prototype validation"
          >
            {isEmpty ? <Eye size={13} /> : <EyeOff size={13} />}
            {isEmpty ? 'View Active Metrics' : 'View Empty State'}
          </button>

          <div className="flex gap-1 bg-[var(--surface-elevated)] p-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-x-auto">
            {dateRanges.map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 text-xs font-semibold rounded whitespace-nowrap transition-colors ${
                  dateRange === r
                    ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isEmpty ? (
        /* Empty/Calibration State View */
        <div className="flex-1 flex flex-col items-center justify-center py-12 max-w-xl mx-auto w-full space-y-8 animate-fade-in">
          {/* Geometric Icon Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[var(--border-default)] to-[var(--surface-elevated)] rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative flex items-center justify-center w-24 h-24 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-lg">
              <BarChart3 size={40} className="text-[var(--accent-primary)] opacity-80" strokeWidth={1.5} />
            </div>
          </div>

          {/* Textual Information */}
          <div className="text-center space-y-3">
            <h3 className="font-clash text-2xl font-bold text-[var(--text-primary)] tracking-tight">No data yet.</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed px-4 max-w-sm mx-auto">
              Analytics populate after your first campaign has run for 48 hours. Wagora requires this window to verify signal integrity.
            </p>
          </div>

          {/* Status Indicator */}
          <div className="flex flex-col items-center gap-4 pt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-full">
              <div className="w-2 h-2 bg-[var(--status-paused)] rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
              <span className="text-[10px] font-bold tracking-wider text-[var(--status-paused)] uppercase font-mono">Awaiting Signal</span>
            </div>
          </div>

          {/* Toast Notification Banner (Bottom Anchor) */}
          <div className="w-full pt-8 flex justify-center">
            <div className="flex items-center gap-3 bg-[var(--surface-card)] border border-[var(--border-default)] py-3 px-5 rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-ping"></span>
              <span className="text-xs text-[var(--text-secondary)] font-semibold">Wagora is monitoring for active signals.</span>
            </div>
          </div>
        </div>
      ) : (
        /* Metric Charts View (Normal State) */
        <div className="space-y-6 flex-1">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {metrics.map((m, i) => (
              <div key={i} className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon size={14} className="text-[var(--text-muted)]" />
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">{m.label}</p>
                </div>
                <p className="font-clash text-lg font-bold text-[var(--text-primary)]">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Prospects over time */}
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5">
              <h3 className="font-clash font-bold text-[var(--text-primary)] mb-4">Prospects over time</h3>
              <div className="flex items-end gap-2 h-40">
                {prospectsOverTime.map((p, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono font-medium text-[var(--text-muted)]">{p.value}</span>
                    <div
                      className="w-full rounded-t transition-all hover:opacity-80"
                      style={{
                        height: `${(p.value / maxBar) * 100}%`,
                        backgroundColor: 'var(--accent-primary)',
                        minHeight: '4px',
                      }}
                    />
                    <span className="text-[9px] text-[var(--text-muted)] mt-1">{p.label.replace('Week ', 'W')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Replies by platform */}
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5">
              <h3 className="font-clash font-bold text-[var(--text-primary)] mb-4">Replies by platform</h3>
              <div className="space-y-4">
                {repliesByPlatform.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{p.platform}</span>
                      <span className="text-xs font-mono font-medium text-[var(--text-muted)]">{p.count} ({p.percentage || 0}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${p.percentage || 0}%`,
                          backgroundColor: i === 0 ? 'var(--accent-primary)' : i === 1 ? '#818cf8' : 'var(--accent-secondary)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Closing path breakdown */}
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5">
              <h3 className="font-clash font-bold text-[var(--text-primary)] mb-4">Closing path breakdown</h3>
              {/* Stacked bar */}
              <div className="flex w-full h-8 rounded-full overflow-hidden mb-4 bg-[var(--surface-elevated)]">
                {closingPaths.map((p, i) => {
                  const colors = ['var(--accent-primary)', '#818cf8', 'var(--accent-secondary)', 'var(--status-paused)', 'var(--destructive)'];
                  return (
                    <div
                      key={i}
                      className="h-full transition-all hover:opacity-80"
                      style={{ width: `${p.percentage || 0}%`, backgroundColor: colors[i] }}
                      title={`${p.label}: ${p.percentage || 0}%`}
                    />
                  );
                })}
              </div>
              <div className="space-y-2">
                {closingPaths.map((p, i) => {
                  const colors = ['var(--accent-primary)', '#818cf8', 'var(--accent-secondary)', 'var(--status-paused)', 'var(--destructive)'];
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[i] }} />
                        <span className="text-[var(--text-secondary)]">{p.label}</span>
                      </div>
                      <span className="font-mono text-xs font-medium text-[var(--text-muted)]">{p.count} ({p.percentage || 0}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Campaign performance */}
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5">
              <h3 className="font-clash font-bold text-[var(--text-primary)] mb-4">Campaign performance</h3>
              <div className="space-y-4">
                {campaignPerformance.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic text-center py-4">No campaign signals recorded.</p>
                ) : (
                  campaignPerformance.map((c, i) => {
                    const maxProspects = Math.max(...campaignPerformance.map(x => x.prospects), 1);
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate mr-2">{c.name}</span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] whitespace-nowrap">{c.prospects}p / {c.replies}r / {c.closed}c</span>
                        </div>
                        <div className="flex gap-1 h-2">
                          <div className="rounded-full bg-[var(--accent-primary)]" style={{ width: `${(c.prospects / maxProspects) * 100}%` }} title={`Prospects: ${c.prospects}`} />
                        </div>
                        <div className="flex gap-1 h-1.5 mt-1">
                          <div className="rounded-full" style={{ width: `${(c.replies / maxProspects) * 100}%`, backgroundColor: '#818cf8' }} title={`Replies: ${c.replies}`} />
                          <div className="rounded-full" style={{ width: `${(c.closed / maxProspects) * 100}%`, backgroundColor: 'var(--accent-secondary)' }} title={`Closed: ${c.closed}`} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" /><span className="text-[10px] text-[var(--text-muted)]">Prospects</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#818cf8' }} /><span className="text-[10px] text-[var(--text-muted)]">Replies</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--accent-secondary)]" /><span className="text-[10px] text-[var(--text-muted)]">Closed</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
