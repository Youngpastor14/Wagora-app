interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusStyles: Record<string, { bg: string; text: string; dot?: string }> = {
  'Live':                { bg: 'rgba(0,200,150,0.12)', text: 'var(--success)', dot: 'var(--success)' },
  'Running':             { bg: 'rgba(0,200,150,0.12)', text: 'var(--success)', dot: 'var(--success)' },
  'Connected':           { bg: 'rgba(0,200,150,0.12)', text: 'var(--success)', dot: 'var(--success)' },
  'Active':              { bg: 'rgba(0,200,150,0.12)', text: 'var(--success)', dot: 'var(--success)' },
  'Payment confirmed':   { bg: 'rgba(0,200,150,0.12)', text: 'var(--success)', dot: 'var(--success)' },
  'Complete':            { bg: 'rgba(0,200,150,0.12)', text: 'var(--success)' },
  'Closed':              { bg: 'rgba(0,200,150,0.12)', text: 'var(--success)' },
  'Paused':              { bg: 'rgba(245,158,11,0.12)', text: 'var(--status-paused)', dot: 'var(--status-paused)' },
  'Awaiting payment':    { bg: 'rgba(245,158,11,0.12)', text: 'var(--status-paused)' },
  'Awaiting reply':      { bg: 'rgba(245,158,11,0.12)', text: 'var(--status-paused)' },
  'Processing':          { bg: 'rgba(245,158,11,0.12)', text: 'var(--status-paused)', dot: 'var(--status-paused)' },
  'Draft':               { bg: 'var(--surface-elevated)', text: 'var(--text-secondary)' },
  'New':                 { bg: 'var(--surface-elevated)', text: 'var(--text-secondary)' },
  'Outreach sent':       { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
  'Needs attention':     { bg: 'rgba(229,62,62,0.12)', text: 'var(--destructive)', dot: 'var(--destructive)' },
  'Flagged — input needed': { bg: 'rgba(229,62,62,0.12)', text: 'var(--destructive)', dot: 'var(--destructive)' },
  'Error — reupload':    { bg: 'rgba(229,62,62,0.12)', text: 'var(--destructive)' },
  'Not a fit':           { bg: 'rgba(229,62,62,0.08)', text: 'var(--text-muted)' },
  'Replied':             { bg: 'rgba(0,200,150,0.08)', text: 'var(--accent-primary)' },
  'In closing sequence': { bg: 'rgba(232,255,74,0.15)', text: '#a3b52a' },
  'Call booked':         { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
  'In delivery':         { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
  'Wagora responding':   { bg: 'rgba(0,200,150,0.12)', text: 'var(--success)', dot: 'var(--success)' },
  'Disconnected':        { bg: 'rgba(229,62,62,0.12)', text: 'var(--destructive)' },
  'call_booked':         { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
  'closing':             { bg: 'rgba(232,255,74,0.15)', text: '#a3b52a' },
  'nurturing':           { bg: 'rgba(0,200,150,0.08)', text: 'var(--accent-primary)' },
  'archived':            { bg: 'rgba(229,62,62,0.08)', text: 'var(--text-muted)' },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const style = statusStyles[status] || { bg: 'var(--surface-elevated)', text: 'var(--text-secondary)' };
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full whitespace-nowrap ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.dot && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: style.dot }}
        />
      )}
      {status}
    </span>
  );
}
