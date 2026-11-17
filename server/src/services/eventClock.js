// The event clock: one global row (event_state, id = 1) plus optional extra time per team (teams.extra_time_ms).
// Nothing here writes to the database; the admin controller changes the row and every game route reads it.
//
// Stored status:    idle | running | paused | ended
// Effective status: the same, except a running clock whose time has run out counts as "ended".
// A team's clock ends at  started_at + duration + time spent paused + that team's extra time.
import { HttpError } from "../utils/httpError.js";

export const EVENT_ROW_ID = 1;
export const DEFAULT_DURATION_MINUTES = 90;

// What a team (or the admin page, with extraMs = 0) sees. `remainingMs` is what clients should count down from:
// it does not depend on the client's own clock being right. While paused it stays constant.
export function clockView(ev, extraMs = 0, now = Date.now()) {
  const durationMinutes = ev?.duration_minutes ?? DEFAULT_DURATION_MINUTES;
  const extraTimeMs = Number(extraMs) || 0;
  const totalMs = Math.max(0, durationMinutes * 60_000 + extraTimeMs);
  const base = { durationMinutes, extraTimeMs, serverNow: new Date(now).toISOString() };

  if (!ev?.started_at || !ev.status || ev.status === "idle") {
    return { ...base, status: "idle", startedAt: null, endsAt: null, remainingMs: totalMs, totalPausedMs: 0 };
  }

  const startedMs = new Date(ev.started_at).getTime();
  const pausedNow = ev.status === "paused" && ev.paused_at ? Math.max(0, now - new Date(ev.paused_at).getTime()) : 0;
  const totalPausedMs = Number(ev.total_paused_ms || 0) + pausedNow;
  const endsMs = startedMs + totalMs + totalPausedMs;
  const remainingMs = ev.status === "ended" ? 0 : Math.max(0, endsMs - now);
  const status = remainingMs === 0 ? "ended" : ev.status;

  return {
    ...base,
    status,
    startedAt: new Date(startedMs).toISOString(),
    endsAt: new Date(endsMs).toISOString(),
    remainingMs,
    totalPausedMs,
  };
}

const BLOCKED = {
  idle: [403, "The hunt has not started yet.", "EVENT_NOT_STARTED"],
  paused: [403, "The clock is paused. Hold your answer until it resumes.", "EVENT_PAUSED"],
  ended: [403, "Time is up. The hunt is over.", "EVENT_ENDED"],
};
const FS_LOCKED = [
  403,
  "Your team is locked out for leaving full screen too many times. Your timer is paused; speak to the organisers.",
  "FULLSCREEN_LOCKED",
];

// A team locked out for leaving full screen (services/fullscreen.js) can neither read nor submit until an
// organiser restores it. Once the hunt is over for everyone, the normal "ended" message wins.
function assertNotLocked(clock) {
  if (clock?.fsLocked && clock.status !== "ended") {
    const [status, message, code] = FS_LOCKED;
    throw new HttpError(status, message, { code });
  }
}

// Challenge text may only be read once the hunt has started (paused and ended clocks still allow reading).
export function assertStarted(clock) {
  assertNotLocked(clock);
  if (clock?.status === "idle") {
    const [status, message, code] = BLOCKED.idle;
    throw new HttpError(status, message, { code });
  }
}

// Flags and hints need a running clock.
export function assertRunning(clock) {
  assertNotLocked(clock);
  const blocked = BLOCKED[clock?.status];
  if (blocked) {
    const [status, message, code] = blocked;
    throw new HttpError(status, message, { code });
  }
}
