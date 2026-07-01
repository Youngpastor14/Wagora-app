import { useState, useEffect } from 'react';
import { Plus, Receipt, FileText, Send, Trash2, Download, Eye, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useInvoices } from '@/hooks/useInvoices';
import { useDeals } from '@/hooks/useDeals';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import type { Database } from '@/lib/supabase/types';
import { supabase } from '@/lib/supabase/client';


interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

type Invoice = Database['public']['Tables']['invoices']['Row'];

export default function Invoices() {
  const { toast } = useToast();
  const { invoices, loading, error, createInvoice, deleteInvoice, updateInvoice } = useInvoices();
  const { deals } = useDeals();

  const [showBuilder, setShowBuilder] = useState(false);
  const [showPreviewId, setShowPreviewId] = useState<string | null>(null);

  // Invoice form state
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [service, setService] = useState('');
  const [currency, setCurrency] = useState<string>('USD');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: 'item-1', description: '', quantity: 1, rate: 0 }
  ]);
  const [layoutTemplate, setLayoutTemplate] = useState<'minimalist' | 'classic' | 'modern'>('minimalist');
  const [paymentType, setPaymentType] = useState<'local' | 'international'>('local');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [downloadErrorId, setDownloadErrorId] = useState<string | null>(null);

  const handleDownloadPDF = async (invoiceId: string) => {
    setDownloadingId(invoiceId);
    setDownloadSuccessId(null);
    setDownloadErrorId(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiUrl}/api/invoices/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invoice_id: invoiceId,
          template: layoutTemplate === 'minimalist' ? 'minimal' : layoutTemplate === 'classic' ? 'clean' : 'bold'
        })
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `wagora-invoice-${invoiceId}.pdf`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadSuccessId(invoiceId);
      toast('Invoice PDF downloaded successfully.', { type: 'success' });
      
      setTimeout(() => {
        setDownloadSuccessId(null);
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setDownloadErrorId(invoiceId);
      toast('PDF generation failed. Try again.', { type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };


  // Load selected deal for invoice drafting if redirected or passed in
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const dealId = searchParams.get('dealId');
    if (dealId && deals.length > 0) {
      const deal = deals.find(d => d.id === dealId);
      if (deal) {
        setClientName(deal.client);
        setClientCompany(deal.company || '');
        setClientEmail(''); // Not in deal row, will be filled by user
        setService(deal.service || '');
        setLineItems([{ id: 'item-1', description: deal.service || '', quantity: 1, rate: Number(deal.value || 0) }]);
        setSelectedDealId(dealId);
        setShowBuilder(true);
      }
    }
  }, [deals]);

  const formatCurrency = (value: number, curr: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, { id: `item-${Date.now()}`, description: '', quantity: 1, rate: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, val: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const handleCreateInvoice = async (status: 'Draft' | 'Sent') => {
    if (!clientName.trim() || !clientCompany.trim()) {
      toast('Client details are required.', { type: 'error' });
      return;
    }

    const sub = calculateSubtotal();
    const invoiceNum = `INV-2026-0${invoices.length + 1}`;
    
    try {
      await createInvoice({
        invoice_number: invoiceNum,
        client_name: clientName,
        client_company: clientCompany,
        client_email: clientEmail || null,
        deal_id: selectedDealId,
        line_items: lineItems as any,
        subtotal: sub,
        tax: 0,
        total: sub,
        currency,
        payment_details_type: paymentType,
        status,
        issued_at: new Date().toISOString(),
        due_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

      toast(`Invoice ${invoiceNum} generated as ${status.toLowerCase()}.`, { type: 'success' });
      
      // Reset form
      setClientName('');
      setClientCompany('');
      setClientEmail('');
      setService('');
      setLineItems([{ id: 'item-1', description: '', quantity: 1, rate: 0 }]);
      setSelectedDealId(null);
      setShowBuilder(false);
    } catch (err: any) {
      toast(`Failed to create invoice: ${err.message}`, { type: 'error' });
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await deleteInvoice(id);
      toast('Invoice deleted.', { type: 'success' });
    } catch (err: any) {
      toast(`Failed to delete invoice: ${err.message}`, { type: 'error' });
    }
  };

  const previewInvoice = invoices.find(inv => inv.id === showPreviewId);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        <p className="text-red-500 font-semibold">Error loading invoices</p>
        <p className="text-xs text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Invoices</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Track and dispatch professional billings directly in NGN, USD, or EUR
          </p>
        </div>
        <button 
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-[var(--accent-primary)] text-white px-4 py-2.5 rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--accent-primary-hover)] transition-colors active:scale-95 duration-100 shrink-0"
        >
          <Plus size={14} /> Create invoice
        </button>
      </div>

      {/* Invoice summary boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Outstanding amount', value: formatCurrency(invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + Number(inv.total || 0), 0)), status: 'Sent' },
          { label: 'Total paid', value: formatCurrency(invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + Number(inv.total || 0), 0)), status: 'Paid' },
          { label: 'Overdue invoices', value: invoices.filter(inv => inv.status === 'Overdue').length.toString(), status: 'Overdue' },
          { label: 'Draft invoices', value: invoices.filter(inv => inv.status === 'Draft').length.toString(), status: 'Draft' },
        ].map((m, i) => (
          <div key={i} className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">{m.label}</p>
            <p className="font-clash text-lg font-bold text-[var(--text-primary)]">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Invoices List — Desktop Table */}
      <div className="hidden sm:block bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/30">
          <h3 className="font-clash text-sm font-bold text-[var(--text-primary)]">Billing History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]/10">
                {['Invoice', 'Client', 'Company', 'Issued Date', 'Due Date', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">No Invoices Drafted Yet</td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-[var(--surface-elevated)]/30 transition-colors">
                    <td className="px-5 py-4 text-xs font-bold text-[var(--text-primary)] font-mono">{inv.invoice_number}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[var(--text-primary)]">{inv.client_name}</td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{inv.client_company || 'N/A'}</td>
                    <td className="px-5 py-4 text-xs text-[var(--text-muted)]">{formatDate(inv.issued_at)}</td>
                    <td className="px-5 py-4 text-xs text-[var(--text-muted)]">{formatDate(inv.due_at)}</td>
                    <td className="px-5 py-4 text-sm font-bold text-[var(--text-primary)] font-mono">{formatCurrency(Number(inv.total || 0), inv.currency)}</td>
                    <td className="px-5 py-4"><StatusBadge status={inv.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowPreviewId(inv.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                          title="View Invoice"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteInvoice(inv.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors cursor-pointer"
                          title="Delete Invoice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoices List — Mobile Cards */}
      <div className="sm:hidden">
        {invoices.length === 0 ? (
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] p-8 text-center">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">No Invoices Drafted Yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-mono font-bold text-[var(--text-muted)]">{inv.invoice_number}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{inv.client_name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{inv.client_company || 'N/A'}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border-subtle)]">
                  <span className="font-bold font-mono text-[var(--text-primary)]">{formatCurrency(Number(inv.total || 0), inv.currency)}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowPreviewId(inv.id)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteInvoice(inv.id)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Creator Drawer (Slide-Over panel) */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full sm:max-w-2xl bg-[var(--background-primary)] h-full overflow-y-auto scroll-touch shadow-2xl p-5 sm:p-8 space-y-6 flex flex-col justify-between border-l border-[var(--border-default)] animate-slide-in-right">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-[var(--accent-primary)]" />
                <h2 className="font-clash text-lg font-bold text-[var(--text-primary)]">Invoice Builder</h2>
              </div>
              <button 
                onClick={() => setShowBuilder(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex-1 space-y-5 overflow-y-auto pr-1 py-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Client Name</label>
                  <input 
                    type="text" 
                    value={clientName} 
                    onChange={e => setClientName(e.target.value)} 
                    placeholder="David Mensah" 
                    className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Client Company</label>
                  <input 
                    type="text" 
                    value={clientCompany} 
                    onChange={e => setClientCompany(e.target.value)} 
                    placeholder="Accra Logistics" 
                    className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Client Email</label>
                  <input 
                    type="email" 
                    value={clientEmail} 
                    onChange={e => setClientEmail(e.target.value)} 
                    placeholder="client@company.com" 
                    className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Service Title</label>
                  <input 
                    type="text" 
                    value={service} 
                    onChange={e => setService(e.target.value)} 
                    placeholder="Service agreed (e.g. Brand Audit)" 
                    className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)]" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[var(--border-subtle)] pt-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Currency</label>
                  <select 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)} 
                    className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)]"
                  >
                    <option>USD</option>
                    <option>NGN</option>
                    <option>EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Template Style</label>
                  <select 
                    value={layoutTemplate} 
                    onChange={e => setLayoutTemplate(e.target.value as any)} 
                    className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)]"
                  >
                    <option value="minimalist">Minimalist</option>
                    <option value="classic">Classic</option>
                    <option value="modern">Modern Tech</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Payment Type</label>
                  <select 
                    value={paymentType} 
                    onChange={e => setPaymentType(e.target.value as any)} 
                    className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)]"
                  >
                    <option value="local">Local Bank Transfer</option>
                    <option value="international">SWIFT Wire</option>
                  </select>
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="border-t border-[var(--border-subtle)] pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Line Items</label>
                  <button 
                    onClick={addLineItem}
                    className="text-xs font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> Add item
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, idx) => (
                    <div key={item.id} className="flex gap-2 items-start animate-fade-in">
                      <input 
                        type="text" 
                        value={item.description} 
                        onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Description of deliverables..." 
                        className="flex-1 min-w-0 px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs text-[var(--text-primary)]"
                      />
                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={e => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="Qty" 
                        className="w-14 px-2 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs text-[var(--text-primary)] font-mono text-center"
                      />
                      <input 
                        type="number" 
                        value={item.rate} 
                        onChange={e => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="Rate" 
                        className="w-20 sm:w-24 px-2 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-xs text-[var(--text-primary)] font-mono text-right"
                      />
                      <button 
                        onClick={() => removeLineItem(item.id)}
                        disabled={lineItems.length === 1}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--destructive)] disabled:opacity-30 disabled:hover:text-[var(--text-muted)] transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Subtotal */}
                <div className="flex justify-end pr-8 pt-2">
                  <div className="text-right">
                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Subtotal: </span>
                    <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{formatCurrency(calculateSubtotal(), currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-3 pt-4 border-t border-[var(--border-default)]">
              <button 
                onClick={() => handleCreateInvoice('Draft')}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--surface-card)] transition-colors"
              >
                Save as draft
              </button>
              <button 
                onClick={() => handleCreateInvoice('Sent')}
                className="flex-1 py-2.5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 duration-100 shadow-sm cursor-pointer"
              >
                <Send size={13} /> Send invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Visual Preview Modal (PDF Mock) */}
      <Modal open={!!showPreviewId} onClose={() => setShowPreviewId(null)}>
        {previewInvoice && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-[var(--accent-primary)]" />
                <h3 className="font-clash text-sm font-bold text-[var(--text-primary)]">Invoice Details ({previewInvoice.invoice_number})</h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">Template: {layoutTemplate.toUpperCase()}</span>
            </div>

            {/* Mock PDF Document */}
            <div className="p-4 sm:p-6 bg-white text-black border border-[var(--border-default)] rounded-[var(--radius-sm)] shadow-xs space-y-4 sm:space-y-6 font-sans max-h-[50vh] sm:max-h-none overflow-y-auto">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="font-bold text-lg tracking-tight uppercase">WAGORA INC</h1>
                  <p className="text-[10px] text-gray-500">Suite 404, Tech Hub, Lagos</p>
                  <p className="text-[10px] text-gray-500">billing@wagora.co</p>
                </div>
                <div className="text-right">
                  <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-widest">INVOICE</h2>
                  <p className="font-mono text-xs font-bold mt-1">{previewInvoice.invoice_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[11px] pt-4 border-t border-gray-100">
                <div>
                  <p className="font-bold text-gray-400 uppercase tracking-wide">Bill To</p>
                  <p className="font-semibold text-black mt-1">{previewInvoice.client_name}</p>
                  <p className="text-gray-500">{previewInvoice.client_company || 'N/A'}</p>
                  <p className="text-gray-500">{previewInvoice.client_email || 'N/A'}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-gray-500"><strong>Issued:</strong> {formatDate(previewInvoice.issued_at)}</p>
                  <p className="text-gray-500"><strong>Due Date:</strong> {formatDate(previewInvoice.due_at)}</p>
                  <p className="text-gray-500"><strong>Status:</strong> <span className="font-bold uppercase text-[var(--accent-primary)]">{previewInvoice.status}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-4">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase">
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-center w-12">Qty</th>
                      <th className="pb-2 text-right w-24">Rate</th>
                      <th className="pb-2 text-right w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {((previewInvoice.line_items as unknown as LineItem[]) || []).map(item => (
                      <tr key={item.id}>
                        <td className="py-2.5 font-medium text-black">{item.description}</td>
                        <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                        <td className="py-2.5 text-right font-mono">{formatCurrency(item.rate, previewInvoice.currency)}</td>
                        <td className="py-2.5 text-right font-mono font-semibold">{formatCurrency(item.quantity * item.rate, previewInvoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <div className="w-48 text-[11px] space-y-1.5 text-right">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(Number(previewInvoice.subtotal || 0), previewInvoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Tax (0%):</span>
                    <span className="font-mono">$0.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t border-gray-200 pt-1.5 text-black">
                    <span>Total Due:</span>
                    <span className="font-mono">{formatCurrency(Number(previewInvoice.total || 0), previewInvoice.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Banking instructions */}
              <div className="text-[9px] text-gray-400 bg-gray-50 p-3 rounded space-y-1 border border-gray-100">
                <p className="font-bold text-gray-500 uppercase tracking-wide">Payment Instructions</p>
                {previewInvoice.payment_details_type === 'local' ? (
                  <>
                    <p><strong>Bank:</strong> GTBank Plc (Naira Account)</p>
                    <p><strong>Account Name:</strong> Wagora Technology Limited</p>
                    <p><strong>Account Number:</strong> 0124896745</p>
                  </>
                ) : (
                  <>
                    <p><strong>Bank:</strong> GTBank London (SWIFT Account)</p>
                    <p><strong>IBAN:</strong> GB12GTBK30291048209381</p>
                    <p><strong>BIC/SWIFT:</strong> GTBKGB2LXXX</p>
                  </>
                )}
                <p className="text-[8px] text-gray-400 leading-relaxed mt-1">Payment is due within 14 days of invoice issue date. Quote the invoice number in the payment reference.</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => handleDownloadPDF(previewInvoice.id)}
                disabled={downloadingId === previewInvoice.id}
                className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-white py-2 rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--accent-primary-hover)] transition-colors active:scale-95 duration-100 cursor-pointer disabled:opacity-50"
              >
                {downloadingId === previewInvoice.id ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Generating PDF...
                  </>
                ) : downloadSuccessId === previewInvoice.id ? (
                  <>
                    <CheckCircle size={13} />
                    Downloaded
                  </>
                ) : downloadErrorId === previewInvoice.id ? (
                  <>
                    <AlertCircle size={13} />
                    Try again
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    Download PDF
                  </>
                )}
              </button>
              <button 
                onClick={() => setShowPreviewId(null)}
                className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
              >
                Close preview
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
