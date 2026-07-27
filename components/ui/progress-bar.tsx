type ProgressBarProps = {
  progress: number;
  color?: string;
  className?: string;
};

export function ProgressBar({ progress, color = "var(--accent)", className }: ProgressBarProps) {
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-surface-raised ${className ?? ""}`}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clamped * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}
