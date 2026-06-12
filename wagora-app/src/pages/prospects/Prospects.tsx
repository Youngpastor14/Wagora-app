import { useState } from 'react';
import { Search, ChevronRight, Check, X, Archive, RefreshCw, Clock, Send, Trash2, Globe, Mail, Camera, Loader2 } from 'lucide-react';
import { useProspects } from '@/hooks/useProspects';
import StatusBadge from '@/components/ui/StatusBadge';
import ScoreBadge from '@/components/ui/ScoreBadge';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

const filters = ['All', 'Qualified', 'Contacted', 'Replied', 'In closing', 'Closed', 'Not a fit'];

interface QueueItem {
  id: string;
  prospectName: string;
  prospectCompany: string;
  scheduledFor: string;
  messageContent: string;
  channel: 'Email' | 'LinkedIn' | 'Instagram';
  status: 'pending' | 'sent' | 'failed';
}

const initialQueue: QueueItem[] = [
  {
    id: 'q-1',
    prospectName: 'Lina Petrov',
    prospectCompany: 'HealthBridge',
    scheduledFor: 'Today at 2:30 PM',
    channel: 'LinkedIn',
    status: 'pending',
    messageContent: 'Hi Lina — HealthBridge\'s approach to virtual clinical care is very strong. We help healthcare organizations optimize patient sign-ups. Would you be open to a 10-minute audit?',
  },
  {
    id: 'q-2',
    prospectName: 'Fatima Al-Rashid',
    prospectCompany: 'Medina Consulting',
    scheduledFor: 'Tomorrow at 10:00 AM',
    channel: 'LinkedIn',
    status: 'pending',
    messageContent: 'Fatima — Medina Consulting\'s advisory expansion is impressive. We help advisory firms scale partner pipeline without increasing admin work.',
  },
];

const ChannelIcon = ({ channel }: { channel: string }) => {
  switch (channel?.toLowerCase()) {
    case 'linkedin': return <Globe size={13} />;
    case 'email': return <Mail size={13} />;
    case 'instagram': return <Camera size={13} />;
    default: return <Mail size={13} />;
  }
};

