
import { useState } from 'react';
import { DollarSign, Calendar, MessageSquare, Phone, List, Kanban, Loader2 } from 'lucide-react';
import { useDeals } from '@/hooks/useDeals';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import type { Database } from '@/lib/supabase/types';

type Deal = Database['public']['Tables']['deals']['Row'];

const columns: { label: Deal['status']; title: string; color: string }[] = [
  { label: 'Awaiting payment', title: 'Awaiting payment', color: 'border-t-2 border-t-[var(--status-paused)] bg-[rgba(245,158,11,0.02)]' },
  { label: 'Payment confirmed', title: 'Payment confirmed', color: 'border-t-2 border-t-[var(--success)] bg-[rgba(0,200,150,0.02)]' },
  { label: 'In delivery', title: 'In delivery', color: 'border-t-2 border-t-[#818cf8] bg-[rgba(129,140,248,0.02)]' },
  { label: 'Complete', title: 'Complete', color: 'border-t-2 border-t-[var(--text-muted)] bg-[rgba(156,149,144,0.02)]' },
];

export default function Deals() {
  const { toast } = useToast();
  const { deals, loading, error, updateDeal } = useDeals();
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const selectedDeal = deals.find(d => d.id === selectedDealId);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

  const totalRevenue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, colLabel: string) => {
    e.preventDefault();
    setDragOverCol(colLabel);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
  };

  const handleDrop = async (e: React.DragEvent, colLabel: Deal['status']) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    try {
      await updateDeal(id, { status: colLabel });
      toast('Deal status updated.', { type: 'success' });
    } catch (err: any) {
      toast(`Failed to update status: ${err.message}`, { type: 'error' });
    }
  };

  const moveDeal = async (id: string, colLabel: Deal['status']) => {
    try {
      await updateDeal(id, { status: colLabel });
      toast('Deal status updated.', { type: 'success' });
    } catch (err: any) {
      toast(`Failed to update status: ${err.message}`, { type: 'error' });
    }
  };

  const handleMarkInDelivery = async (id: string) => {
    setActionLoading(true);
    try {
      await updateDeal(id, { status: 'In delivery' });
      toast('Deal marked as in delivery.', { type: 'success' });
    } catch (err: any) {
      toast(`Failed: ${err.message}`, { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent-primary)]" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500 font-semibold">Error loading deals</p>
        <p className="text-xs text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="p-4 sm:p-8">
        <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)] mb-6">Closed deals</h1>
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
          <EmptyState headline="No closed deals yet." body="When Wagora closes a deal, the full summary appears here." />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Closed deals</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {deals.length} deals · {formatCurrency(totalRevenue)} total revenue
          </p>
        </div>
        
        {/* Toggle view mode */}
        <div className="flex bg-[var(--surface-elevated)] p-0.5 rounded-[var(--radius-md)] border border-[var(--border-default)] shadow-sm shrink-0">
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-[var(--radius-sm)] flex items-center gap-1.5 text-xs font-semibold transition-all ${
              viewMode === 'list' 
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <List size={14} /> List
          </button>
          <button 
            onClick={() => setViewMode('pipeline')}
            className={`p-1.5 rounded-[var(--radius-sm)] flex items-center gap-1.5 text-xs font-semibold transition-all ${
              viewMode === 'pipeline' 
                ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Kanban size={14} /> Pipeline
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total revenue', value: formatCurrency(totalRevenue) },
          { label: 'Deals closed', value: deals.length.toString() },
          { label: 'Avg deal value', value: formatCurrency(Math.round(totalRevenue / deals.length)) },
          { label: 'Awaiting payment', value: deals.filter(d => d.status === 'Awaiting payment').length.toString() },
        ].map((m, i) => (
          <div key={i} className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">{m.label}</p>
            <p className="font-clash text-lg font-bold text-[var(--text-primary)]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Main Views */}
      {viewMode === 'list' ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30">
                  {['Client', 'Company', 'Service', 'Value', 'Closed', 'Campaign', 'Status'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {deals.map(d => (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedDealId(d.id)}
                    className="hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 text-sm font-semibold text-[var(--text-primary)]">{d.client}</td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{d.company}</td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{d.service}</td>
                    <td className="px-5 py-4 text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(Number(d.value || 0))}</td>
                    <td className="px-5 py-4 text-xs text-[var(--text-muted)]">{d.closed_date || 'N/A'}</td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{d.campaign}</td>
                    <td className="px-5 py-4"><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="sm:hidden space-y-3">
            {deals.map(d => (
              <div
                key={d.id}
                onClick={() => setSelectedDealId(d.id)}
                className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[var(--text-primary)] text-sm">{d.client}</span>
                  <StatusBadge status={d.status} />
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{d.company} · <span className="text-[var(--text-muted)]">{d.service}</span></p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
                  <span className="font-bold font-mono text-[var(--text-primary)]">{formatCurrency(Number(d.value || 0))}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{d.closed_date || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Kanban Pipeline View */
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
          {columns.map(col => {
            const colDeals = deals.filter(d => d.status === col.label);
            const isDraggingOver = dragOverCol === col.label;

            return (
              <div
                key={col.label}
                onDragOver={(e) => handleDragOver(e, col.label)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.label)}
                className={`flex-1 min-w-[280px] max-w-[360px] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-3 flex flex-col space-y-3 transition-colors ${col.color} ${
                  isDraggingOver ? 'bg-[rgba(0,200,150,0.06)] border-[var(--accent-primary)]' : ''
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">{col.title}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)] font-bold">
                      {colDeals.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono font-bold">
                    {formatCurrency(colDeals.reduce((sum, d) => sum + Number(d.value || 0), 0))}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto min-h-[350px] pr-0.5 custom-scrollbar">
                  {colDeals.length === 0 ? (
                    <div className="h-full border border-dashed border-[var(--border-default)] rounded-[var(--radius-md)] flex items-center justify-center p-6 text-center">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Drop deals here</span>
                    </div>
                  ) : (
                    colDeals.map(d => (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, d.id)}
                        onClick={() => setSelectedDealId(d.id)}
                        className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] hover:border-[var(--text-muted)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-all cursor-grab active:cursor-grabbing space-y-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[var(--text-primary)] truncate">{d.client}</span>
                            <span className="text-xs font-bold text-[var(--text-primary)] font-mono shrink-0">{formatCurrency(Number(d.value || 0))}</span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] truncate">{d.company}</p>
                        </div>
                        
                        <div className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] px-2 py-1 rounded truncate">
                          {d.service}
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] font-mono border-t border-[var(--border-subtle)] pt-2.5">
                          <span className="truncate max-w-[120px]">{d.campaign ? d.campaign.split(' ')[0] : 'N/A'}...</span>
                          <span>{d.closed_date || 'N/A'}</span>
                        </div>

                        {/* Column Quick Mover Controls (for click navigation) */}
                        <div className="flex gap-1 pt-1 justify-end">
                          {columns.filter(c => c.label !== d.status).map(c => (
                            <button
                                key={c.label}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await moveDeal(d.id, c.label);
                                }}
                                className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-colors"
                                title={`Move to ${c.title}`}
                              >
                                {c.title.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deal Summary Modal */}
      <Modal open={!!selectedDealId} onClose={() => setSelectedDealId(null)}>
        {selectedDeal && (
          <div className="p-6 space-y-5">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--accent-primary)] mb-1">Deal closed.</p>
              <h2 className="font-clash text-xl font-bold text-[var(--text-primary)]">{selectedDeal.client}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{selectedDeal.company}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">Service agreed</p>
                <p className="text-xs text-[var(--text-primary)] font-semibold">{selectedDeal.service}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">Value</p>
                <p className="text-xs font-bold font-mono text-[var(--text-primary)]">{formatCurrency(Number(selectedDeal.value || 0))}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">Closed via</p>
                <p className="text-xs text-[var(--text-primary)] flex items-center gap-1.5 font-semibold">
                  {selectedDeal.closed_via === 'Chat' ? <MessageSquare size={12} /> : <Phone size={12} />}
                  {selectedDeal.closed_via || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">Campaign</p>
                <p className="text-xs text-[var(--text-primary)] font-semibold">{selectedDeal.campaign}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">Conversation summary</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{selectedDeal.conversation_summary || 'No summary available.'}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">Commitments made</p>
              <ul className="space-y-1.5">
                {(selectedDeal.commitments || []).map((c, i) => (
                  <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-[var(--accent-primary)] mt-1.5 shrink-0" />
                    {c}
                  </li>
                ))}
                {(!selectedDeal.commitments || selectedDeal.commitments.length === 0) && (
                  <li className="text-xs text-[var(--text-muted)] italic">No commitments recorded.</li>
                )}
              </ul>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-1">Suggested next step</p>
              <p className="text-xs text-[var(--text-primary)] font-bold">{selectedDeal.suggested_next_step || 'No next step specified.'}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button 
                onClick={() => handleMarkInDelivery(selectedDeal.id)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-white py-2 rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--accent-primary-hover)] transition-colors active:scale-95 duration-100 disabled:opacity-50"
              >
                <DollarSign size={13} />
                Mark as in delivery
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--surface-card)] transition-colors active:scale-95 duration-100">
                <Calendar size={13} />
                Send invoice
              </button>
              <button onClick={() => setSelectedDealId(null)} className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--surface-card)] transition-colors">
                Close details
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
