import Icon from "./Icon.jsx";

// Small labelled stat (design 6: Hints Used, Relics Collected, Current Streak).
export default function StatTile({ icon, label, value, detail, className = "" }) {
  return (
    <dl className={`dashboard-stat min-w-0 rounded-card border border-[#5d4333]/50 bg-[#e9dcc0]/75 p-3 ${className}`}>
      <dt className="dashboard-stat-label flex min-h-8 items-center gap-2 text-[11px] leading-snug text-[#5d4333] sm:text-xs">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[#8a682e]/50 text-[#8a682e]">
          <Icon name={icon} className="size-3.5" />
        </span>
        <span>{label}</span>
      </dt>
      <dd className="dashboard-stat-reading mt-2 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className="dashboard-stat-value">{value}</span>
        {detail && <span className="dashboard-stat-detail">{detail}</span>}
      </dd>
    </dl>
  );
}
