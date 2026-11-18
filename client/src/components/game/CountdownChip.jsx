import { useEventClock, useFullscreen } from "../../hooks/useGameData.js";

const URGENT_MS = 10 * 60 * 1000;
const CAPTION = { idle: "Not Started", running: "Time Remaining", paused: "Clock Paused", ended: "Time Up" };

// Global event countdown in the game navbar (HH:MM:SS). It follows the admin's clock: before the start it shows
// the full duration, while paused it is frozen, and at the end it reads 00:00:00.
// role="timer" is not announced every second; the label is read on focus/navigation.
export default function CountdownChip() {
  const { label, remaining, status } = useEventClock();
  const fsLocked = !!useFullscreen()?.locked && status !== "ended";
  const urgent = fsLocked || status === "ended" || (status === "running" && remaining != null && remaining < URGENT_MS);
  const caption = fsLocked ? "Timer Stopped" : CAPTION[status] || "Time Remaining";
  const tone = urgent ? "text-blood-bright" : status === "paused" ? "text-gold" : status === "idle" ? "text-muted" : "text-bone";

  return (
    <div
      role="timer"
      aria-label={`${caption}: ${label}`}
      className={`flex flex-col items-center rounded-chip border bg-ink px-2 py-1 shadow-[0_0_16px_-6px_var(--color-blood-bright)] sm:px-4 ${
        status === "paused" ? "border-gold/70" : "border-blood-bright/70"
      }`}
    >
      <span className={`font-mono text-base leading-none font-bold tabular-nums sm:text-2xl ${tone}`}>{label}</span>
      <span className="mt-0.5 font-type text-[8px] whitespace-nowrap text-muted uppercase sm:text-[10px] sm:tracking-[0.2em]">
        {caption}
      </span>
    </div>
  );
}
