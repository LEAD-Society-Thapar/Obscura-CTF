import { useState } from "react";
import ArtSlot from "../ui/ArtSlot.jsx";
import Icon from "../ui/Icon.jsx";
import SafeMarkdown from "../ui/SafeMarkdown.jsx";

// Relic tile (designs 6, 7). Locked artwork stays visible beneath a subtle status badge.
// size="sm" for the dashboard row (art + name only).
// size="lg" (Relics page): collected relics also show the inscription, with the lore behind a tap-to-expand.
// Locked relics never show inscription or lore (the API sends null for them anyway).
export default function RelicCard({ relic, size = "lg", parchment = false }) {
  const unlocked = relic.collected;
  const sm = size === "sm";
  const paperSurface = parchment || sm;
  const [loreExpanded, setLoreExpanded] = useState(false);
  const loreId = `relic-lore-${relic.id}`;
  const loreToggleId = `${loreId}-toggle`;
  const cardTone = paperSurface
    ? "paper-texture border-0 p-0"
    : unlocked
      ? "border-[#b58a42]/80 bg-[#b58a42]/[0.06] shadow-[0_0_0_1px_rgba(181,138,66,0.18),0_8px_18px_rgba(78,52,16,0.12)]"
      : "border-line bg-ink-soft/80";
  const artworkClass = paperSurface
    ? `relic-artwork relic-artwork--${relic.id} ${unlocked ? "relic-artwork--collected" : "relic-artwork--locked"}`
    : unlocked
      ? ""
      : "opacity-55 grayscale";

  return (
    <figure
      className={`relative flex h-full flex-col items-center text-center ${
        paperSurface ? "pb-2" : `rounded-card border ${sm ? "p-2" : "p-3"}`
      } ${cardTone} ${paperSurface ? "relic-collection-card" : ""}`}
      data-collected={paperSurface ? unlocked : undefined}
      style={paperSurface ? { backgroundSize: "100% 100%", boxShadow: "none" } : undefined}
    >
      <div className={`relative aspect-square w-full overflow-hidden ${paperSurface ? "" : "rounded-[4px] bg-ink/55"}`}>
        <ArtSlot
          name={relic.slot}
          fill
          compact={sm}
          icon="reel"
          alt={relic.name}
          fit="contain"
          className={`${paperSurface ? "" : "p-2"} ${artworkClass}`}
        />
        {!unlocked && (
          <div
            aria-hidden="true"
            className={`absolute right-2 top-2 grid size-6 place-items-center rounded-full border border-[#d4c29b]/35 bg-[#17120e]/90 text-[#d4c29b] shadow-sm ${
              paperSurface ? "relic-lock-badge" : ""
            }`}
          >
            <Icon name="lock" className="size-3.5" />
          </div>
        )}
      </div>
      <figcaption
        className={`w-full ${
          parchment ? "-mt-1 px-3 pb-4" : sm ? "mt-2 px-2 pb-2" : "mt-3"
        } ${paperSurface ? "relic-card-caption" : ""}`}
      >
        <span
          className={`block font-heading leading-tight font-semibold ${
            sm || parchment ? "text-[#24170F]" : unlocked ? "text-bone" : "text-muted"
          } ${parchment ? "text-[16.25px] sm:text-[18px] relic-card-name" : sm ? "text-xs sm:text-sm relic-card-name" : "text-base"}`}
        >
          {relic.name}
        </span>
        <span
          className={`block font-type ${sm || parchment ? "text-[#24170F]" : "text-gold"} ${
            parchment ? "text-sm" : sm ? "text-[10px]" : "text-xs"
          } ${paperSurface ? "relic-card-act" : ""}`}
        >
          Act {relic.act}
        </span>
        <span className="sr-only">{unlocked ? "Collected" : "Locked"}</span>

        {!sm && unlocked && relic.inscription && (
          <p className="relic-inscription mt-3">
            {relic.inscription}
          </p>
        )}
        {!sm && unlocked && relic.lore && (
          <div className={`relic-lore-disclosure${loreExpanded ? " is-expanded" : ""}`}>
            <button
              id={loreToggleId}
              type="button"
              className="relic-lore-toggle"
              aria-expanded={loreExpanded}
              aria-controls={loreId}
              onClick={() => setLoreExpanded((expanded) => !expanded)}
            >
              <span>{loreExpanded ? "Hide the lore" : "Read the lore"}</span>
              <span className="relic-lore-chevron" aria-hidden="true" />
            </button>
            <div
              id={loreId}
              className="relic-lore-panel"
              role="region"
              aria-labelledby={loreToggleId}
              aria-hidden={!loreExpanded}
              inert={!loreExpanded}
            >
              <div className="relic-lore-panel-inner">
                <SafeMarkdown tone="paper" className="relic-lore-content">
                  {relic.lore}
                </SafeMarkdown>
              </div>
            </div>
          </div>
        )}
      </figcaption>
    </figure>
  );
}
