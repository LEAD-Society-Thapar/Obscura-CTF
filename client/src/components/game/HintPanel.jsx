import { useState } from "react";
import { formatDelta } from "../../lib/format.js";
import Button from "../ui/Button.jsx";
import Icon from "../ui/Icon.jsx";
import Spinner from "../ui/Spinner.jsx";

// Hint ladder (design 4). Each hint has its own `cost`; hints unlock in order and need a confirm click.
// onReveal(hintId) should resolve once the hint is revealed (the parent reloads the checkpoint).
export default function HintPanel({ hints, onReveal, readOnly = false }) {
  const [confirming, setConfirming] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const nextId = hints.find((h) => !h.revealed)?.id;

  const reveal = async (hint) => {
    setPending(hint.id);
    setError("");
    try {
      await onReveal(hint.id);
      setConfirming(null);
    } catch (err) {
      setError(err.message || "Could not reveal the hint.");
    } finally {
      setPending(null);
    }
  };

  const visible = readOnly ? hints.filter((h) => h.revealed) : hints;
  if (visible.length === 0) return null;

  return (
    <section aria-labelledby="hints-heading" className="space-y-2">
      <h2 id="hints-heading" className="sr-only">
        Hints
      </h2>
      {visible.map((h) => {
        const cost = `${formatDelta(-h.cost)} pts`;

        if (h.revealed) {
          return (
            <div key={h.id} className="flex gap-3 rounded-card border border-gold-soft/50 bg-ink-soft/90 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-gold/15 text-gold">
                <Icon name="bulb" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-heading font-semibold text-bone">
                  Hint {h.id} <span className="text-sm font-normal text-muted">({cost})</span>
                </p>
                <p className="mt-0.5 text-sm text-bone/90">{h.text}</p>
              </div>
            </div>
          );
        }

        const isNext = h.id === nextId;
        return (
          <div
            key={h.id}
            className={`flex flex-col gap-3 rounded-card border border-line bg-ink-soft/90 p-3 sm:flex-row sm:items-center ${
              isNext ? "" : "opacity-55"
            }`}
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-chip bg-ink-raised text-muted">
                <Icon name="lock" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-heading font-semibold text-bone">
                  Hint {h.id} ({cost})
                </p>
                <p className="text-sm text-muted italic">{isNext ? h.teaser : `Reveal Hint ${h.id - 1} first.`}</p>
              </div>
            </div>

            {isNext &&
              (confirming === h.id ? (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" caps={false} onClick={() => reveal(h)} disabled={pending === h.id}>
                    {pending === h.id && <Spinner />}
                    Spend {h.cost} pts
                  </Button>
                  <Button size="sm" variant="ghost" caps={false} onClick={() => setConfirming(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" caps={false} className="shrink-0" onClick={() => setConfirming(h.id)}>
                  Reveal Hint ({cost})
                </Button>
              ))}
          </div>
        );
      })}
      {error && (
        <p role="alert" className="text-sm text-blood-bright">
          {error}
        </p>
      )}
    </section>
  );
}