export default function Prospects() {
  const { toast } = useToast();
  const { prospects, loading, updateProspect, deleteProspect } = useProspects();
  
  const [queueList, setQueueList] = useState<QueueItem[]>(initialQueue);
  const [activeTab, setActiveTab] = useState<'prospects' | 'queue'>('prospects');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredProspects = prospects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.company && p.company.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    switch (activeFilter) {
      case 'Qualified': return p.score >= 70 || p.score >= 7; // supports both 100-scale and 10-scale
      case 'Contacted': return p.status === 'Outreach sent';
      case 'Replied': return p.status === 'Replied';
      case 'In closing': return p.status === 'In closing sequence' || p.status === 'Call booked';
      case 'Closed': return p.status === 'Closed';
      case 'Not a fit': return p.status === 'Not a fit';
      default: return true;
    }
  });

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSendNow = (id: string, name: string) => {
    setQueueList(prev => prev.filter(q => q.id !== id));
    toast(`Outreach sent to ${name}. Conversation thread active.`, { type: 'success' });
  };

  const handleCancelQueue = (id: string) => {
    setQueueList(prev => prev.filter(q => q.id !== id));
    toast('Outreach message cancelled.', { type: 'success' });
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="w-32 h-8 bg-[var(--surface-elevated)] rounded animate-pulse" />
          <div className="w-40 h-8 bg-[var(--surface-elevated)] rounded animate-pulse" />
        </div>
        <div className="h-64 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-lg)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Prospects</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {activeTab === 'prospects' 
              ? `${prospects.length} total · ${prospects.filter(p => p.score >= 70 || p.score >= 7).length} qualified`
              : `${queueList.length} pending scheduled outreach follow-ups`
            }
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-[var(--surface-elevated)] p-0.5 rounded-[var(--radius-md)] border border-[var(--border-default)] shadow-sm shrink-0">
          <button 
            onClick={() => setActiveTab('prospects')}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all ${
              activeTab === 'prospects' 
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Prospects List
          </button>
          <button 
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'queue' 
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Outreach Queue
            {queueList.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
            )}
          </button>
        </div>
      </div>

      {activeTab === 'prospects' ? (
        <>
          {/* Search + Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or company..."
                className="w-full pl-10 pr-4 py-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 transition-all"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                    activeFilter === f
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredProspects.length === 0 ? (
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
              <EmptyState headline="No prospects yet." body="Start a campaign. Wagora handles the rest." />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30">
                      {['Name', 'Company', 'Role', 'Score', 'Platform', 'Status', 'Last contact'].map(h => (
                        <th key={h} className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
                          {h}
                          {h === 'Score' && (
                            <span className="ml-1 cursor-help" title="Wagora scores each prospect 1–100 against your ideal client profile. Higher score means stronger match.">ⓘ</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {filteredProspects.map(p => (
                      <tr
                        key={p.id}
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className={`hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer ${
                          expandedId === p.id ? 'bg-[var(--surface-elevated)]/30' : ''
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] shrink-0">
                              {getInitials(p.name)}
                            </div>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{p.company || '—'}</td>
                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{p.role || '—'}</td>
                        <td className="px-5 py-4"><ScoreBadge score={p.score} /></td>
                        <td className="px-5 py-4 text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 mt-4 capitalize">
                          <ChannelIcon channel={p.platform} />
                          {p.platform}
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-4 text-xs text-[var(--text-muted)] font-mono">{p.last_contact || 'Never'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {filteredProspects.map(p => (
                  <div
                    key={p.id}
                    className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">
                          {getInitials(p.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">{p.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{p.role || 'No Role'} at {p.company || 'No Company'}</p>
                        </div>
                      </div>
                      <ScoreBadge score={p.score} />
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
                      <StatusBadge status={p.status} />
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1 capitalize"><ChannelIcon channel={p.platform} />{p.platform}</span>
                        <span>·</span>
                        <span>{p.last_contact || 'Never'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        /* Outreach Queue View */
        <div className="space-y-4">
          {/* Queue Statistics */}
          <div className="grid grid-cols-3 gap-3 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-card)]">
            <div className="text-center sm:text-left">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Queue status</span>
              <p className="text-lg font-bold text-[var(--text-primary)] font-mono mt-0.5">{queueList.length} pending</p>
            </div>
            <div className="text-center sm:text-left border-x border-[var(--border-subtle)] px-2">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Outbox speed</span>
              <p className="text-lg font-bold text-[var(--text-primary)] font-mono mt-0.5">2.5 min spacing</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Avg match score</span>
              <p className="text-lg font-bold text-[var(--accent-primary)] font-mono mt-0.5">8.6/10</p>
            </div>
          </div>

          {/* Queue items list */}
          {queueList.length === 0 ? (
            <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
              <EmptyState headline="Outreach queue is empty." body="Wagora automatically drafts messages when prospects enter campaigns." />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {queueList.map(q => (
                <div 
                  key={q.id}
                  className="bg-[var(--surface-card)] p-5 border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] flex flex-col justify-between space-y-4 animate-fade-in"
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-none">{q.prospectName}</h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1">{q.prospectCompany}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-1 capitalize">
                        <ChannelIcon channel={q.channel} /> {q.channel}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 text-[9px] font-bold uppercase tracking-wider">
                        {q.status}
                      </span>
                    </div>
                  </div>

                  {/* Body Content Box */}
                  <div className="bg-[var(--surface-elevated)] border border-[var(--border-subtle)] p-3 rounded-[var(--radius-md)] flex-1">
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                      "{q.messageContent}"
                    </p>
                  </div>

                  {/* Scheduled time info */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5 font-mono">
                      <Clock size={12} />
                      Send schedule: {q.scheduledFor}
                    </span>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleCancelQueue(q.id)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--destructive)] border border-[var(--border-default)] bg-[var(--surface-elevated)] rounded-[var(--radius-md)] hover:bg-[var(--surface-card)] transition-all"
                        title="Cancel message"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button 
                        onClick={() => handleSendNow(q.id, q.prospectName)}
                        className="px-3 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-[11px] font-bold rounded-[var(--radius-md)] flex items-center gap-1 active:scale-95 duration-100 shadow-sm"
                      >
                        <Send size={11} /> Send now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
