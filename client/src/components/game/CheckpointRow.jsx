import { Link } from "react-router-dom";
import { formatCp } from "../../lib/format.js";
import CategoryTag from "../ui/CategoryTag.jsx";
import PointsBadge from "../ui/PointsBadge.jsx";
import Icon from "../ui/Icon.jsx";

const STYLES = {
  solved: {
    row: "border-line bg-ink-soft/90 hover:border-gold-soft",
    circle: "bg-parchment-dark text-ink",
    icon: "check",
    label: "text-gold",
    sr: "Solved",
  },
  // Missed: the team used every attempt without the right answer. Still opens (read-only) so the story and Reel Card can be read.
  failed: {
    row: "border-line bg-ink-soft/70 hover:border-blood/70",
    circle: "bg-ink-raised text-blood-bright ring-1 ring-blood/60",
    icon: "close",
    label: "text-blood-bright",
    sr: "Missed",
    note: "Missed",
  },
  current: {
    row: "border-blood-bright bg-blood-deep/45 shadow-glow-red hover:bg-blood-deep/70",
    circle: "bg-blood text-bone",
    icon: "unlock",
    label: "text-blood-bright",
    sr: "Current checkpoint",
  },
  locked: {
    row: "border-line/70 bg-ink-soft/60 opacity-70 cursor-not-allowed",
    circle: "bg-ink-raised text-muted ring-1 ring-line",
    icon: "lock",
    label: "text-muted",
    sr: "Locked",
  },
};

// One checkpoint in the act list (design 3). States: solved, failed (missed), current, locked.
export default function CheckpointRow({ cp }) {
  const s = STYLES[cp.status] || STYLES.locked;

  const content = (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${s.circle}`}>
        <Icon name={s.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-type text-sm ${s.label}`}>
          {formatCp(cp)}
          {s.note && <span aria-hidden="true"> &middot; {s.note}</span>}
        </span>
        <span className="block truncate font-heading text-base font-semibold text-bone sm:text-lg">{cp.title}</span>
      </span>
      <CategoryTag category={cp.category} />
      <PointsBadge points={cp.points} className="hidden w-16 text-right sm:inline" />
      <span className="sr-only">
        , {cp.points} points. {s.sr}.
      </span>
    </>
  );

  const cls = `flex items-center gap-3 rounded-card border px-3 py-3 transition-colors sm:gap-5 sm:px-5 sm:py-4 ${s.row}`;

  if (cp.status === "locked" || !cp.slug) {
    return (
      <div className={cls} aria-disabled="true">
        {content}
      </div>
    );
  }
  return (
    <Link to={`/gate/${cp.slug}`} className={cls} aria-current={cp.status === "current" ? "step" : undefined}>
      {content}
    </Link>
  );
}
