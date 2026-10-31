import ArtSlot from "../ui/ArtSlot.jsx";
import Icon from "../ui/Icon.jsx";

// Relic tile (designs 6, 7). Unlocked = gold glow + art; locked = padlock medallion.
// size="sm" for the dashboard row.
export default function RelicCard({ relic, size = "lg" }) {
  const unlocked = relic.collected;
  const sm = size === "sm";

  return (
    <figure
      className={`flex flex-col items-center rounded-card border text-center ${sm ? "p-2" : "p-3"} ${
        unlocked ? "border-gold bg-ink-raised shadow-glow-gold" : "border-line bg-ink-soft/80"
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[4px]">
        {unlocked ? (
          <ArtSlot name={relic.slot} fill compact={sm} icon="reel" alt={relic.name} />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle,#2c2623,#121010)]">
            <span
              className={`grid place-items-center rounded-full bg-ink text-muted ring-1 ring-line ${
                sm ? "size-10" : "size-16"
              }`}
            >
              <Icon name="lock" className={sm ? "size-5" : "size-8"} />
            </span>
          </div>
        )}
      </div>
      <figcaption className={sm ? "mt-2" : "mt-3"}>
        <span
          className={`block font-heading leading-tight font-semibold ${sm ? "text-xs sm:text-sm" : "text-base"} ${
            unlocked ? "text-bone" : "text-muted"
          }`}
        >
          {relic.name}
        </span>
        <span className={`block font-type text-gold ${sm ? "text-[10px]" : "text-xs"}`}>Act {relic.act}</span>
        <span className="sr-only">{unlocked ? "Collected" : "Locked"}</span>
      </figcaption>
    </figure>
  );
}
