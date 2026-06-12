import { useState, useEffect } from 'react';
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import { useToast } from '@/components/ui/Toast';
import { Loader2 } from 'lucide-react';

const notifTypes = [
  { id: 'deal_closed', label: 'Deal closed', desc: 'When Wagora closes a deal.' },
  { id: 'call_booked', label: 'Call booked', desc: 'When a prospect books a call.' },
  { id: 'new_reply', label: 'New reply', desc: 'When a prospect replies.' },
  { id: 'input_needed', label: 'Input needed', desc: 'When Wagora flags a conversation for your attention.' },
  { id: 'campaign_complete', label: 'Campaign complete', desc: 'When a campaign finishes its run.' },
  { id: 'limit_reached', label: 'Limit reached', desc: 'When a monthly limit is hit.' },
  { id: 'platform_disconnect', label: 'Platform disconnected', desc: 'When a connected platform goes offline.' },
];

export default function NotificationSettings() {
  const { toast } = useToast();
  const { settings, updateSettings, loading } = useWorkspaceSettings();
  const [prefs, setPrefs] = useState<{ [key: string]: boolean }>({});
  const [emailDigest, setEmailDigest] = useState('daily');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      const dbPrefs = (settings.notification_prefs as any) || {};
      const initialPrefs: { [key: string]: boolean } = {};
      notifTypes.forEach(t => {
        initialPrefs[t.id] = dbPrefs[t.id] !== undefined ? dbPrefs[t.id] : true;
      });
      setPrefs(initialPrefs);
      setEmailDigest(dbPrefs.emailDigest || 'daily');
    }
  }, [settings]);

  const toggle = (id: string) => {
    setPrefs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        notification_prefs: {
          ...prefs,
          emailDigest
        }
      });
      toast('Notification preferences saved.', { type: 'success' });
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
        <h2 className="font-clash font-bold text-[var(--text-primary)] mb-1">Notifications</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Control what Wagora notifies you about.</p>
        <div className="space-y-3 font-sans">
          {notifTypes.map(p => {
            const enabled = prefs[p.id] !== false; // default true
            return (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{p.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
                </div>
                <button 
                  onClick={() => toggle(p.id)} 
                  className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-default)]'}`}
                >
                  <span 
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform`} 
                    style={{ left: enabled ? '22px' : '2px' }} 
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <h2 className="font-clash font-bold text-[var(--text-primary)] mb-1">Email digest</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Receive a summary of Wagora activity by email.</p>
        <div className="flex gap-2">
          {['Off', 'Daily', 'Weekly'].map(opt => (
            <button 
              key={opt} 
              onClick={() => setEmailDigest(opt.toLowerCase())} 
              className={`px-4 py-2 rounded-[var(--radius-md)] border text-sm font-semibold transition-all cursor-pointer ${
                emailDigest === opt.toLowerCase() 
                  ? 'border-[var(--accent-primary)] bg-[rgba(0,200,150,0.08)] text-[var(--accent-primary)]' 
                  : 'border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
              }`}
            >
              {opt}
            </button>
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
