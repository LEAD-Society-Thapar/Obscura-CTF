import { formatCp } from "../../lib/format.js";
import ArtSlot from "../ui/ArtSlot.jsx";
import Button from "../ui/Button.jsx";
import PaperCard from "../ui/PaperCard.jsx";
import SafeMarkdown from "../ui/SafeMarkdown.jsx";
import StampLabel from "../ui/StampLabel.jsx";

// The Reel Card itself (design 5). Used by ReelCardModal (after a solve) and the /reel/:cpId page.
// reel: { cpId, act, index, title, quote, clue, frameSlot }   quote may be "" (then the quote block is hidden).
// relic (optional, only right after the solve that awarded it): { name, inscription, lore, ... }
// action: { to, label, onClick? } for the bottom button.
export default function ReelCardBody({ reel, relic, action, headingId, headingAs: Heading = "h2" }) {
  const hasQuote = typeof reel.quote === "string" && reel.quote !== "";

  return (
    <PaperCard innerClassName="relative px-5 pt-8 pb-8 sm:px-10 sm:pt-9">
      <StampLabel
        animate
        className="absolute top-4 right-3 text-xs [--stamp-rotate:12deg] sm:top-5 sm:right-6 sm:text-base"
      >
        Clue
        <br />
        Unlocked
      </StampLabel>

      <Heading
        id={headingId}
        className="pr-16 text-center font-heading text-2xl font-bold tracking-wide text-blood uppercase sm:px-16 sm:text-3xl"
      >
        Reel Card Collected
      </Heading>
      <p className="mt-1 text-center font-type text-sm text-parchment-ink/80">
        {formatCp(reel)} &mdash; {reel.title}
      </p>

      <div className={`mt-6 grid items-center gap-5 ${hasQuote ? "sm:grid-cols-[auto_1fr]" : "justify-items-center"}`}>
        <div className="film-strip-v mx-auto w-36 -rotate-2 shadow-paper sm:w-44">
          <ArtSlot name={reel.frameSlot} alt={`Film still: ${reel.title}`} />
        </div>
        {hasQuote && (
          <blockquote className="rounded-[3px] bg-ink px-5 py-6 text-bone shadow-paper sm:rotate-1">
            <p className="font-hand text-2xl leading-snug sm:text-3xl">&ldquo;{reel.quote}&rdquo;</p>
          </blockquote>
        )}
      </div>

      <SafeMarkdown tone="paper" className="mx-auto mt-6 max-w-md text-center text-sm sm:text-base">
        {reel.clue}
      </SafeMarkdown>

      {relic && (
        <section aria-label="Relic collected" className="mx-auto mt-5 max-w-md text-center">
          <p className="font-heading font-bold text-blood">Relic collected: {relic.name}</p>
          {relic.inscription && (
            <p className="mt-3 rounded-[3px] border-2 border-blood/60 bg-parchment-dark/40 px-4 py-5 font-type text-2xl leading-snug tracking-wide break-words text-parchment-ink sm:text-3xl">
              {relic.inscription}
            </p>
          )}
          {relic.lore && <SafeMarkdown tone="paper" className="mt-3 text-sm sm:text-base">{relic.lore}</SafeMarkdown>}
        </section>
      )}

      {action && (
        <div className="mt-6 flex justify-center">
          <Button to={action.to} onClick={action.onClick} size="lg">
            {action.label}
          </Button>
        </div>
      )}
    </PaperCard>
  );
}
