import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function WorkspaceSettings() {
  const { toast } = useToast();
  const { profile, refreshProfile, signOut } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    timezone: 'WAT (UTC+1)',
    language: 'English',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        businessName: profile.business_name || '',
        industry: profile.industry || '',
        timezone: 'WAT (UTC+1)',
        language: 'English',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: formData.businessName,
          industry: formData.industry,
        })
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      toast('Workspace settings updated.', { type: 'success' });
    } catch (err: any) {
      toast(`Failed to update workspace: ${err.message}`, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      // In a real app, we would call a RPC or function to delete user auth data
      // For this implementation, we will delete data owned by the user, then sign out
      const { error: profileDeleteErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profile.id);

      if (profileDeleteErr) throw profileDeleteErr;

      toast('Workspace deleted.', { type: 'success' });
      setShowDelete(false);
      await signOut();
    } catch (err: any) {
      toast(`Deletion failed: ${err.message}`, { type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <h2 className="font-clash font-bold text-[var(--text-primary)] mb-4">Workspace</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Workspace name</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Industry</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Time zone</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
            >
              <option>WAT (UTC+1)</option>
              <option>EST (UTC-5)</option>
              <option>PST (UTC-8)</option>
              <option>GMT (UTC+0)</option>
              <option>CET (UTC+1)</option>
              <option>IST (UTC+5:30)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Default language</label>
            <select
              value={formData.language}
              onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
            >
              <option>English</option>
              <option>French</option>
              <option>Spanish</option>
              <option>Portuguese</option>
            </select>
          </div>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="flex items-center gap-2 bg-[var(--accent-primary)] text-white px-5 py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors mt-2 cursor-pointer disabled:opacity-55"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--destructive)] shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-[var(--destructive)]" />
          <h2 className="font-clash font-bold text-[var(--destructive)]">Danger zone</h2>
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-3">Delete workspace</h3>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Permanently deletes this workspace and all data. Cannot be undone.</p>
        <button
          onClick={() => setShowDelete(true)}
          className="mt-4 px-4 py-2 bg-[var(--destructive)] text-white rounded-[var(--radius-md)] text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Delete workspace
        </button>
      </div>

      {/* Delete Modal */}
      <Modal open={showDelete} onClose={() => { setShowDelete(false); setDeleteInput(''); }}>
        <div className="p-6 space-y-4">
          <h2 className="font-clash text-lg font-bold text-[var(--text-primary)]">Delete this workspace?</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            All campaigns, prospects, conversations, and analytics are permanently deleted. No recovery. Type WAGORA to confirm.
          </p>
          <input
            type="text"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
            placeholder="Type WAGORA"
            className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--destructive)] focus:ring-opacity-30"
          />
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleDeleteWorkspace}
              disabled={deleteInput !== 'WAGORA' || actionLoading}
              className={`flex-1 py-2 rounded-[var(--radius-md)] text-sm font-bold transition-all ${
                deleteInput === 'WAGORA'
                  ? 'bg-[var(--destructive)] text-white hover:opacity-90 cursor-pointer'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              {actionLoading && <Loader2 size={12} className="animate-spin inline mr-1" />}
              Delete permanently
            </button>
            <button onClick={() => { setShowDelete(false); setDeleteInput(''); }} className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--surface-card)] transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
