// Red progress bar (design 6). `label` names it for screen readers.
export default function ProgressBar({ value, max, label, className = "" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`h-2.5 w-full overflow-hidden rounded-full bg-ink-raised ring-1 ring-inset ring-line ${className}`}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-blood to-blood-bright shadow-[0_0_12px_var(--color-blood-bright)] transition-[width] duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
