import { useId, useState } from "react";
import { useCountdown } from "../../hooks/useCountdown.js";
import { FLAG_PLACEHOLDER } from "../../lib/config.js";
import Button from "../ui/Button.jsx";
import Spinner from "../ui/Spinner.jsx";

// Flag input + submit (design 4). Handles every server answer:
//   correct          -> onSolved(result)
//   wrong            -> message (+ tries left before cooldown)
//   TOO_FAST / COOLDOWN (429, retryAfter s) -> input locked with a live countdown
//   ALREADY_SOLVED / LOCKED -> message + onStale() so the page can reload
// onSubmit(flag) must resolve { correct, attemptsLeft?, retryAfter? } or reject with ApiError.
export default function FlagForm({ onSubmit, onSolved, onStale }) {
  const id = useId();
  const [flag, setFlag] = useState("");
  const [state, setState] = useState({ kind: "idle" });
  const [blockedUntil, setBlockedUntil] = useState(null);
  const block = useCountdown(blockedUntil);
  const blocked = blockedUntil != null && !block.expired;
  const submitting = state.kind === "submitting";

  const handle = async (e) => {
    e.preventDefault();
    const value = flag.trim();
    if (submitting || blocked) return;
    if (!value) {
      setState({ kind: "error", message: "Enter a flag first." });
      return;
    }

    setState({ kind: "submitting" });
    try {
      const res = await onSubmit(value);
      if (res.correct) {
        setFlag("");
        setState({ kind: "idle" });
        onSolved?.(res);
      } else if (res.retryAfter) {
        setBlockedUntil(Date.now() + res.retryAfter * 1000);
        setState({ kind: "cooldown" });
      } else {
        setState({ kind: "wrong", attemptsLeft: res.attemptsLeft });
      }
    } catch (err) {
      const code = err?.data?.code;
      const retry = err?.data?.retryAfter;
      if ((code === "TOO_FAST" || code === "COOLDOWN") && retry) {
        setBlockedUntil(Date.now() + retry * 1000);
        setState({ kind: code === "TOO_FAST" ? "tooFast" : "cooldown" });
      } else {
        setState({ kind: "error", message: err?.message || "Something went wrong. Try again." });
        if (code === "ALREADY_SOLVED" || code === "LOCKED") onStale?.();
      }
    }
  };

  let message = null;
  let tone = "text-muted";
  if (state.kind === "wrong") {
    tone = "text-blood-bright";
    message = (
      <>
        <strong>Wrong flag.</strong> Mogambo khush hua.
        {state.attemptsLeft != null && ` ${state.attemptsLeft} more wrong ${state.attemptsLeft === 1 ? "try" : "tries"} before a cooldown.`}
      </>
    );
  } else if (state.kind === "tooFast" && blocked) {
    tone = "text-gold";
    message = <>Too fast. Next flag in {block.m * 60 + block.s}s.</>;
  } else if (state.kind === "cooldown" && blocked) {
    tone = "text-blood-bright";
    message = (
      <>
        <strong>Too many wrong flags.</strong> Cooldown: <span className="font-mono tabular-nums">{block.label}</span>
      </>
    );
  } else if (state.kind === "error") {
    tone = "text-blood-bright";
    message = state.message;
  } else if (submitting) {
    message = "Checking with the projectionist...";
  }

  return (
    <form onSubmit={handle} className="space-y-2" noValidate>
      <label htmlFor={`${id}-flag`} className="sr-only">
        Flag
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={`${id}-flag`}
          value={flag}
          onChange={(e) => setFlag(e.target.value)}
          placeholder={FLAG_PLACEHOLDER}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={blocked}
          aria-invalid={state.kind === "wrong" || undefined}
          aria-describedby={`${id}-status`}
          className={`min-w-0 flex-1 rounded-card border bg-ink/80 px-4 py-3 font-mono text-lg text-bone placeholder:text-muted/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-60 ${
            state.kind === "wrong" ? "border-blood-bright" : "border-line"
          }`}
        />
        <Button type="submit" size="lg" caps={false} className="sm:min-w-44" disabled={submitting || blocked}>
          {submitting && <Spinner />}
          {submitting ? "Submitting" : "Submit Flag"}
        </Button>
      </div>
      <p id={`${id}-status`} role="status" aria-live="polite" className={`min-h-5 text-sm ${tone}`}>
        {message}
      </p>
    </form>
  );
}
