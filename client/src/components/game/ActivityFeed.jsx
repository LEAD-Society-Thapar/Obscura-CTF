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
  if (items.length === 0) return <p className="dashboard-activity-empty text-sm">Nothing yet. The reel is still rolling.</p>;

  return (
    <ol className="dashboard-activity-feed divide-y divide-[#5d4333]/25">
      {items.slice(0, limit).map((item) => {
        const date = item.at ? new Date(item.at) : null;
        const validDate = date && Number.isFinite(date.getTime());

        return (
          <li key={item.id} className="dashboard-activity-entry grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 py-3 text-sm">
            <span className="row-span-2 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#8a682e]/15 text-[#76551f]">
              <Icon name={ICONS[item.type] || "film"} className="size-3" strokeWidth={2.4} />
            </span>
            <span className="dashboard-activity-description min-w-0 break-words text-[#352319]">{describe(item)}</span>
            <span className="dashboard-activity-meta col-start-2 mt-1 flex min-w-0 items-center justify-between gap-3 text-xs">
              {validDate ? (
                <time dateTime={item.at} className="text-[#6b5140]">
                  {date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </time>
              ) : (
                <span />
              )}
              {item.delta !== 0 && (
                <span className={`dashboard-activity-points shrink-0 font-bold ${item.delta > 0 ? "text-[#76551f]" : "text-[#6F211B]"}`}>
                  {formatDelta(item.delta)}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
