import { useState } from 'react';
import { Phone, Calendar, Clock, MessageSquare, CheckSquare, ChevronRight, X, ArrowRight, User, Plus, Award, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '@/components/ui/StatusBadge';

interface CallCommitment {
  id: string;
  task: string;
  completed: boolean;
}

interface CallLog {
  id: string;
  clientName: string;
  clientCompany: string;
  scheduledAt: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  duration?: string;
  transcript?: { speaker: string; text: string; time: string }[];
  outcome?: 'closed' | 'follow_up' | 'declined';
  summary?: string;
  commitments: CallCommitment[];
}

const mockCalls: CallLog[] = [
  {
    id: 'call-1',
    clientName: 'James Okafor',
    clientCompany: 'PayStack Ventures',
    scheduledAt: '2026-05-28 14:00',
    status: 'completed',
    duration: '22 mins',
    outcome: 'closed',
    summary: 'Discussed product operations audit. The client is experiencing scale bottlenecks with onboarding transaction handling. Agreed to a GTM sprint audit scope.',
    commitments: [
      { id: 'c1', task: 'Deliver audit scope framework document by Monday', completed: true },
      { id: 'c2', task: 'Send invoice for contract deposit', completed: false },
      { id: 'c3', task: 'Schedule kickoff sync session', completed: false },
    ],
    transcript: [
      { speaker: 'James Okafor', text: 'Thanks for jumping on the call. We have been seeing onboarding transaction lag during peak hours in the new West African corridors.', time: '0:12' },
      { speaker: 'Wagora Operator', text: 'Understood. We normally audit this in a 30-day GTM optimization sprint. We check API response times, bank routing policies, and fallback pathways.', time: '0:45' },
      { speaker: 'James Okafor', text: 'That sounds like what we need. What is the scope and pricing for that audit?', time: '1:30' },
      { speaker: 'Wagora Operator', text: 'It is a fixed-price audit at $3,800. We deliver the complete API bottleneck audit in 10 days and support implementation guides.', time: '2:10' },
      { speaker: 'James Okafor', text: 'Perfect. Let\'s move forward on this. Send over the invoice deposit and we can lock in the schedule.', time: '3:05' },
    ]
  },
  {
    id: 'call-2',
    clientName: 'Marcus Chen',
    clientCompany: 'TechVault',
    scheduledAt: '2026-05-29 10:30',
    status: 'completed',
    duration: '15 mins',
    outcome: 'follow_up',
    summary: 'Walked through dev tooling integrations. Marcus is interested but needs to clear technical security review with his lead security architect.',
    commitments: [
      { id: 'c1', task: 'Email technical security architecture data sheet', completed: true },
      { id: 'c2', task: 'Book follow-up call for next Friday', completed: true },
    ],
    transcript: [
      { speaker: 'Marcus Chen', text: 'The tool makes sense, but we run strict local container restrictions. Do you have a deployment security sheet?', time: '0:50' },
      { speaker: 'Wagora Operator', text: 'Yes, we have a PDF summarizing our zero-knowledge API security architecture. I can send that over right now.', time: '1:15' },
      { speaker: 'Marcus Chen', text: 'Excellent. Once I clear this with our security lead, we can review next steps on Friday.', time: '2:00' },
    ]
  },
  {
    id: 'call-3',
    clientName: 'Sofia Ramirez',
    clientCompany: 'Creativa Studio',
    scheduledAt: '2026-05-30 11:00',
    status: 'scheduled',
    commitments: [],
  },
  {
    id: 'call-4',
    clientName: 'Lina Petrov',
    clientCompany: 'HealthBridge',
    scheduledAt: '2026-06-01 16:30',
    status: 'scheduled',
    commitments: [],
  },
];

export default function CallsManager() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [callLogs, setCallLogs] = useState<CallLog[]>(mockCalls);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const activeCall = callLogs.find(c => c.id === selectedCallId);

  const toggleCommitment = (callId: string, commitmentId: string) => {
    setCallLogs(prev => prev.map(c => {
      if (c.id === callId) {
        return {
          ...c,
          commitments: c.commitments.map(com => 
            com.id === commitmentId ? { ...com, completed: !com.completed } : com
          )
        };
      }
      return c;
    }));
    toast('Commitment updated.', { type: 'success' });
  };

  const getOutcomeBadge = (outcome?: CallLog['outcome']) => {
    switch (outcome) {
      case 'closed':
        return <span className="px-2 py-0.5 rounded-full bg-[rgba(0,200,150,0.1)] text-[var(--accent-primary)] text-[10px] font-bold uppercase tracking-wider">Closed Deal</span>;
      case 'follow_up':
        return <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider">Follow Up</span>;
      case 'declined':
        return <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider">Declined</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Calls Center</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Review booked calls, transcript logs, and AI-extracted action commitments
        </p>
      </div>

      {/* Analytics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total calls', value: callLogs.length.toString() },
          { label: 'Completed calls', value: callLogs.filter(c => c.status === 'completed').length.toString() },
          { label: 'Deals closed via calls', value: callLogs.filter(c => c.outcome === 'closed').length.toString() },
          { label: 'Scheduled calls', value: callLogs.filter(c => c.status === 'scheduled').length.toString() },
        ].map((m, i) => (
          <div key={i} className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">{m.label}</p>
            <p className="font-clash text-lg font-bold text-[var(--text-primary)]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Calls Log — Desktop Table */}
      <div className="hidden sm:block bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30">
          <h3 className="font-clash text-sm font-bold text-[var(--text-primary)]">Call History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/10">
                {['Client', 'Company', 'Scheduled Date', 'Status', 'Duration', 'AI Outcome', 'Commitments', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {callLogs.map(call => (
                <tr key={call.id} className="hover:bg-[var(--surface-elevated)]/30 transition-colors">
                  <td className="px-5 py-4 text-sm font-semibold text-[var(--text-primary)]">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-[var(--text-muted)]" />
                      {call.clientName}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{call.clientCompany}</td>
                  <td className="px-5 py-4 text-xs text-[var(--text-muted)] font-mono">{call.scheduledAt}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={call.status === 'completed' ? 'Complete' : call.status === 'scheduled' ? 'Call booked' : 'Paused'} />
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-[var(--text-secondary)]">{call.duration || '—'}</td>
                  <td className="px-5 py-4">{getOutcomeBadge(call.outcome) || <span className="text-xs text-[var(--text-muted)]">—</span>}</td>
                  <td className="px-5 py-4">
                    {call.commitments.length > 0 ? (
                      <span className="text-xs text-[var(--text-secondary)] font-semibold">
                        {call.commitments.filter(c => c.completed).length}/{call.commitments.length} done
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <button 
                      onClick={() => setSelectedCallId(call.id)}
                      className="flex items-center gap-1 text-xs font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors"
                    >
                      {call.status === 'completed' ? 'Review logs' : 'Call link'}
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calls Log — Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {callLogs.map(call => (
          <div
            key={call.id}
            onClick={() => setSelectedCallId(call.id)}
            className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{call.clientName}</p>
                <p className="text-xs text-[var(--text-muted)]">{call.clientCompany}</p>
              </div>
              <StatusBadge status={call.status === 'completed' ? 'Complete' : call.status === 'scheduled' ? 'Call booked' : 'Paused'} />
            </div>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border-subtle)]">
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{call.scheduledAt}</span>
              {call.duration && <span className="text-[10px] text-[var(--text-muted)]">· {call.duration}</span>}
              {call.outcome && <span className="ml-auto">{getOutcomeBadge(call.outcome)}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Call Details / AI Transcripts Slider Drawer */}
      {selectedCallId && activeCall && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
        <div className="w-full sm:max-w-2xl bg-[var(--background-primary)] h-full overflow-y-auto scroll-touch shadow-2xl p-5 sm:p-8 space-y-6 flex flex-col justify-between border-l border-[var(--border-default)] animate-slide-in-right">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
              <div className="flex items-center gap-2">
                <Phone size={18} className="text-[var(--accent-primary)]" />
                <div>
                  <h2 className="font-clash text-base font-bold text-[var(--text-primary)] leading-none">{activeCall.clientName}</h2>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">{activeCall.clientCompany} · Call Review</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCallId(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable details */}
            {activeCall.status === 'completed' ? (
              <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-5 custom-scrollbar">
                
                {/* AI Outcome Indicator */}
                <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">AI Call Outcome</h4>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">
                      {activeCall.outcome === 'closed' ? 'Deal closed successfully' : 'Follow up session scheduled'}
                    </p>
                  </div>
                  {getOutcomeBadge(activeCall.outcome)}
                </div>

                {/* AI Summary */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">AI Meeting Summary</h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-card)] border border-[var(--border-default)] p-3 rounded-[var(--radius-md)]">
                    {activeCall.summary}
                  </p>
                </div>

                {/* Commitments & Action Items */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">AI-Extracted Commitments</h4>
                  <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-md)] divide-y divide-[var(--border-subtle)] overflow-hidden">
                    {activeCall.commitments.map(com => (
                      <div 
                        key={com.id} 
                        onClick={() => toggleCommitment(activeCall.id, com.id)}
                        className="flex items-start gap-3 p-3 hover:bg-[var(--surface-elevated)]/30 transition-colors cursor-pointer"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          com.completed ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-default)]'
                        }`}>
                          {com.completed && <CheckSquare size={12} className="text-white" />}
                        </div>
                        <span className={`text-xs ${
                          com.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)] font-medium'
                        }`}>
                          {com.task}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transcript Dialog */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Call Transcript logs</h4>
                  <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-4 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {activeCall.transcript?.map((t, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[9px] text-[var(--text-muted)] font-mono uppercase tracking-wider font-bold">
                          <span>{t.speaker}</span>
                          <span>{t.time}</span>
                        </div>
                        <p className={`text-xs leading-relaxed p-2.5 rounded-[var(--radius-md)] ${
                          t.speaker === 'Wagora Operator' 
                            ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-tl-none border border-[var(--border-subtle)]'
                            : 'bg-[var(--background-secondary)] text-[var(--text-secondary)] rounded-tr-none'
                        }`}>
                          {t.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              // Scheduled state details
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[rgba(0,200,150,0.1)] border border-[var(--accent-primary)] flex items-center justify-center">
                  <Calendar className="text-[var(--accent-primary)]" size={20} />
                </div>
                <div>
                  <h3 className="font-clash text-base font-bold text-[var(--text-primary)]">Scheduled Sync Session</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">This call is scheduled to run on Google Meet.</p>
                </div>
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-default)] text-xs font-mono space-y-1 w-full max-w-sm">
                  <p className="text-[var(--text-secondary)]"><strong>Date/Time:</strong> {activeCall.scheduledAt}</p>
                  <p className="text-[var(--text-secondary)]"><strong>Host:</strong> Wagora Automation rep</p>
                </div>
                <button 
                  onClick={() => toast('Redirecting to Google Meet...', { type: 'success' })}
                  className="px-4 py-2 bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] rounded-[var(--radius-md)] text-xs font-bold transition-all active:scale-95 duration-100"
                >
                  Join Meeting room
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-[var(--border-default)]">
              {activeCall.status === 'completed' && activeCall.outcome === 'closed' && (
                <button 
                  onClick={() => {
                    setSelectedCallId(null);
                    navigate('/invoices?dealId=deal-1');
                  }}
                  className="flex-1 py-2.5 bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] rounded-[var(--radius-md)] text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 duration-100 shadow-sm"
                >
                  <Award size={13} /> Create invoice for this deal
                </button>
              )}
              <button 
                onClick={() => setSelectedCallId(null)}
                className="flex-1 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--surface-card)] transition-colors"
              >
                Close logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
