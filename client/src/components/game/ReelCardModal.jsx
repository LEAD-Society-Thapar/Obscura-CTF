import { useEffect, useRef } from "react";
import Icon from "../ui/Icon.jsx";
import ReelCardBody from "./ReelCardBody.jsx";

// Reel Card shown over the challenge page after a correct flag.
// Native <dialog> gives focus trapping, Esc to close and inert background for free.
export default function ReelCardModal({ open, onClose, ...bodyProps }) {
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
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="reel-card-heading"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(42rem,calc(100vw-2rem))] overflow-y-auto bg-transparent p-1 text-inherit backdrop:bg-black/75 backdrop:backdrop-blur-sm open:motion-safe:animate-fade-up"
    >
      {open && (
        <div className="relative">
          <ReelCardBody headingId="reel-card-heading" {...bodyProps} />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 left-2 rounded-full bg-ink/80 p-1.5 text-bone hover:bg-ink"
          >
            <Icon name="close" className="size-4" />
            <span className="sr-only">Close reel card</span>
          </button>
        </div>
      )}
    </dialog>
  );
}
