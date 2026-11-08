import { useEffect, useRef } from "react";
import Button from "../ui/Button.jsx";
import Icon from "../ui/Icon.jsx";
import SafeMarkdown from "../ui/SafeMarkdown.jsx";

// Full-screen ending after the final face-off is solved.
// `title` and `ending` come from the submit response ONLY (endingTitle / ending). Never hard-code the title here:
// it matches an accepted answer for the final checkpoint and would ship in the JS bundle.
const FALLBACK_TITLE = "The Archive is restored";

export default function EndingModal({ open, onClose, title, ending }) {
  const ref = useRef(null);

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

          <p className="font-type text-sm tracking-[0.3em] text-gold uppercase">The Final Face-off &middot; Cleared</p>
          <h1
            id="ending-heading"
            className="mt-4 max-w-4xl font-display text-5xl leading-none text-blood-bright drop-shadow-[0_0_24px_rgba(212,37,43,0.55)] sm:text-7xl lg:text-8xl"
          >
            {title || FALLBACK_TITLE}
          </h1>

          {ending && (
            <div className="mt-10 w-full max-w-2xl rounded-card border border-gold-soft/50 bg-ink-soft/90 p-6 text-left text-lg leading-relaxed shadow-paper sm:p-8">
              <SafeMarkdown>{ending}</SafeMarkdown>
            </div>
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button to="/challenges" onClick={onClose} size="lg">
              See your victory
            </Button>
            <Button to="/relics" onClick={onClose} size="lg" variant="outline">
              Your relics
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
