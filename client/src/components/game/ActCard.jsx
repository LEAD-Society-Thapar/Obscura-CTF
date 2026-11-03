import { Link } from "react-router-dom";
import ArtSlot from "../ui/ArtSlot.jsx";
import Icon from "../ui/Icon.jsx";

const STATUS_TEXT = { done: "Completed", current: "In progress", locked: "Locked" };
const ACT_ART = {
  1: "/assets/mission-map/acts/act-01-ramgarh.png",
  2: "/assets/mission-map/acts/act-02-mumbai.png",
  3: "/assets/mission-map/acts/act-03-filmcity.png",
  4: "/assets/mission-map/acts/act-04-railway.png",
  5: "/assets/mission-map/acts/act-05-mogambo.png",
};

export default function ActCard({ act, className = "" }) {
  const locked = act.status === "locked";
  const current = act.status === "current";
  const image = ACT_ART[act.id];

  const content = (
    <>
      <div
        className={`relative mx-auto flex h-60 w-full max-w-[250px] items-center justify-center transition-transform motion-safe:group-hover:-translate-y-1 ${
          current ? "shadow-glow-red motion-safe:animate-pulse-glow" : ""
        } ${locked ? "brightness-75 grayscale" : ""}`}
      >
        {image ? (
          <img
            src={image}
            alt={`Act ${act.id}: ${act.title}`}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <ArtSlot name={act.coverSlot} />
        )}
        {locked && (
          <span className="absolute inset-0 grid place-items-center text-bone/80">
            <Icon name="lock" className="size-10" />
          </span>
        )}
      </div>

      <span className="mx-auto mt-1 flex w-fit items-center gap-1.5 rounded-full border border-line bg-ink/90 px-3 py-1 font-type text-xs whitespace-nowrap text-bone">
        <Icon name={locked ? "lock" : act.status === "done" ? "check" : "film"} className="size-3.5 text-gold" />
        {act.solvedCount}/{act.total}
        <span className="sr-only">
          {" "}
          checkpoints solved. {STATUS_TEXT[act.status]}.
        </span>
      </span>
    </>
  );

  const cls = `group relative mb-2 block ${className}`;

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
