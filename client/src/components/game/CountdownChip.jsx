import { useEventClock } from "../../hooks/useGameData.js";

const URGENT_MS = 10 * 60 * 1000;

// Global event countdown in the game navbar (HH:MM:SS, "Time Remaining").
// role="timer" is not announced every second; the label is read on focus/navigation.
export default function CountdownChip() {
  const { label, remaining } = useEventClock();
  const urgent = remaining != null && remaining < URGENT_MS;

  return (
    <div
      role="timer"
      aria-label={`Time remaining: ${label}`}
      className="flex flex-col items-center rounded-chip border border-blood-bright/70 bg-ink px-2 py-1 shadow-[0_0_16px_-6px_var(--color-blood-bright)] sm:px-4"
    >
      <span
        className={`font-mono text-base leading-none font-bold tabular-nums sm:text-2xl ${
          urgent ? "text-blood-bright" : "text-bone"
        }`}
      >
        {label}
      </span>
      <span className="mt-0.5 font-type text-[8px] whitespace-nowrap text-muted uppercase sm:text-[10px] sm:tracking-[0.2em]">
        Time Remaining
      </span>
    </div>
  );
}
