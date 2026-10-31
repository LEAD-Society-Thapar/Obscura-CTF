import Icon from "./Icon.jsx";

// Small labelled stat (design 6: Hints Used, Relics Collected, Current Streak).
export default function StatTile({ icon, label, value, className = "" }) {
  return (
    <dl className={`rounded-card border border-line bg-ink-raised/60 p-3 ${className}`}>
      <dt className="flex items-center gap-2 text-xs text-muted">
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-gold-soft/60 text-gold">
          <Icon name={icon} className="size-3.5" />
        </span>
        {label}
      </dt>
      <dd className="mt-1.5 font-heading text-base font-semibold whitespace-nowrap text-bone">{value}</dd>
    </dl>
  );
}
