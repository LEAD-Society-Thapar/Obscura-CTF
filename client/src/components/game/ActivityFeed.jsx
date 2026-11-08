import { formatCp, formatDelta, isFinalCp } from "../../lib/format.js";
import Icon from "../ui/Icon.jsx";

const ICONS = { solve: "check", hint: "bulb", relic: "relic" };

function describe(item) {
  if (item.type === "solve" && isFinalCp(item.cp)) return `Cleared ${item.cp.title}`;
  if (item.type === "solve") return `Solved ${formatCp(item.cp)} — ${item.cp.title}`;
  if (item.type === "hint") return `Used hint on ${formatCp(item.cp)}`;
  if (item.type === "relic") return `Collected ${item.relic?.name ?? "a relic"}`;
  return item.text ?? "";
}

// Recent activity list (design 6). Items come from useActivity(), newest first.
export default function ActivityFeed({ items, limit = 5 }) {
  if (items.length === 0) return <p className="text-sm text-muted">Nothing yet. The reel is still rolling.</p>;

  return (
    <ol className="divide-y divide-line/60">
      {items.slice(0, limit).map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
            <Icon name={ICONS[item.type] || "film"} className="size-3" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1 truncate text-bone/90">{describe(item)}</span>
          {item.delta !== 0 && (
            <span className={`font-heading font-bold ${item.delta > 0 ? "text-gold" : "text-blood-bright"}`}>
              {formatDelta(item.delta)}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
