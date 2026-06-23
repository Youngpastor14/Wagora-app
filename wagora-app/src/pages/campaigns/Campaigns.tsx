import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Megaphone, Pause, Play, Copy, Trash2, ArrowLeft, Loader2, Users, MessageSquare, Upload, Check, FileText, ShieldAlert, ArrowRight, Mail } from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useProspects } from '@/hooks/useProspects';
import { useConversations } from '@/hooks/useConversations';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.getwagora.com';
const statusFilters = ['All', 'Live', 'Paused', 'Draft', 'Complete', 'Needs attention'];

export default function Campaigns() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Real database hooks
  const { campaigns, loading, createCampaign, updateCampaign, deleteCampaign } = useCampaigns();
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [actionLoading, setActionLoading] = useState(false);

  // Gmail connection state (drives Launch button vs. connect-Gmail banner)
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null); // null = checking
  const [gmailConnectedEmail, setGmailConnectedEmail] = useState<string | null>(null);
  const [gmailStatusLoading, setGmailStatusLoading] = useState(false);

  // Stepped Form States
  const [tempCampaignId, setTempCampaignId] = useState('');
  const [modalStep, setModalStep] = useState(1);
  const [campaignDocs, setCampaignDocs] = useState<any[]>([]);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [docErrors, setDocErrors] = useState<{ [key: string]: string }>({});

  // Form inputs for new campaign
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignPlatform, setNewCampaignPlatform] = useState<'Email' | 'LinkedIn' | 'Instagram'>('Email');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [newCampaignGoal, setNewCampaignGoal] = useState('');
  const [targetIndustries, setTargetIndustries] = useState('');
  const [targetRoles, setTargetRoles] = useState('');
  const [targetCompanySize, setTargetCompanySize] = useState('');
  const [targetGeography, setTargetGeography] = useState('');
  const [targetPainPoints, setTargetPainPoints] = useState('');

  const fetchCampaignDocs = async (campId: string) => {
    if (!user || !campId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = API_URL;
      const response = await fetch(`${apiUrl}/api/documents/?campaign_id=${campId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCampaignDocs(data);
      }
    } catch (err) {
      // Silently fail
    }
  };

  // Fetch Gmail connection status from the platforms API
  const fetchGmailStatus = useCallback(async () => {
    if (!user) return;
    setGmailStatusLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = API_URL;
      const res = await fetch(`${apiUrl}/api/platforms/gmail/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGmailConnected(data.connected);
        setGmailConnectedEmail(data.email ?? null);
      } else {
        // Treat error as unknown — don't block the user
        setGmailConnected(null);
      }
    } catch {
      setGmailConnected(null);
    } finally {
      setGmailStatusLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!showCreateModal || !tempCampaignId) return;
    fetchCampaignDocs(tempCampaignId);
    const interval = setInterval(() => fetchCampaignDocs(tempCampaignId), 4000);
    return () => clearInterval(interval);
  }, [showCreateModal, tempCampaignId, user]);

  const handleOpenCreateModal = () => {
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
    setTempCampaignId(newId);
    setModalStep(1);
    setCampaignDocs([]);
    setUploadingDocType(null);
    setDocErrors({});
    setNewCampaignName('');
    setNewCampaignDesc('');
    setNewCampaignGoal('');
    setTargetIndustries('');
    setTargetRoles('');
    setTargetCompanySize('');
    setTargetGeography('');
    setTargetPainPoints('');
    setShowCreateModal(true);
  };

  const handleDocUpload = async (file: File, docType: string, maxSizeMB: number) => {
    if (!file || !user || !tempCampaignId) return;

    setDocErrors(prev => ({ ...prev, [docType]: '' }));

    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'docx', 'txt'].includes(fileExt)) {
      setDocErrors(prev => ({ ...prev, [docType]: 'Unsupported file type. Use PDF, DOCX, or TXT.' }));
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setDocErrors(prev => ({ ...prev, [docType]: `File exceeds size limit of ${maxSizeMB}MB.` }));
      return;
    }

    setUploadingDocType(docType);
    const filePath = `${user.id}/${tempCampaignId}/${Date.now()}.${fileExt}`;
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

    try {
      const { error: uploadError } = await supabase.storage
        .from('brand-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = API_URL;

      const createRes = await fetch(`${apiUrl}/api/documents/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: file.name,
          file_type: fileExt.toUpperCase(),
          size: `${fileSizeMB} MB`,
          storage_path: filePath,
          document_type: docType,
          campaign_id: tempCampaignId
        })
      });

      if (!createRes.ok) {
        throw new Error('Failed to save document metadata');
      }

      const newDoc = await createRes.json();

      fetch(`${apiUrl}/api/documents/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ document_id: newDoc.id })
      }).catch(() => { /* fire-and-forget */ });

      await fetchCampaignDocs(tempCampaignId);
      toast('Document uploaded.', { type: 'success' });
    } catch (err: any) {
      setDocErrors(prev => ({ ...prev, [docType]: err.message || 'Upload failed.' }));
    } finally {
      setUploadingDocType(null);
    }
  };

  const handleDocDelete = async (docId: string, storagePath: string) => {
    try {
      await supabase.storage
        .from('brand-documents')
        .remove([storagePath]);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = API_URL;

      const deleteRes = await fetch(`${apiUrl}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!deleteRes.ok) {
        throw new Error('Failed to delete document from database');
      }

      await fetchCampaignDocs(tempCampaignId);
      toast('Document deleted.', { type: 'success' });
    } catch (err: any) {
      toast(`Deletion failed: ${err.message}`, { type: 'error' });
    }
  };

  const [outreachStatus, setOutreachStatus] = useState<any>(null);
  const [missingOfferDoc, setMissingOfferDoc] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const fetchOutreachStatus = async (campaignId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = API_URL;
      const response = await fetch(`${apiUrl}/api/outreach/status/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOutreachStatus(data);
      }
    } catch (err) {
      // Silently fail
    }
  };

  useEffect(() => {
    if (!selectedCampaignId) {
      setOutreachStatus(null);
      setMissingOfferDoc(false);
      setLaunchError(null);
      return;
    }
    fetchOutreachStatus(selectedCampaignId);
    fetchGmailStatus(); // check Gmail whenever a campaign is opened
    const interval = setInterval(() => {
      fetchOutreachStatus(selectedCampaignId);
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedCampaignId, fetchGmailStatus]);

  const handleLaunchCampaign = async (campaignId: string) => {
    setActionLoading(true);
    setLaunchError(null);
    setMissingOfferDoc(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiUrl = API_URL;

      const response = await fetch(`${apiUrl}/api/outreach/launch/${campaignId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.status === 202) {
        await updateCampaign(campaignId, { status: 'Live' });
        toast('Outreach started. Wagora is sending your first batch.', { type: 'success' });
        fetchOutreachStatus(campaignId);
      } else if (response.status === 400) {
        // Handle structured detail objects (e.g. gmail_not_connected)
        const detail = data.detail;
        const errorCode = typeof detail === 'object' ? detail?.error : null;
        const errorMsg  = typeof detail === 'object' ? detail?.message : detail;

        if (errorCode === 'gmail_not_connected') {
          // Backend confirmed Gmail is not connected — refresh status to show the banner
          setGmailConnected(false);
          toast('Connect your Gmail account before launching outreach.', { type: 'error' });
        } else if (errorMsg && String(errorMsg).includes('plan')) {
          toast('Email outreach requires Starter plan or above. Please upgrade.', { type: 'error' });
          setLaunchError('upgrade_required');
        } else if (errorMsg && String(errorMsg).includes('offer document')) {
          toast(errorMsg, { type: 'error' });
          setMissingOfferDoc(true);
        } else {
          toast(String(errorMsg) || 'Launch failed.', { type: 'error' });
          setLaunchError(String(errorMsg) || 'Launch failed.');
        }
      } else if (response.status === 429) {
        toast('Daily limit reached. Outreach resumes tomorrow.', { type: 'error' });
        setLaunchError('limit_reached');
      } else {
        const msg = (data.detail?.message ?? data.detail) || 'Failed to start campaign outreach.';
        toast(String(msg), { type: 'error' });
        setLaunchError(String(msg));
      }
    } catch (err: any) {
      toast(err?.message || 'An error occurred.', { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId) || null;

  const filtered = campaigns.filter(c => {
    const matchesFilter = activeFilter === 'All' || c.status === activeFilter;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handlePauseToggle = async () => {
    if (!selectedCampaign) return;
    const isPaused = selectedCampaign.status === 'Paused';
    const nextStatus = isPaused ? 'Live' : 'Paused';
    
    setActionLoading(true);
    try {
      await updateCampaign(selectedCampaign.id, { status: nextStatus });
      toast(isPaused ? 'Campaign is running.' : 'Campaign paused. Outreach stopped.', { type: 'success' });
      setShowPauseModal(false);
    } catch (err: any) {
      toast(`Failed to update campaign: ${err.message}`, { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (c: any) => {
    setActionLoading(true);
    try {
      await createCampaign({
        name: `Copy of ${c.name}`,
        platform: c.platform,
        description: c.description || '',
        status: 'Draft',
        prospects: 0,
        replies: 0,
        closed: 0,
        last_active: 'Never'
      });
      toast('Campaign duplicated successfully.', { type: 'success' });
    } catch (err: any) {
      toast(`Failed to duplicate campaign: ${err.message}`, { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCampaign) return;
    setActionLoading(true);
    try {
      await deleteCampaign(selectedCampaign.id);
      setSelectedCampaignId(null);
      setShowDeleteModal(false);
      toast('Campaign deleted successfully.', { type: 'success' });
    } catch (err: any) {
      toast(`Failed to delete campaign: ${err.message}`, { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    // Validate that the required campaign_offer document exists
    const hasOffer = campaignDocs.some(d => d.document_type === 'campaign_offer');
    if (!hasOffer) {
      toast('Please upload the campaign offer brief document.', { type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      await createCampaign({
        id: tempCampaignId,
        name: newCampaignName,
        platform: newCampaignPlatform,
        description: newCampaignDesc,
        campaign_goal: newCampaignGoal,
        target_profile: {
          industries: targetIndustries.split(',').map(s => s.trim()).filter(Boolean),
          roles: targetRoles.split(',').map(s => s.trim()).filter(Boolean),
          company_size: targetCompanySize,
          geography: targetGeography,
          pain_points: targetPainPoints
        },
        status: 'Live',
        prospects: 0,
        replies: 0,
        closed: 0,
        last_active: 'Just now'
      });
      setShowCreateModal(false);
      setNewCampaignName('');
      setNewCampaignDesc('');
      setNewCampaignGoal('');
      setTargetIndustries('');
      setTargetRoles('');
      setTargetCompanySize('');
      setTargetGeography('');
      setTargetPainPoints('');
      toast('Campaign launched. Outreach begins shortly.', { type: 'success' });
    } catch (err: any) {
      toast(`Failed to create campaign: ${err.message}`, { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Sub-tab content rendering logic
  function RelatedTabContent({ campaignId }: { campaignId: string }) {
    const { prospects, loading: loadingProps } = useProspects(campaignId);
    const { conversations, loadingConversations: loadingConvs } = useConversations();
    
    // Filter conversations related to this campaign (by campaign_name match or prospect relation)
    const campaignConvs = conversations.filter(conv => {
      // Find if conversation's prospect belongs to this campaign
      const p = prospects.find(prop => prop.id === conv.prospect_id);
      return !!p || conv.campaign_name === selectedCampaign?.name;
    });

    if (loadingProps || loadingConvs) {
      return (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--accent-primary)]" size={24} />
        </div>
      );
    }

    if (activeTab === 'Prospects') {
      return prospects.length === 0 ? (
        <EmptyState headline="No prospects yet" body="Wagora is scanning social profiles for contacts matching this campaign." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
                <th className="px-5 py-3 font-semibold text-token-secondary">Name</th>
                <th className="px-5 py-3 font-semibold text-token-secondary">Company</th>
                <th className="px-5 py-3 font-semibold text-token-secondary">Role</th>
                <th className="px-5 py-3 font-semibold text-token-secondary">Status</th>
              </tr>
            </thead>
            <tbody>
              {prospects.map(p => (
                <tr key={p.id} className="border-b border-[var(--border-subtle)] last:border-none hover:bg-[var(--surface-container-low)]">
                  <td className="px-5 py-3 text-token-primary font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-token-secondary">{p.company || '—'}</td>
                  <td className="px-5 py-3 text-token-secondary">{p.role || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'Conversations') {
      return campaignConvs.length === 0 ? (
        <EmptyState headline="No conversations yet" body="No replies or active engagements are registered for this campaign." />
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {campaignConvs.map(c => (
            <div key={c.id} className="p-4 hover:bg-[var(--surface-elevated)] transition-colors flex justify-between items-start">
              <div>
                <p className="font-semibold text-sm text-token-primary">{c.prospect_name}</p>
                <p className="text-xs text-token-secondary mt-0.5">{c.last_message || 'No messages yet'}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div className="w-32 h-8 bg-[var(--surface-elevated)] rounded animate-pulse" />
          <div className="w-24 h-10 bg-[var(--surface-elevated)] rounded animate-pulse" />
        </div>
        <div className="h-64 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-lg)] animate-pulse" />
      </div>
    );
  }

  // Detail view
  if (selectedCampaign) {
    const c = selectedCampaign;
    const tabs = ['Overview', 'Prospects', 'Conversations'];

    return (
      <div className="p-4 sm:p-8 space-y-6">
        <button onClick={() => setSelectedCampaignId(null)} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft size={16} /> Back to campaigns
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">{c.name}</h1>
              <StatusBadge status={c.status} size="md" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{c.description}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Gmail not connected — hide launch, show banner button */}
            {(c.status === 'Draft' || c.status === 'Paused') && gmailConnected === false && (
              <button
                onClick={() => navigate('/settings?tab=platforms')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-md)] bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                <Mail size={14} /> Connect Gmail to launch
              </button>
            )}
            {/* Gmail connected or status unknown (null) — show normal buttons */}
            {c.status === 'Draft' && gmailConnected !== false && (
              <button 
                onClick={() => handleLaunchCampaign(c.id)} 
                disabled={actionLoading || gmailStatusLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Launch outreach
              </button>
            )}
            {c.status === 'Paused' && gmailConnected !== false && (
              <button 
                onClick={() => handleLaunchCampaign(c.id)} 
                disabled={actionLoading || gmailStatusLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Resume outreach
              </button>
            )}
            {c.status === 'Live' && (
              <button 
                onClick={() => setShowPauseModal(true)} 
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-colors"
              >
                <Pause size={14} /> Pause outreach
              </button>
            )}
            <button 
              onClick={() => handleDuplicate(c)} 
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-colors"
            >
              <Copy size={14} /> Duplicate
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)} 
              disabled={actionLoading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--destructive)] hover:bg-[rgba(229,62,62,0.08)] transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>

        {/* Gmail not connected banner — shown below the header, above other alerts */}
        {gmailConnected === false && (c.status === 'Draft' || c.status === 'Paused') && (
          <div className="p-4 rounded-[var(--radius-md)] border border-amber-500 bg-amber-500/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Mail size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-500">Gmail account not connected</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Connect your Gmail account to start sending outreach emails from your own address.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/settings?tab=platforms')}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              Go to Settings <ArrowRight size={12} />
            </button>
          </div>
        )}

        {missingOfferDoc && (
          <div className="p-4 rounded-[var(--radius-md)] border border-[var(--destructive)] bg-red-500/5 text-sm space-y-1">
            <h4 className="font-semibold text-[var(--destructive)] flex items-center gap-1.5"><ShieldAlert size={16} /> Campaign offer document required</h4>
            <p className="text-xs text-[var(--text-secondary)]">You must upload a Campaign Offer Brief in Step 3 of the campaign creation wizard or Settings before launching outreach.</p>
          </div>
        )}
        
        {launchError === 'upgrade_required' && (
          <div className="p-4 rounded-[var(--radius-md)] border border-amber-500 bg-amber-500/5 text-sm space-y-1">
            <h4 className="font-semibold text-amber-500 flex items-center gap-1.5"><ShieldAlert size={16} /> Daily limit reached</h4>
            <p className="text-xs text-[var(--text-secondary)]">You have reached your plan's daily email limit. Free accounts can send 20 outreach emails per day. Upgrade to Starter, Growth, or Agency for higher daily limits.</p>
          </div>
        )}

        {launchError === 'limit_reached' && (
          <div className="p-4 rounded-[var(--radius-md)] border border-amber-500 bg-amber-500/5 text-sm space-y-1">
            <h4 className="font-semibold text-amber-500 flex items-center gap-1.5"><ShieldAlert size={16} /> Daily email limit reached</h4>
            <p className="text-xs text-[var(--text-secondary)]">Daily outreach limit reached. Outreach resumes tomorrow.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[var(--border-default)] overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); }}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t
                  ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Prospects', value: outreachStatus ? outreachStatus.total_prospects.toString() : c.prospects.toString() },
                { label: 'Replies', value: c.replies.toString() },
                { label: 'Closed', value: c.closed.toString() },
                { label: 'Reply rate', value: c.prospects > 0 ? `${Math.round((c.replies / c.prospects) * 100)}%` : '—' },
              ].map((m, i) => (
                <div key={i} className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-2">{m.label}</p>
                  <p className="font-clash text-xl font-bold text-[var(--text-primary)]">{m.value}</p>
                </div>
              ))}
            </div>

            {outreachStatus && (
              <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5 space-y-4">
                <h3 className="font-clash font-bold text-[var(--text-primary)]">Outreach execution status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
                  <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Contacted</p>
                    <p className="text-lg font-clash font-bold text-[var(--accent-primary)] mt-1">{outreachStatus.contacted}</p>
                  </div>
                  <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Pending in Queue</p>
                    <p className="text-lg font-clash font-bold text-[var(--text-primary)] mt-1">{outreachStatus.pending}</p>
                  </div>
                  <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Failed Sends</p>
                    <p className="text-lg font-clash font-bold text-[var(--destructive)] mt-1">{outreachStatus.failed}</p>
                  </div>
                  <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded-lg">
                    <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase">Daily Sends Used</p>
                    <p className="text-lg font-clash font-bold text-[var(--text-primary)] mt-1">{outreachStatus.daily_sends_used} / {outreachStatus.daily_sends_used + outreachStatus.daily_sends_remaining}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-5">
              <h3 className="font-clash font-bold text-[var(--text-primary)] mb-2">Campaign details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-[var(--text-muted)]">Platform:</span> <span className="text-[var(--text-primary)] ml-2">{c.platform}</span></div>
                <div><span className="text-[var(--text-muted)]">Created:</span> <span className="text-[var(--text-primary)] ml-2">{new Date(c.created_at).toLocaleDateString()}</span></div>
                <div><span className="text-[var(--text-muted)]">Last active:</span> <span className="text-[var(--text-primary)] ml-2">{c.last_active}</span></div>
                <div><span className="text-[var(--text-muted)]">Status:</span> <span className="ml-2"><StatusBadge status={c.status} /></span></div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab !== 'Overview' && (
          <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
            <RelatedTabContent campaignId={c.id} />
          </div>
        )}

        {/* Pause/Resume Modal */}
        <Modal open={showPauseModal} onClose={() => setShowPauseModal(false)}>
          <div className="p-6 space-y-4">
            <h2 className="font-clash text-lg font-bold text-[var(--text-primary)]">
              {c.status === 'Paused' ? 'Resume this campaign?' : 'Pause this campaign?'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {c.status === 'Paused'
                ? 'Wagora will resume outreach and prospect scraping immediately.'
                : 'Wagora stops all outreach immediately. Conversations already in progress are not affected.'}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePauseToggle}
                disabled={actionLoading}
                className={`flex-1 text-white py-2 rounded-[var(--radius-md)] text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity ${
                  c.status === 'Paused' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--status-paused)]'
                }`}
              >
                {c.status === 'Paused' ? 'Resume' : 'Pause'}
              </button>
              <button onClick={() => setShowPauseModal(false)} className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--surface-card)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <div className="p-6 space-y-4">
            <h2 className="font-clash text-lg font-bold text-[var(--text-primary)]">Delete this campaign?</h2>
            <p className="text-sm text-[var(--text-secondary)]">Permanently deletes the campaign, all prospect data, and all conversation history. Cannot be undone.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={handleDelete} disabled={actionLoading} className="flex-1 bg-[var(--destructive)] text-white py-2 rounded-[var(--radius-md)] text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">Delete permanently</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--surface-card)] transition-colors">Cancel</button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // List view
  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Campaigns</h1>
        <button onClick={handleOpenCreateModal} className="flex items-center gap-2 bg-[var(--accent-primary)] text-white px-4 py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors">
          <Plus size={16} /> New campaign
        </button>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns"
            className="w-full pl-10 pr-4 py-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 transition-all"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {statusFilters.map(f => (
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

      {filtered.length === 0 ? (
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
          <EmptyState
            headline="No campaigns."
            body="Create a campaign and Wagora finds the clients."
            cta="New campaign"
            onAction={handleOpenCreateModal}
          />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  {['Campaign', 'Platform', 'Prospects', 'Replies', 'Closed', 'Status', 'Last active'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => { setSelectedCampaignId(c.id); setActiveTab('Overview'); }}
                    className="border-b border-[var(--border-subtle)] last:border-none hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          <Megaphone size={14} className="text-[var(--text-muted)]" />
                        </div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{c.platform}</td>
                    <td className="px-5 py-4 text-sm font-mono text-[var(--text-primary)]">{c.prospects}</td>
                    <td className="px-5 py-4 text-sm font-mono text-[var(--text-primary)]">{c.replies}</td>
                    <td className="px-5 py-4 text-sm font-mono text-[var(--text-primary)]">{c.closed}</td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">{c.last_active}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => { setSelectedCampaignId(c.id); setActiveTab('Overview'); }}
                className="bg-[var(--surface-card)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[var(--text-primary)] text-sm">{c.name}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span>{c.platform}</span>
                  <span>{c.prospects} prospects</span>
                  <span>{c.replies} replies</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">{c.last_active}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create Campaign Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-clash text-lg font-bold text-[var(--text-primary)]">New campaign</h2>
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Step {modalStep} of 3</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Configure your campaign targets and materials.</p>
            <div className="flex gap-1 mt-3">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex-1 h-1 rounded-full transition-all" style={{ backgroundColor: step <= modalStep ? 'var(--accent-primary)' : 'var(--border-default)' }} />
              ))}
            </div>
          </div>

          {/* STEP 1: Campaign Identity & Goal */}
          {modalStep === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Campaign name</label>
                <input
                  type="text"
                  required
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                  placeholder="Lagos E-commerce Founders"
                  disabled={actionLoading}
                  className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Email', 'LinkedIn', 'Instagram'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewCampaignPlatform(p)}
                      disabled={actionLoading}
                      className={`py-2 rounded-[var(--radius-md)] border text-xs font-semibold transition-all disabled:opacity-50 ${
                        newCampaignPlatform === p
                          ? 'border-[var(--accent-primary)] bg-[rgba(0,200,150,0.08)] text-[var(--text-primary)]'
                          : 'border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Description</label>
                <textarea
                  value={newCampaignDesc}
                  onChange={e => setNewCampaignDesc(e.target.value)}
                  disabled={actionLoading}
                  placeholder="Targeting e-commerce founders in Lagos for brand identity packages."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 resize-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Campaign Goal</label>
                <input
                  type="text"
                  value={newCampaignGoal}
                  onChange={e => setNewCampaignGoal(e.target.value)}
                  placeholder="Schedule 10 discovery calls for brand identity services"
                  disabled={actionLoading}
                  className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Who This is For */}
          {modalStep === 2 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Target Industries (comma separated)</label>
                <input
                  type="text"
                  value={targetIndustries}
                  onChange={e => setTargetIndustries(e.target.value)}
                  placeholder="E-commerce, Retail, D2C"
                  disabled={actionLoading}
                  className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Target Roles and Job Titles (comma separated)</label>
                <input
                  type="text"
                  value={targetRoles}
                  onChange={e => setTargetRoles(e.target.value)}
                  placeholder="Founder, CEO, VP Growth"
                  disabled={actionLoading}
                  className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Company Size</label>
                  <input
                    type="text"
                    value={targetCompanySize}
                    onChange={e => setTargetCompanySize(e.target.value)}
                    placeholder="10-150 employees"
                    disabled={actionLoading}
                    className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Geography / Location</label>
                  <input
                    type="text"
                    value={targetGeography}
                    onChange={e => setTargetGeography(e.target.value)}
                    placeholder="Lagos, London"
                    disabled={actionLoading}
                    className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Key Pain Points</label>
                <textarea
                  value={targetPainPoints}
                  onChange={e => setTargetPainPoints(e.target.value)}
                  placeholder="High acquisition costs, inconsistent messaging, slow pipeline growth"
                  disabled={actionLoading}
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 resize-none disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Campaign Documents */}
          {modalStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { key: 'campaign_offer', name: 'What I am Offering', desc: 'Campaign offer brief (max 5MB)', maxSize: 5, required: true },
                  { key: 'faq', name: 'Common Questions and Answers', desc: 'FAQ document (max 5MB)', maxSize: 5, required: false },
                  { key: 'objection_handling', name: 'Why People Hesitate', desc: 'Objection handling guide (max 5MB)', maxSize: 5, required: false }
                ].map(type => {
                  const doc = campaignDocs.find(d => d.document_type === type.key);
                  const isUploading = uploadingDocType === type.key;
                  const error = docErrors[type.key];

                  return (
                    <div key={type.key} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">{type.name}</span>
                            {type.required && (
                              <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[8px] font-bold uppercase tracking-wider">Required</span>
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)]">{type.desc}</p>
                        </div>

                        <div>
                          {doc ? (
                            <button
                              type="button"
                              onClick={() => handleDocDelete(doc.id, doc.storage_path)}
                              className="text-[10px] font-bold text-[var(--destructive)] hover:underline cursor-pointer bg-transparent border-none p-0"
                            >
                              Remove
                            </button>
                          ) : (
                            <label className={`text-[10px] font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] cursor-pointer flex items-center gap-1 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                              {isUploading ? (
                                <>
                                  <Loader2 size={10} className="animate-spin" /> Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload size={10} /> Upload
                                </>
                              )}
                              <input
                                type="file"
                                accept=".pdf,.docx,.txt"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleDocUpload(file, type.key, type.maxSize);
                                }}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {doc && (
                        <div className="flex items-center justify-between bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] p-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText size={12} className="text-[var(--text-muted)] shrink-0" />
                            <span className="text-[10px] text-[var(--text-primary)] truncate font-medium">{doc.name}</span>
                            <span className="text-[9px] text-[var(--text-muted)] shrink-0 font-mono">({doc.size})</span>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            doc.status === 'Active' 
                              ? 'bg-[rgba(0,200,150,0.1)] text-[var(--accent-primary)]' 
                              : doc.status === 'Processing' 
                              ? 'bg-amber-500/10 text-amber-500 animate-pulse' 
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      )}

                      {error && (
                        <p className="text-[9px] font-semibold text-[var(--destructive)] flex items-center gap-1">
                          <ShieldAlert size={9} /> {error}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Checklist / Warning Card */}
              <div className="p-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] space-y-2">
                <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Launch checklist</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${campaignDocs.some(d => d.document_type === 'campaign_offer') ? 'bg-[rgba(0,200,150,0.1)] border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-[var(--border-default)] text-[var(--text-muted)]'}`}>
                      {campaignDocs.some(d => d.document_type === 'campaign_offer') && <Check size={10} />}
                    </div>
                    <span className={campaignDocs.some(d => d.document_type === 'campaign_offer') ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                      Upload campaign offer brief (Required)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${campaignDocs.some(d => d.document_type === 'campaign_offer' && d.status === 'Active') ? 'bg-[rgba(0,200,150,0.1)] border-[var(--accent-primary)] text-[var(--accent-primary)]' : 'border-[var(--border-default)] text-[var(--text-muted)]'}`}>
                      {campaignDocs.some(d => d.document_type === 'campaign_offer' && d.status === 'Active') && <Check size={10} />}
                    </div>
                    <span className={campaignDocs.some(d => d.document_type === 'campaign_offer' && d.status === 'Active') ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
                      Offer brief parsing active status
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepped Navigation */}
          <div className="flex gap-3 pt-2">
            {modalStep > 1 ? (
              <button
                type="button"
                onClick={() => setModalStep(prev => prev - 1)}
                className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--surface-card)] transition-colors"
              >
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--surface-card)] transition-colors"
              >
                Cancel
              </button>
            )}

            {modalStep < 3 ? (
              <button
                type="button"
                onClick={() => setModalStep(prev => prev + 1)}
                disabled={modalStep === 1 && !newCampaignName.trim()}
                className="flex-1 bg-[var(--accent-primary)] disabled:opacity-50 text-white py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors"
              >
                Continue
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={actionLoading || !campaignDocs.some(d => d.document_type === 'campaign_offer')}
                className="flex-1 bg-[var(--accent-primary)] disabled:opacity-50 text-white py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <><Loader2 size={14} className="animate-spin" /> Launching...</> : 'Launch campaign'}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
