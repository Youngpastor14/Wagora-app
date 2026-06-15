import { Outlet, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function AuthLayout() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Determine auth theme based on active path
  const isSignUp = location.pathname.includes('/signup');
  const authTheme = isSignUp ? 'dark' : 'light';

  return (
    <div 
      data-theme={authTheme}
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--background-primary)] text-[var(--text-primary)] font-body-md p-4 relative overflow-hidden transition-colors duration-300"
    >
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-md bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors z-50 cursor-pointer"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Grid Watermarks & Backdrop */}
      {authTheme === 'light' ? (
        <div className="fixed inset-0 flex items-center justify-center z-0 overflow-hidden pointer-events-none select-none">
          <span 
            className="material-symbols-outlined text-[var(--text-primary)] opacity-[0.03] scale-[20] rotate-12" 
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            dashboard
          </span>
        </div>
      ) : (
        <>
          <div className="absolute inset-0 watermark-overlay z-0 pointer-events-none select-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/5 blur-[120px] rounded-full z-0 pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full z-0 pointer-events-none" />
        </>
      )}

      {/* Content Container */}
      <div className="relative z-10 w-full flex flex-col items-center gap-6">
        {/* Wagora Branding Block */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 bg-[#006c4f] flex items-center justify-center rounded-[var(--radius-sm)] mb-2 shadow-sm shrink-0">
            <span className="font-sans font-extrabold text-white text-2xl leading-none select-none">W</span>
          </div>
          <h1 className="font-clash text-2xl font-black text-[var(--text-primary)] tracking-tighter uppercase leading-none">
            WAGORA
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-bold">
            Precision OS
          </p>
        </div>

        {/* Content Outlet */}
        <Outlet />
      </div>
    </div>
  );
}
