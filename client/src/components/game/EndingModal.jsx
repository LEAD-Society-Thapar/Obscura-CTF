import { useEffect, useRef } from "react";
import Button from "../ui/Button.jsx";
import Icon from "../ui/Icon.jsx";
import SafeMarkdown from "../ui/SafeMarkdown.jsx";

// Full-screen ending after the final face-off closes.
//   victory: the final was solved. `title` and `ending` come from the submit response ONLY (endingTitle / ending).
//            Never hard-code the victory title here: it matches an accepted answer for the final checkpoint and
//            would ship in the JS bundle.
//   defeat:  every attempt on the final was used. Fixed text (no secret in it); the victory ending is not shown.
const FALLBACK_TITLE = "The Archive is restored";

const DEFEAT = {
  eyebrow: "The Final Face-off · Lost",
  title: "Mogambo khush hua",
  text: "Your team used all its attempts on the final face-off, and Mogambo slipped away with the Archive. Every checkpoint you cleared still counts: your points are on the board.",
};

export default function EndingModal({ open, onClose, title, ending, variant = "victory" }) {
  const ref = useRef(null);
  const defeat = variant === "defeat";

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="ending-heading"
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-y-auto bg-transparent p-0 text-inherit backdrop:bg-black/90 open:motion-safe:animate-fade-up"
    >
      {open && (
        <div className="noir-backdrop relative flex min-h-dvh flex-col items-center justify-center px-4 py-16 text-center sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-ink/80 p-2 text-bone ring-1 ring-line hover:bg-ink"
          >
            <Icon name="close" className="size-5" />
            <span className="sr-only">Close</span>
          </button>

          <p className={`font-type text-sm tracking-[0.3em] uppercase ${defeat ? "text-blood-bright" : "text-gold"}`}>
            {defeat ? DEFEAT.eyebrow : "The Final Face-off · Cleared"}
          </p>
          <h1
            id="ending-heading"
            className={`mt-4 max-w-4xl font-display text-5xl leading-none sm:text-7xl lg:text-8xl ${
              defeat ? "text-bone/90" : "text-blood-bright drop-shadow-[0_0_24px_rgba(212,37,43,0.55)]"
            }`}
          >
            {defeat ? DEFEAT.title : title || FALLBACK_TITLE}
          </h1>

          {defeat ? (
            <p className="mt-8 w-full max-w-2xl rounded-card border border-blood/50 bg-ink-soft/90 p-6 text-left text-lg leading-relaxed sm:p-8">
              {DEFEAT.text}
            </p>
          ) : (
            ending && (
              <div className="mt-10 w-full max-w-2xl rounded-card border border-gold-soft/50 bg-ink-soft/90 p-6 text-left text-lg leading-relaxed shadow-paper sm:p-8">
                <SafeMarkdown>{ending}</SafeMarkdown>
              </div>
            )
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button to="/report" onClick={onClose} size="lg">
              View final report
            </Button>
            <Button to="/challenges" onClick={onClose} size="lg" variant="outline">
              {defeat ? "Back to your dossier" : "See your victory"}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
