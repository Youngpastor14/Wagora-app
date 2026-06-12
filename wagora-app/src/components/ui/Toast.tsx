import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  body?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (title: string, options?: { type?: ToastType; body?: string; duration?: number }) => void;
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((title: string, options?: { type?: ToastType; body?: string; duration?: number }) => {
    const id = Math.random().toString(36).substring(2, 9);
    const type = options?.type || 'success';
    const body = options?.body;
    const duration = options?.duration || (type === 'error' ? 6000 : 4000);

    const newToast: ToastMessage = { id, type, title, body, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration !== Infinity) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex gap-3 p-4 rounded-[var(--radius-lg)] border bg-[var(--surface-card)] shadow-[var(--shadow-elevated)] animate-slide-in-right transition-all duration-300`}
            style={{
              borderColor: t.type === 'error' ? 'rgba(229,62,62,0.3)' : t.type === 'success' ? 'rgba(0,200,150,0.3)' : 'var(--border-default)',
            }}
          >
            <div className="shrink-0">
              {t.type === 'success' && <CheckCircle size={18} className="text-[var(--success)]" />}
              {t.type === 'error' && <AlertTriangle size={18} className="text-[var(--destructive)]" />}
              {t.type === 'info' && <CheckCircle size={18} className="text-[var(--status-paused)]" />}
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">{t.title}</h4>
              {t.body && <p className="text-[11px] text-[var(--text-secondary)] leading-normal">{t.body}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors h-fit self-start"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
