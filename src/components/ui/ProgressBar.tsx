interface ProgressBarProps {
  value: number;
  total: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, total, label, className = '' }: ProgressBarProps) {
  // A native progress element needs a positive maximum, even when no labs exist yet.
  const max = total > 0 ? total : 1;
  const current = Math.max(0, Math.min(value, total > 0 ? total : 0));
  return (
    <progress
      className={`progress-bar ${className}`}
      max={max}
      value={current}
      aria-label={label}
    />
  );
}
