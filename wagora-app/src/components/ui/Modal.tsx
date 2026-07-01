import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Set to true to force centered (desktop-style) modal even on mobile */
  forceCenter?: boolean;
}

export default function Modal({ open, onClose, children, forceCenter = false }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Modal Panel — bottom sheet on mobile, centered on desktop */}
      <div
        className={`relative bg-[var(--surface-card)] border border-[var(--border-default)] shadow-[var(--shadow-modal)] w-full animate-scale-in overflow-hidden
          ${forceCenter
            ? 'rounded-[var(--radius-lg)] max-w-md mx-4'
            : 'rounded-t-2xl sm:rounded-[var(--radius-lg)] sm:max-w-md sm:mx-4 pb-safe'
          }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-10 p-1 rounded-md hover:bg-[var(--surface-elevated)]"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>
        {/* Drag handle indicator (mobile only) */}
        <div className="sm:hidden w-10 h-1 bg-[var(--border-default)] rounded-full mx-auto mt-3 mb-1" />
        {children}
      </div>
    </div>
  );
}
