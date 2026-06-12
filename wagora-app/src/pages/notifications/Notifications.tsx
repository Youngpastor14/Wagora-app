import { useState } from 'react';
import { Handshake, Phone, MessageSquare, Flag, BarChart3, AlertTriangle, WifiOff, DollarSign, CheckCheck } from 'lucide-react';
import { notifications } from '@/data/mockData';
import EmptyState from '@/components/ui/EmptyState';

const typeIcons: Record<string, typeof Handshake> = {
  deal_closed: Handshake,
  call_booked: Phone,
  new_reply: MessageSquare,
  input_needed: Flag,
  campaign_complete: BarChart3,
  limit_reached: AlertTriangle,
  platform_disconnected: WifiOff,
  payment_confirmed: DollarSign,
};

const typeColors: Record<string, string> = {
  deal_closed: 'var(--accent-primary)',
  call_booked: '#818cf8',
  new_reply: 'var(--accent-primary)',
  input_needed: 'var(--destructive)',
  campaign_complete: 'var(--accent-primary)',
  limit_reached: 'var(--status-paused)',
  platform_disconnected: 'var(--destructive)',
  payment_confirmed: 'var(--accent-primary)',
};

export default function Notifications() {
  const [items, setItems] = useState(notifications);
  const unreadCount = items.filter(n => !n.read).length;

  const markAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Group by time
  const today = items.filter(n => n.timestamp.includes('min') || n.timestamp.includes('hour'));
  const yesterday = items.filter(n => n.timestamp.includes('1 day'));
  const earlier = items.filter(n => !n.timestamp.includes('min') && !n.timestamp.includes('hour') && !n.timestamp.includes('1 day'));

  const renderGroup = (label: string, group: typeof items) => {
    if (group.length === 0) return null;
    return (
      <div>
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] px-5 py-2">{label}</h3>
        <div className="divide-y divide-[var(--border-subtle)]">
          {group.map(n => {
            const Icon = typeIcons[n.type] || MessageSquare;
            const color = typeColors[n.type] || 'var(--text-muted)';
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-5 py-3.5 transition-colors cursor-pointer hover:bg-[var(--surface-elevated)] ${
                  !n.read ? 'bg-[rgba(0,200,150,0.03)]' : ''
                }`}
                onClick={() => setItems(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item))}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
                >
                  <Icon size={14} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-relaxed ${!n.read ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                    {n.message}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{n.timestamp}</p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-clash text-2xl font-bold text-[var(--text-primary)]">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-[var(--text-secondary)] mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
          <EmptyState
            headline="No notifications."
            body="Wagora notifies you when something needs attention or a deal is closed."
          />
        </div>
      ) : (
        <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] border border-[var(--border-default)] shadow-[var(--shadow-card)] overflow-hidden">
          {renderGroup('Today', today)}
          {renderGroup('Yesterday', yesterday)}
          {renderGroup('Earlier', earlier)}
        </div>
      )}
    </div>
  );
}
