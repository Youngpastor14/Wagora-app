import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  MessageSquare, 
  Handshake, 
  Receipt,
  Phone,
  BarChart3, 
  Settings, 
  HelpCircle, 
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Setup', path: '/ai-setup', icon: Sparkles, isAI: true },
  { name: 'Campaigns', path: '/campaigns', icon: Megaphone },
  { name: 'Prospects', path: '/prospects', icon: Users },
  { name: 'Conversations', path: '/conversations', icon: MessageSquare },
  { name: 'Deals', path: '/deals', icon: Handshake },
  { name: 'Invoices', path: '/invoices', icon: Receipt },
  { name: 'Calls', path: '/calls', icon: Phone },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
];

export default function SideNav() {
  const { signOut } = useAuth();
  return (
    <aside className="hidden sm:flex fixed left-0 top-0 h-screen w-20 lg:w-64 flex-col bg-[var(--background-primary)] border-r border-[var(--border-default)] z-50 transition-all duration-300">
      
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 mb-8 border-b border-[var(--border-subtle)] lg:border-none">
        <div className="w-8 h-8 bg-[#006c4f] flex items-center justify-center rounded-[var(--radius-sm)] shrink-0">
          <span className="font-sans font-extrabold text-white text-base leading-none">W</span>
        </div>
        <div className="hidden lg:block ml-3">
          <h1 className="text-xl font-black text-token-primary tracking-tighter font-clash leading-none">WAGORA</h1>
          <p className="text-[10px] uppercase tracking-widest text-token-secondary font-bold mt-1">Precision OS</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-2 lg:px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                (item as { isAI?: boolean }).isAI
                  ? isActive
                    ? 'bg-[var(--accent-primary)] text-white font-semibold'
                    : 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/8 hover:bg-[var(--accent-primary)]/15 font-medium'
                  : isActive
                    ? 'bg-[var(--surface-elevated)] text-token-primary font-medium border-l-2 border-token-accent'
                    : 'text-token-secondary hover:bg-[var(--surface-elevated)] hover:text-token-primary'
              }`
            }
          >
            <item.icon size={20} className="shrink-0 mx-auto lg:mx-0" />
            <span className="hidden lg:block font-clash text-[14px] tracking-tight">{item.name}</span>
            {(item as { isAI?: boolean }).isAI && <span className="hidden lg:block ml-auto text-[9px] font-bold uppercase tracking-widest bg-current/20 rounded px-1 py-0.5 opacity-70">AI</span>}
          </NavLink>
        ))}
      </nav>

      {/* Action Button */}
      <div className="px-4 mb-6 hidden lg:block">
        <button className="w-full bg-[var(--surface-elevated)] text-token-primary py-2.5 font-bold rounded text-sm hover:bg-[var(--surface-card)] border border-[var(--border-subtle)] transition-colors">
          New Campaign
        </button>
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-[var(--border-default)] pt-4 pb-6 px-2 lg:px-4 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
              isActive
                ? 'bg-[var(--surface-elevated)] text-token-primary font-medium'
                : 'text-token-secondary hover:bg-[var(--surface-elevated)] hover:text-token-primary'
            }`
          }
        >
          <Settings size={20} className="shrink-0 mx-auto lg:mx-0" />
          <span className="hidden lg:block font-clash text-[14px] tracking-tight">Settings</span>
        </NavLink>
        
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-token-secondary hover:bg-[var(--surface-elevated)] hover:text-token-primary">
          <HelpCircle size={20} className="shrink-0 mx-auto lg:mx-0" />
          <span className="hidden lg:block font-clash text-[14px] tracking-tight">Support</span>
        </button>

        <button 
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-token-secondary hover:bg-[var(--surface-elevated)] hover:text-token-destructive mt-4"
        >
          <LogOut size={20} className="shrink-0 mx-auto lg:mx-0" />
          <span className="hidden lg:block font-clash text-[14px] tracking-tight">Logout</span>
        </button>
      </div>
    </aside>
  );
}
