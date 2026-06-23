import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import type { Database } from '@/lib/supabase/types';

type BrandDoc = Database['public']['Tables']['brand_documents']['Row'];

export default function BrandDocuments() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [docs, setDocs] = useState<BrandDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docToDelete = docs.find(d => d.id === deleteId);

  const fetchDocs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brand_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocs(data || []);
    } catch {
      // Silent fail — empty state is shown when docs can't be fetched
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [user]);

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check size limit: 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast("File too large. Maximum size is 50MB.", { type: 'error' });
      return;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop() || 'txt';
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

    try {
      // 1. Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('brand-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Insert record into database
      const { data: newDoc, error: insertError } = await supabase
        .from('brand_documents')
        .insert({
          name: file.name,
          file_type: fileExt.toUpperCase(),
          size: `${fileSizeMB} MB`,
          storage_path: filePath,
          status: 'Active',
          user_id: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setDocs(prev => [newDoc, ...prev]);
      toast("Document uploaded successfully.", { type: 'success' });
    } catch (err: any) {
      toast(`Upload failed: ${err.message}`, { type: 'error' });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!deleteId || !docToDelete) return;
    try {
      // 1. Remove from storage
      await supabase.storage
        .from('brand-documents')
        .remove([docToDelete.storage_path]);

      // 2. Delete from database
      const { error } = await supabase
        .from('brand_documents')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setDocs(prev => prev.filter(d => d.id !== deleteId));
      toast("Document deleted.", { type: 'success' });
    } catch (err: any) {
      toast(`Failed to delete: ${err.message}`, { type: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent-primary)]" size={24} />
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (docs.length === 0) {
    return (
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-clash font-bold text-[var(--text-primary)]">Brand documents</h2>
          <button 
            onClick={handleAddClick}
            disabled={uploading}
            className="flex items-center gap-2 bg-[var(--accent-primary)] text-white px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer disabled:opacity-55"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Add document
          </button>
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.docx,.txt,.jpeg,.png,.jpg"
          className="hidden" 
        />
        <EmptyState
          headline="No documents."
          body="Add brand documents so Wagora can represent you accurately."
          cta="Add document"
          onAction={handleAddClick}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-clash font-bold text-[var(--text-primary)]">Brand documents</h2>
          <button 
            onClick={handleAddClick}
            disabled={uploading}
            className="flex items-center gap-2 bg-[var(--accent-primary)] text-white px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer disabled:opacity-55"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Add document
          </button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Wagora uses these to write outreach and handle conversations in your voice.</p>
        <p className="text-xs text-[var(--text-muted)] mb-4">PDF, DOCX, TXT, PNG, JPEG — 50MB max per file</p>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".pdf,.docx,.txt,.jpeg,.png,.jpg"
          className="hidden" 
        />

        <div className="divide-y divide-[var(--border-subtle)]">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 py-3 font-sans">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                <FileText size={18} className="text-[var(--text-muted)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{doc.name}</p>
                <p className="text-xs text-[var(--text-muted)] font-mono">{doc.file_type} · {doc.size} · {formatDate(doc.uploaded_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="group relative">
                  <StatusBadge status={doc.status} />
                  {doc.status === 'Processing' && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-sm)] shadow-[var(--shadow-elevated)] text-[10px] text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity z-10 text-center">
                      Wagora is reading this document. Active within a few minutes.
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setDeleteId(doc.id)}
                  className="text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors cursor-pointer" 
                  title="Remove document"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)}>
        <div className="p-6 space-y-4">
          <h2 className="font-clash text-lg font-bold text-[var(--text-primary)]">Delete document?</h2>
          <p className="text-sm text-[var(--text-secondary)] font-sans">
            Are you sure you want to delete <span className="font-semibold text-[var(--text-primary)]">"{docToDelete?.name}"</span>? Wagora will no longer use this document to learn your brand voice.
          </p>
          <div className="flex gap-3 pt-2">
            <button 
              onClick={confirmDelete} 
              className="flex-1 bg-[var(--destructive)] text-white py-2 rounded-[var(--radius-md)] text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Delete permanently
            </button>
            <button 
              onClick={() => setDeleteId(null)} 
              className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
