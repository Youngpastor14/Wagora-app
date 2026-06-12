import { useState, useEffect } from 'react';
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { useToast } from '@/components/ui/Toast';
import { Loader2 } from 'lucide-react';

export default function OutreachSettings() {
  const { toast } = useToast();
  const { settings, updateSettings, loading } = useWorkspaceSettings();
  const [limits, setLimits] = useState({ emailDaily: '30', linkedinDaily: '20', instagramDaily: '15' });
  const [followups, setFollowups] = useState({ day1: '3', day2: '7', day3: '14' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      // In a real DB, these can be stored inside connected_platforms metadata or notification_prefs
      // For this implementation, we read them and fall back to defaults
      const prefs = (settings.notification_prefs as any) || {};
      setLimits({
        emailDaily: String(prefs.emailDaily || settings.daily_outreach_limit || 30),
        linkedinDaily: String(prefs.linkedinDaily || 20),
        instagramDaily: String(prefs.instagramDaily || 15)
      });
      setFollowups({
        day1: String(prefs.followupDay1 || 3),
        day2: String(prefs.followupDay2 || 7),
        day3: String(prefs.followupDay3 || 14)
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const emailLimitNum = parseInt(limits.emailDaily) || 30;
      const linkedinLimitNum = parseInt(limits.linkedinDaily) || 20;
      const instagramLimitNum = parseInt(limits.instagramDaily) || 15;
      
      const totalLimit = emailLimitNum + linkedinLimitNum + instagramLimitNum;

      await updateSettings({
        daily_outreach_limit: totalLimit,
        notification_prefs: {
          ...(settings?.notification_prefs as any || {}),
          emailDaily: emailLimitNum,
          linkedinDaily: linkedinLimitNum,
          instagramDaily: instagramLimitNum,
          followupDay1: parseInt(followups.day1) || 3,
          followupDay2: parseInt(followups.day2) || 7,
          followupDay3: parseInt(followups.day3) || 14
        }
      });

      toast('Outreach settings updated.', { type: 'success' });
    } catch (err: any) {
      toast(`Save failed: ${err.message}`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--accent-primary)]" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <h2 className="font-clash font-bold text-[var(--text-primary)] mb-1">Outreach limits</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Wagora respects these limits to keep accounts safe and outreach human-paced.</p>
        <div className="space-y-4 font-sans">
          {[
            { label: 'Email — daily limit', key: 'emailDaily' as const },
            { label: 'LinkedIn — daily limit', key: 'linkedinDaily' as const },
            { label: 'Instagram — daily limit', key: 'instagramDaily' as const },
          ].map(f => (
            <div key={f.key} className="flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--text-primary)]">{f.label}</label>
              <input 
                type="number" 
                value={limits[f.key]} 
                onChange={e => setLimits(prev => ({ ...prev, [f.key]: e.target.value }))} 
                className="w-20 px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-center text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30" 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <h2 className="font-clash font-bold text-[var(--text-primary)] mb-1">Follow-up intervals</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">If a prospect does not reply, Wagora follows up at these intervals. Stops on first reply.</p>
        <div className="flex gap-3 font-sans">
          {Object.entries(followups).map(([key, val], i) => (
            <div key={key} className="flex-1">
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Follow-up {i + 1}</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-[var(--text-muted)]">Day</span>
                <input 
                  type="number" 
                  value={val} 
                  onChange={e => setFollowups(prev => ({ ...prev, [key]: e.target.value }))} 
                  className="w-14 px-2 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-center text-[var(--text-primary)] font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 bg-[var(--accent-primary)] text-white px-5 py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer disabled:opacity-55"
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        Save settings
      </button>
    </div>
  );
}
