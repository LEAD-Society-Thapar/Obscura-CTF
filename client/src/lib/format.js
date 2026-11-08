// Display formatters. Change a format here and every screen follows.

// The final face-off is checkpoint "final" with no act (see server/src/data/game.js).
export const FINAL_ID = "final";
export const isFinalCp = (cp) => cp?.id === FINAL_ID || cp?.cpId === FINAL_ID;

// Checkpoint label. Designs use "CP 2.2" (act.index); the final face-off has its own label.
export const formatCp = (cp) => (isFinalCp(cp) ? "The Final Face-off" : `CP ${cp.act}.${cp.index}`);

// Milliseconds -> "1h 07m 42s" / "7m 42s" for durations such as time taken.
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v) => String(v).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m ${pad(s)}s` : `${m}m ${pad(s)}s`;
}

export const formatPoints = (n) => `${n} pts`;

// Signed delta for activity rows and hint costs: +100 / −20.
export const formatDelta = (n) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

// Milliseconds -> HH:MM:SS
export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
