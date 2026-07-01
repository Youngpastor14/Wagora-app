import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, MessageSquare, Handshake, Sparkles } from 'lucide-react';

const mobileNavItems = [
  { name: 'Home', path: '/dashboard', icon: LayoutDashboard, isAI: false },
  { name: 'Leads', path: '/prospects', icon: Users, isAI: false },
  { name: 'AI', path: '/ai-setup', icon: Sparkles, isAI: true },
  { name: 'Chats', path: '/conversations', icon: MessageSquare, isAI: false },
  { name: 'Deals', path: '/deals', icon: Handshake, isAI: false },
];

export default function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 w-full bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)] backdrop-blur-md border-t border-[var(--border-default)] z-50 flex items-start justify-around px-2 pt-2 pb-safe-nav" style={{ minHeight: '4rem' }}>
      {mobileNavItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              item.isAI
                ? isActive
                  ? 'text-white'
                  : 'text-[var(--accent-primary)]'
                : isActive
                  ? 'text-token-primary'
                  : 'text-token-muted hover:text-token-secondary'
            }`
          }
        >
          {({ isActive }) => (
            item.isAI ? (
              <div className={`flex flex-col items-center justify-center gap-0.5 -mt-4 w-14 h-14 rounded-2xl shadow-lg border-2 ${
                isActive
                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                  : 'bg-gradient-to-br from-[var(--accent-primary)] to-emerald-600 border-[var(--accent-primary)]'
              }`}>
                <item.icon size={22} className="text-white stroke-[2.5px]" />
                <span className="font-label-caps text-[9px] uppercase tracking-wider font-bold text-white">{item.name}</span>
              </div>
            ) : (
              <>
                <item.icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className="font-label-caps text-[10px] uppercase tracking-wider font-semibold">
                  {item.name}
                </span>
              </>
            )
          )}
        </NavLink>
      ))}
    </nav>
  );
}
