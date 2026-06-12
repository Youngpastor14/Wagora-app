import { Outlet } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function AuthLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-secondary)] text-[var(--text-primary)] font-body-md p-4 relative">
      {/* Theme Toggle */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-md bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-md bg-[var(--surface-card)] rounded-[var(--radius-lg)] shadow-token-modal border border-[var(--border-default)] overflow-hidden">
        {/* Wagora Branding */}
        <div className="p-8 pb-0 text-center">
          <div className="w-12 h-12 mx-auto bg-token-accent rounded-[var(--radius-md)] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[var(--surface-card)] font-bold text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>precision_manufacturing</span>
          </div>
          <h1 className="font-clash text-headline-lg font-black tracking-tight text-token-primary">Wagora</h1>
          <p className="text-label-caps uppercase tracking-widest text-token-secondary font-bold mt-1">Precision OS</p>
        </div>

        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
