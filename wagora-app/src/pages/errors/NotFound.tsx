import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--background-primary)] flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-default)] flex items-center justify-center mx-auto mb-6">
          <span className="font-clash text-2xl font-bold text-[var(--text-muted)]">404</span>
        </div>
        <h1 className="font-clash text-xl font-bold text-[var(--text-primary)] mb-2">This page does not exist.</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">The link may be broken or the page may have moved.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 bg-[var(--accent-primary)] text-white px-5 py-2.5 rounded-[var(--radius-md)] text-sm font-bold hover:bg-[var(--accent-primary-hover)] transition-colors"
        >
          <ArrowLeft size={16} /> Back to dashboard
        </button>
      </div>
    </div>
  );
}
