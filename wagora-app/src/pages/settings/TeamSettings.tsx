import { Users, Plus, Shield } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

export default function TeamSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-clash font-bold text-[var(--text-primary)]">Team</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">Manage who has access to this workspace.</p>
          </div>
          <button className="flex items-center gap-2 bg-[var(--accent-primary)] text-white px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-bold hover:bg-[var(--accent-primary-hover)] transition-colors">
            <Plus size={14} /> Invite
          </button>
        </div>

        {/* Current user */}
        <div className="divide-y divide-[var(--border-subtle)]">
          <div className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--text-secondary)]">AC</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Alex Chen</p>
              <p className="text-xs text-[var(--text-muted)]">alex@fortexforge.com</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgba(232,255,74,0.15)] text-[10px] font-bold text-[var(--text-primary)]">
                <Shield size={10} /> Owner
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <h2 className="font-clash font-bold text-[var(--text-primary)] mb-1">Pending invitations</h2>
        <EmptyState headline="No pending invitations." body="Invite team members to collaborate on this workspace." />
      </div>
    </div>
  );
}
