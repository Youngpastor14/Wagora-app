import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Modal Panel */}
      <div className="relative bg-[var(--surface-card)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] w-full max-w-md animate-scale-in overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-10"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}
