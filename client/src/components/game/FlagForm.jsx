import { useId, useState } from "react";
import { useCountdown } from "../../hooks/useCountdown.js";
import { FLAG_PLACEHOLDER } from "../../lib/config.js";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";

// Codes that mean the page is out of date (a team-mate closed the gate, or the clock changed): reload it.
const STALE = new Set([
  "ALREADY_SOLVED",
  "ALREADY_ATTEMPTED",
  "LOCKED",
  "EVENT_NOT_STARTED",
  "EVENT_PAUSED",
  "EVENT_ENDED",
  "FULLSCREEN_LOCKED",
]);

// Flag input + submit (design 4). A team gets ONE attempt per checkpoint, so the first click only asks for
// confirmation and the second click sends the answer.
//   correct              -> onSolved(result)
//   wrong                -> onMissed(result): the checkpoint is closed with 0 points and the next gate opens
//   TOO_FAST (429, retryAfter s) -> input locked with a live countdown; the attempt was NOT used
//   stale / clock errors -> message + onStale() so the page can reload
// onSubmit(flag) must resolve { correct, ... } or reject with ApiError.
// disabledReason: text shown instead of accepting input (clock not running).
export default function FlagForm({ onSubmit, onSolved, onMissed, onStale, disabledReason = null }) {
  const id = useId();
  const [flag, setFlag] = useState("");
  const [state, setState] = useState({ kind: "idle" });
  const [blockedUntil, setBlockedUntil] = useState(null);
  const block = useCountdown(blockedUntil);
  const blocked = blockedUntil != null && !block.expired;
  const submitting = state.kind === "submitting";
  const confirming = state.kind === "confirming";
  const off = !!disabledReason;

  const ask = (e) => {
    e.preventDefault();
    if (submitting || blocked || off) return;
    if (!flag.trim()) {
      setState({ kind: "error", message: "Enter a flag first." });
      return;
    }
    if (!confirming) {
      setState({ kind: "confirming" });
      return;
    }
    send();
  };

  const send = async () => {
    setState({ kind: "submitting" });
    try {
      const res = await onSubmit(flag.trim());
      setFlag("");
      setState({ kind: "idle" });
      if (res.correct) onSolved?.(res);
      else onMissed?.(res);
    } catch (err) {
      const code = err?.data?.code;
      const retry = err?.data?.retryAfter;
      if (code === "TOO_FAST" && retry) {
        setBlockedUntil(Date.now() + retry * 1000);
        setState({ kind: "tooFast" });
      } else {
        setState({ kind: "error", message: err?.message || "Something went wrong. Try again." });
        if (STALE.has(code)) onStale?.();
      }
    }
  };

  let message = null;
  let tone = "text-muted";
  if (off) {
    tone = "text-gold";
    message = disabledReason;
  } else if (confirming) {
    tone = "text-gold";
    message = (
      <>
        <strong>One attempt only.</strong> Submit <span className="font-mono break-all text-bone">{flag.trim()}</span> as your
        team&rsquo;s final answer? A wrong answer closes this checkpoint with 0 points.
      </>
    );
  } else if (state.kind === "tooFast" && blocked) {
    tone = "text-gold";
    message = <>Too fast: your attempt was not used. Try again in {block.m * 60 + block.s}s.</>;
  } else if (state.kind === "error") {
    tone = "text-blood-bright";
    message = state.message;
  } else if (submitting) {
    message = "Checking with the projectionist...";
  } else {
    message = "You get one attempt. Check the answer and its format before you submit.";
  }

  return (
    <form onSubmit={ask} className="space-y-2" noValidate>
      <label htmlFor={`${id}-flag`} className="sr-only">
        Flag
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={`${id}-flag`}
          value={flag}
          onChange={(e) => {
            setFlag(e.target.value);
            if (confirming || state.kind === "error") setState({ kind: "idle" });
          }}
          placeholder={FLAG_PLACEHOLDER}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={blocked || submitting || off}
          aria-describedby={`${id}-status`}
          className={`min-w-0 flex-1 rounded-card border bg-ink/80 px-4 py-3 font-mono text-lg text-bone placeholder:text-muted/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-60 ${
            confirming ? "border-gold" : "border-line"
          }`}
        />
        <div className="flex gap-2">
          <Button type="submit" size="lg" caps={false} className="flex-1 sm:min-w-44" disabled={submitting || blocked || off}>
            {submitting && <Spinner />}
            {submitting ? "Submitting" : confirming ? "Yes, submit" : "Submit Flag"}
          </Button>
          {confirming && (
            <Button size="lg" variant="ghost" caps={false} onClick={() => setState({ kind: "idle" })}>
              Go back
            </Button>
          )}
        </div>
      </div>
      <p id={`${id}-status`} role="status" aria-live="polite" className={`min-h-5 text-sm ${tone}`}>
        {message}
      </p>
    </form>
  );
}
