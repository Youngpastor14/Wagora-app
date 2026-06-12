import { useState } from 'react';
import { Shield, Key, Smartphone, Eye, EyeOff } from 'lucide-react';

export default function SecuritySettings() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [sessions] = useState([
    { device: 'Chrome on Windows', location: 'Lagos, Nigeria', lastActive: 'Now', current: true },
    { device: 'Safari on iPhone', location: 'Lagos, Nigeria', lastActive: '2 hours ago', current: false },
  ]);

  return (
    <div className="space-y-6">
      {/* Password */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key size={16} className="text-[var(--text-muted)]" />
          <h2 className="font-clash font-bold text-[var(--text-primary)]">Password</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Current password</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} placeholder="Enter current password" className="w-full px-3 py-2 pr-10 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30" />
              <button onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">New password</label>
            <input type="password" placeholder="Enter new password" className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Confirm new password</label>
            <input type="password" placeholder="Confirm new password" className="w-full px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30" />
          </div>
          <button className="bg-[var(--accent-primary)] text-white px-5 py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors">Update password</button>
        </div>
      </div>

      {/* Two-Factor */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-[var(--text-muted)]" />
            <div>
              <h2 className="font-clash font-bold text-[var(--text-primary)]">Two-factor authentication</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Add an extra layer of security to your account.</p>
            </div>
          </div>
          <button onClick={() => setTwoFA(!twoFA)} className={`relative w-10 h-5 rounded-full transition-colors ${twoFA ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-default)]'}`}>
            <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ left: twoFA ? '22px' : '2px' }} />
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-[var(--text-muted)]" />
          <h2 className="font-clash font-bold text-[var(--text-primary)]">Active sessions</h2>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {sessions.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{s.device}</p>
                <p className="text-xs text-[var(--text-muted)]">{s.location} · {s.lastActive}</p>
              </div>
              {s.current ? (
                <span className="text-[10px] font-bold text-[var(--accent-primary)] bg-[rgba(0,200,150,0.1)] px-2 py-0.5 rounded-full">This device</span>
              ) : (
                <button className="text-xs font-bold text-[var(--destructive)] hover:text-[var(--text-primary)] transition-colors">Revoke</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
