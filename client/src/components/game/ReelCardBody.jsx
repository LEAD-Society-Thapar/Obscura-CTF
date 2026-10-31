import { formatCp } from "../../lib/format.js";
import ArtSlot from "../ui/ArtSlot.jsx";
import Button from "../ui/Button.jsx";
import PaperCard from "../ui/PaperCard.jsx";
import StampLabel from "../ui/StampLabel.jsx";

// The Reel Card itself (design 5). Used by ReelCardModal (after a solve) and the /reel/:cpId page.
// reel: { cpId, act, index, title, quote, clue, frameSlot }
// action: { to, label, onClick? } for the bottom button.
export default function ReelCardBody({ reel, relic, action, headingId, headingAs: Heading = "h2" }) {
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

      <div className="mt-6 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        <div className="film-strip-v mx-auto w-36 -rotate-2 shadow-paper sm:w-44">
          <ArtSlot name={reel.frameSlot} alt={`Film still: ${reel.title}`} />
        </div>
        <blockquote className="rounded-[3px] bg-ink px-5 py-6 text-bone shadow-paper sm:rotate-1">
          <p className="font-hand text-2xl leading-snug sm:text-3xl">&ldquo;{reel.quote}&rdquo;</p>
        </blockquote>
      </div>

      <p className="mx-auto mt-6 max-w-md text-center text-sm text-parchment-ink sm:text-base">{reel.clue}</p>
      {relic && (
        <p className="mt-3 text-center font-heading font-bold text-blood">Relic collected: {relic.name}</p>
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
