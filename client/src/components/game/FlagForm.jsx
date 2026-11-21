import { useId, useState } from "react";
import { useCountdown } from "../../hooks/useCountdown.js";
import { FLAG_CLOSE, FLAG_INNER_PLACEHOLDER, FLAG_OPEN, innerFlag, wrapFlag } from "../../lib/config.js";
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

// Flag input + submit (design 4). A team gets a few attempts per checkpoint (attempts = { used, max, left } from the
// server), so the first click only asks for confirmation and the second click sends the answer.
//   correct              -> onSolved(result)
//   wrong, attempts left -> message "N attempts left" + onWrong(result) so the page can refresh its counter
//   wrong, last attempt  -> onMissed(result): the checkpoint is closed with 0 points and the next gate opens
//   TOO_FAST (429, retryAfter s) -> input locked with a live countdown; the attempt was NOT used
//   stale / clock errors -> message + onStale() so the page can reload
// onSubmit(flag) must resolve { correct, ... } or reject with ApiError.
// disabledReason: text shown instead of accepting input (clock not running).
export default function FlagForm({ onSubmit, onSolved, onMissed, onWrong, onStale, attempts = null, disabledReason = null }) {
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
    if (!innerFlag(flag)) {
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
      const res = await onSubmit(wrapFlag(flag));
      setFlag("");
      if (res.correct) {
        setState({ kind: "idle" });
        onSolved?.(res);
      } else if (res.missed) {
        setState({ kind: "idle" });
        onMissed?.(res);
      } else {
        setState({ kind: "wrong", left: res.attemptsLeft });
        onWrong?.(res);
      }
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

  const left = attempts?.left ?? null;
  const plural = (n) => `${n} attempt${n === 1 ? "" : "s"}`;
  let message = null;
  let tone = "text-muted";
  if (off) {
    tone = "text-gold";
    message = disabledReason;
  } else if (confirming) {
    tone = "text-gold";
    message =
      left === 1 ? (
        <>
          <strong>Last attempt.</strong> Submit <span className="font-mono break-all text-bone">{wrapFlag(flag)}</span>? A wrong
          answer closes this checkpoint with 0 points.
        </>
      ) : (
        <>
          Submit <span className="font-mono break-all text-bone">{wrapFlag(flag)}</span>? A wrong answer uses one of your team&rsquo;s{" "}
          {left == null ? "attempts" : plural(left)} left.
        </>
      );
  } else if (state.kind === "wrong") {
    tone = "text-blood-bright";
    message =
      state.left === 1
        ? "Wrong answer. One attempt left: a wrong answer now closes this checkpoint with 0 points."
        : `Wrong answer. ${plural(state.left)} left.`;
  } else if (state.kind === "tooFast" && blocked) {
    tone = "text-gold";
    message = <>Too fast: your attempt was not used. Try again in {block.m * 60 + block.s}s.</>;
  } else if (state.kind === "error") {
    tone = "text-blood-bright";
    message = state.message;
  } else if (submitting) {
    message = "Checking with the projectionist...";
  } else {
    message =
      left == null
        ? "Check the answer and its format before you submit."
        : `${plural(left)} left${attempts?.max ? ` of ${attempts.max}` : ""}. Check the answer and its format before you submit.`;
  }

  return (
    <form onSubmit={ask} className="space-y-2" noValidate>
      <label htmlFor={`${id}-flag`} className="sr-only">
        Flag: your answer goes between OBSCURA{"{"} and {"}"}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* OBSCURA{ and } are fixed around the input: teams type only the answer between the braces. */}
        <div
          className={`flex min-w-0 flex-1 items-center rounded-card border bg-ink/80 px-4 py-3 font-mono text-lg focus-within:outline-2 focus-within:outline-gold ${
            confirming ? "border-gold" : "border-line"
          } ${blocked || submitting || off ? "opacity-60" : ""}`}
        >
          <span aria-hidden="true" className="shrink-0 text-gold-soft select-none">
            {FLAG_OPEN}
          </span>
          <input
            id={`${id}-flag`}
            value={flag}
            onChange={(e) => {
              setFlag(e.target.value);
              if (confirming || state.kind === "error" || state.kind === "wrong") setState({ kind: "idle" });
            }}
            placeholder={FLAG_INNER_PLACEHOLDER}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={blocked || submitting || off}
            aria-describedby={`${id}-status`}
            className="min-w-0 flex-1 bg-transparent px-1 text-bone placeholder:text-muted/70 focus:outline-none"
          />
          <span aria-hidden="true" className="shrink-0 text-gold-soft select-none">
            {FLAG_CLOSE}
          </span>
        </div>
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
