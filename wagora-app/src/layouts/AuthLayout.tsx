import { Outlet, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function AuthLayout() {
  // BUG-01 FIX: useTheme is the single source of truth for the current theme.
  // We never override data-theme locally — the hook writes it to <html> globally.
  // The old code hardcoded authTheme = isSignUp ? 'dark' : 'light' and set it on
  // the wrapper <div>, which overrode the global toggle on every render.
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isSignUp = location.pathname.includes('/signup');

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--background-primary)] text-[var(--text-primary)] font-body-md p-4 relative overflow-hidden transition-colors duration-300"
    >
      {/* Theme Toggle — icon correctly reflects the ACTIVE theme */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-md bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors z-50 cursor-pointer"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Background Decoration — adapts to the live theme */}
      {theme === 'light' ? (
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
          {/* MIN-05 FIX: use CSS variable instead of hardcoded #006c4f */}
          <div className="w-12 h-12 bg-[var(--accent-primary)] flex items-center justify-center rounded-[var(--radius-sm)] mb-2 shadow-sm shrink-0">
            {/* MIN-06 FIX: use CSS variable instead of hardcoded text-white */}
            <span className="font-sans font-extrabold text-[var(--background-primary)] text-2xl leading-none select-none">W</span>
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
