// Display formatters. Change a format here and every screen follows.

// Checkpoint label. Designs use "CP 2.2" (act.index); the server/plan numbers them CP1..CP20.
export const formatCp = ({ act, index }) => `CP ${act}.${index}`;

export const formatPoints = (n) => `${n} pts`;

// Signed delta for activity rows and hint costs: +100 / −20.
export const formatDelta = (n) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

// Milliseconds -> HH:MM:SS
export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
}
