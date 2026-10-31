import { Link } from "react-router-dom";
import ArtSlot from "../ui/ArtSlot.jsx";
import Icon from "../ui/Icon.jsx";

const STATUS_TEXT = { done: "Completed", current: "In progress", locked: "Locked" };

// Mission map act card (design 2): framed art, paper title label, progress chip.
// `act` comes from useActs() (has status, solvedCount, total).
export default function ActCard({ act, className = "" }) {
  const locked = act.status === "locked";
  const current = act.status === "current";

  const content = (
    <>
      <div
        className={`relative overflow-hidden rounded-[3px] border-4 border-parchment/90 shadow-paper transition-transform motion-safe:group-hover:-translate-y-1 ${
          current ? "shadow-glow-red motion-safe:animate-pulse-glow" : ""
        } ${locked ? "brightness-75 grayscale" : ""}`}
      >
        <ArtSlot name={act.coverSlot} />
        {locked && (
          <span className="absolute inset-0 grid place-items-center bg-ink/40 text-bone/80">
            <Icon name="lock" className="size-10" />
          </span>
        )}
      </div>

      <div className="paper-texture absolute right-2 -bottom-3 w-[60%] rotate-[1.5deg] rounded-[2px] px-3 pb-2 shadow-paper">
        <span className="-mx-3 mb-1.5 block bg-blood px-3 py-0.5 font-heading text-sm font-bold tracking-wider text-bone uppercase">
          Act {act.id}
        </span>
        <span className="block font-heading text-base leading-tight font-bold uppercase sm:text-lg">{act.title}</span>
      </div>

      <span className="absolute -bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-ink/90 px-3 py-1 font-type text-xs whitespace-nowrap text-bone">
        <Icon name={locked ? "lock" : act.status === "done" ? "check" : "film"} className="size-3.5 text-gold" />
        {act.solvedCount}/{act.total}
        <span className="sr-only">
          {" "}
          checkpoints solved. {STATUS_TEXT[act.status]}.
        </span>
      </span>
    </>
  );

  const cls = `group relative mb-14 block ${className}`;

  if (locked) {
    return (
      <div className={cls} aria-disabled="true">
        {content}
      </div>
    );
  }
  return (
    <Link to={`/challenges/act/${act.id}`} className={cls}>
      {content}
    </Link>
  );
}
