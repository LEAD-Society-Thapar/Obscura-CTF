import ArtSlot from "../ui/ArtSlot.jsx";
import Icon from "../ui/Icon.jsx";
import SafeMarkdown from "../ui/SafeMarkdown.jsx";

// Relic tile (designs 6, 7). Unlocked = gold glow + art; locked = padlock medallion.
// size="sm" for the dashboard row (art + name only).
// size="lg" (Relics page): collected relics also show the inscription, with the lore behind a tap-to-expand.
// Locked relics never show inscription or lore (the API sends null for them anyway).
export default function RelicCard({ relic, size = "lg" }) {
  const unlocked = relic.collected;
  const sm = size === "sm";

  return (
    <figure
      className={`flex h-full flex-col items-center rounded-card border text-center ${sm ? "p-2" : "p-3"} ${
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
      <figcaption className={`w-full ${sm ? "mt-2" : "mt-3"}`}>
        <span
          className={`block font-heading leading-tight font-semibold ${sm ? "text-xs sm:text-sm" : "text-base"} ${
            unlocked ? "text-bone" : "text-muted"
          }`}
        >
          {relic.name}
        </span>
        <span className={`block font-type text-gold ${sm ? "text-[10px]" : "text-xs"}`}>Act {relic.act}</span>
        <span className="sr-only">{unlocked ? "Collected" : "Locked"}</span>

        {!sm && unlocked && relic.inscription && (
          <p className="mt-3 rounded-[3px] border border-blood/60 bg-ink px-2 py-2 font-type text-lg leading-snug tracking-wide break-words text-blood-bright">
            {relic.inscription}
          </p>
        )}
        {!sm && unlocked && relic.lore && (
          <details className="group mt-2 text-left">
            <summary className="cursor-pointer list-none rounded-chip py-1 text-center font-heading text-xs font-semibold text-gold hover:text-bone [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Read the lore</span>
              <span className="hidden group-open:inline">Hide the lore</span>
            </summary>
            <SafeMarkdown className="mt-1 text-sm leading-relaxed">{relic.lore}</SafeMarkdown>
          </details>
        )}
      </figcaption>
    </figure>
  );
}
