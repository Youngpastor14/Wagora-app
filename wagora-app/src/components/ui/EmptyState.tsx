import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  headline: string;
  body: string;
  cta?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, headline, body, cta, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {icon ? (
        <div className="mb-4">{icon}</div>
      ) : (
        <div className="w-14 h-14 bg-[var(--surface-elevated)] rounded-full flex items-center justify-center mb-4 border border-[var(--border-default)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
      )}
      <h4 className="font-clash font-bold text-[var(--text-primary)] mb-1 text-lg">{headline}</h4>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">{body}</p>
      {cta && onAction && (
        <button
          onClick={onAction}
          className="mt-6 bg-[var(--accent-primary)] text-white px-5 py-2 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors"
        >
          {cta}
        </button>
      )}
    </div>
  );
}
