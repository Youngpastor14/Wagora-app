interface ScoreBadgeProps {
  score: number;
}

export default function ScoreBadge({ score }: ScoreBadgeProps) {
  const getScoreColor = (s: number) => {
    if (s >= 9) return { bg: 'rgba(0,200,150,0.15)', text: 'var(--success)', ring: 'rgba(0,200,150,0.3)' };
    if (s >= 7) return { bg: 'rgba(0,200,150,0.10)', text: 'var(--accent-primary)', ring: 'rgba(0,200,150,0.2)' };
    if (s >= 5) return { bg: 'rgba(245,158,11,0.12)', text: 'var(--status-paused)', ring: 'rgba(245,158,11,0.2)' };
    return { bg: 'rgba(229,62,62,0.10)', text: 'var(--destructive)', ring: 'rgba(229,62,62,0.2)' };
  };

  const colors = getScoreColor(score);

  return (
    <div
      className="inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold font-mono"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        boxShadow: `0 0 0 2px ${colors.ring}`,
      }}
      title={`ICP match score: ${score}/10`}
    >
      {score}
    </div>
  );
}
