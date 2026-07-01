import { useState, useEffect } from 'react';
import { Mail, Globe, Camera, Check, WifiOff, Loader2 } from 'lucide-react';
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

interface Platform {
  id: string;
  name: string;
  icon: any;
  description: string;
  connected: boolean;
  account?: string;
  placeholder: string;
}

const platformTemplates = [
  { id: 'email', name: 'Email', icon: Mail, description: 'Primary channel. Highest deliverability. Recommended.', placeholder: 'Enter email address (e.g. name@company.com)' },
  { id: 'linkedin', name: 'LinkedIn', icon: Globe, description: 'Strong for B2B. Requires account connection.', placeholder: 'Enter LinkedIn profile name or URL' },
  { id: 'instagram', name: 'Instagram', icon: Camera, description: 'Best for creative and consumer-facing brands.', placeholder: 'Enter Instagram handle (e.g. @brand)' },
];

export default function PlatformSettings() {
  const { toast } = useToast();
  const { settings, updateSettings, loading } = useWorkspaceSettings();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [connectId, setConnectId] = useState<string | null>(null);
  const [accountInput, setAccountInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      const connected = (settings.connected_platforms as any) || {};
      const list = platformTemplates.map(t => ({
        ...t,
        connected: !!connected[t.id],
        account: connected[t.id] || undefined
      }));
      setPlatforms(list);
    }
  }, [settings]);

  const platformToDisconnect = platforms.find(p => p.id === disconnectId);
  const platformToConnect = platforms.find(p => p.id === connectId);

  const handleDisconnect = async () => {
    if (!disconnectId || !settings) return;
    setSaving(true);
    try {
      const currentConnected = { ...(settings.connected_platforms as any || {}) };
      delete currentConnected[disconnectId];

      await updateSettings({
        connected_platforms: currentConnected
      });

      const target = platforms.find(p => p.id === disconnectId);
      toast(`${target?.name} disconnected. Outreach paused on this channel.`, { type: 'success' });
      setDisconnectId(null);
    } catch (err: any) {
      toast(`Disconnect failed: ${err.message}`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectId || !accountInput.trim() || !settings) return;
    setSaving(true);
    try {
      const currentConnected = { 
        ...(settings.connected_platforms as any || {}),
        [connectId]: accountInput.trim()
      };

      await updateSettings({
        connected_platforms: currentConnected
      });

      const target = platforms.find(p => p.id === connectId);
      toast(`${target?.name} connected successfully. Outreach activated.`, { type: 'success' });
      setConnectId(null);
      setAccountInput('');
    } catch (err: any) {
      toast(`Connection failed: ${err.message}`, { type: 'error' });
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
    <div className="space-y-4">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <h2 className="font-clash font-bold text-[var(--text-primary)] mb-4">Platforms</h2>
        <div className="space-y-4 font-sans">
          {platforms.map(p => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--surface-card)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                  <p.icon size={20} className="text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{p.name}</h3>
                    {p.connected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--success)]">
                        <Check size={10} /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
                        <WifiOff size={10} /> Not connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{p.description}</p>
                  {p.connected && p.account && (
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Connected as {p.account}</p>
                  )}
                </div>
              </div>
              {p.connected ? (
                <button
                  onClick={() => setDisconnectId(p.id)}
                  disabled={saving}
                  className="w-full sm:w-auto px-3 py-2 sm:py-1.5 text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:text-[var(--destructive)] hover:border-[var(--destructive)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : (
                <button 
                  onClick={() => { setConnectId(p.id); setAccountInput(''); }}
                  disabled={saving}
                  className="w-full sm:w-auto px-3 py-2 sm:py-1.5 text-xs font-bold rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Connect account
                </button>
              )}
            </div>
          ))}

        </div>
      </div>

      {/* Disconnect Modal */}
      <Modal open={!!disconnectId} onClose={() => setDisconnectId(null)}>
        <div className="p-6 space-y-4">
          <h2 className="font-clash text-lg font-bold text-[var(--text-primary)]">
            Disconnect {platformToDisconnect?.name}?
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Wagora pauses all outreach on this channel immediately. Active conversations are not affected.
          </p>
          <div className="flex gap-3 pt-2">
            <button 
              onClick={handleDisconnect} 
              disabled={saving}
              className="flex-1 bg-[var(--destructive)] text-white py-2 rounded-[var(--radius-md)] text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Disconnect
            </button>
            <button 
              onClick={() => setDisconnectId(null)} 
              className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Connect Modal */}
      <Modal open={!!connectId} onClose={() => setConnectId(null)}>
        <form onSubmit={handleConnect} className="p-6 space-y-4">
          <h2 className="font-clash text-lg font-bold text-[var(--text-primary)]">
            Connect {platformToConnect?.name}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Configure the account handle or identity Wagora should use to run your campaign outreach.
          </p>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1.5">Account Identity</label>
            <input
              type="text"
              required
              value={accountInput}
              onChange={(e) => setAccountInput(e.target.value)}
              placeholder={platformToConnect?.placeholder}
              className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              type="submit" 
              disabled={saving}
              className="flex-1 bg-[var(--accent-primary)] text-white py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              Connect
            </button>
            <button 
              type="button"
              onClick={() => setConnectId(null)} 
              className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--surface-card)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
