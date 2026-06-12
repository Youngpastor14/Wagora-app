import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Bell } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

export default function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const { profile, plan } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getPageTitle = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Dashboard';
    const title = segments[0];
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  const handleNotificationClick = async (n: any) => {
    setShowNotifications(false);
    await markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
    }
  };

  const displayName = profile?.full_name || 'User';
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=00C896&color=fff&rounded=true`;

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[color-mix(in_srgb,var(--surface-card)_90%,transparent)] backdrop-blur-sm border-b border-[var(--border-default)] flex items-center justify-between px-4 sm:px-8">
      
      {/* Mobile Title & Logo */}
      <div className="flex items-center gap-3 sm:hidden">
        <div className="w-8 h-8 bg-token-accent flex items-center justify-center rounded shrink-0">
          <span className="material-symbols-outlined text-[var(--surface-card)] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>deployed_code</span>
        </div>
        <h2 className="font-clash text-lg font-bold tracking-tight text-token-primary">
          {getPageTitle(location.pathname)}
        </h2>
      </div>

      {/* Desktop Title */}
      <div className="hidden sm:flex items-center gap-4">
        <h2 className="font-clash text-lg font-bold tracking-tight text-token-primary">
          {getPageTitle(location.pathname)}
        </h2>
        {plan && (
          <span className="px-2 py-0.5 bg-[var(--surface-elevated)] border border-[var(--border-subtle)] rounded text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-tighter">
            {plan}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 sm:gap-6">
        
        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-1.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border-default)] text-token-secondary hover:text-token-primary transition-colors flex items-center justify-center"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-token-secondary hover:text-token-primary transition-colors flex items-center"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-[var(--destructive)] rounded-full border-2 border-[var(--surface-card)] flex items-center justify-center text-[9px] font-bold text-white px-0.5 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] overflow-hidden animate-scale-in z-50">
              <div className="p-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Notifications</h3>
                <button
                  onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                  className="text-xs font-bold text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                >
                  View all
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-token-muted">
                    No new notifications
                  </div>
                ) : (
                  notifications.slice(0, 6).map(n => (
                    <div
                      key={n.id}
                      className={`px-3 py-2.5 text-xs cursor-pointer hover:bg-[var(--surface-elevated)] transition-colors ${
                        !n.read ? 'bg-[rgba(0,200,150,0.03)]' : ''
                      }`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <p className={`leading-relaxed ${!n.read ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div 
          onClick={() => navigate('/settings')}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-full overflow-hidden border border-[var(--border-default)] bg-[var(--surface-elevated)] shrink-0 cursor-pointer"
        >
          <img 
            alt="User Profile" 
            className="w-full h-full object-cover" 
            src={avatarUrl} 
          />
        </div>
      </div>
    </header>
  );
}
