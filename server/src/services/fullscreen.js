// Full-screen invigilation (migration 003). Pure functions; the controllers do the reads and writes.
//
// While the event clock is running and the team has not finished, its devices must stay in full screen. Every exit
// a device reports is a violation (teams.fs_violations). The FS_MAX_VIOLATIONS-th one locks the team:
//   - its clock freezes: fs_locked_remaining_ms keeps the time it had left, and teamClock() shows that, paused;
//   - flags, hints and gate pages are refused with FULLSCREEN_LOCKED (see assertRunning / assertStarted).
// An organiser can forgive one violation. If that brings the team below the limit it is unlocked, and
// unlockPatch() moves its extra time so the clock resumes from exactly where it froze: time spent locked
// (and anything else that happened meanwhile, like a global pause) does not count against the team.
//
// The browser is the only thing that knows whether it is in full screen, so this is a deterrent, not proof:
// a determined player with developer tools can hide the overlay. The server only counts and enforces.
import { clockView } from "./eventClock.js";

export const FS_MAX_VIOLATIONS = 3;
// Two reports for the same team this close together are treated as one (a retried request, a double event).
export const FS_DUPLICATE_MS = 2_000;

// The columns only exist after migration 003.
export const fullscreenSupported = (team) => !!team && "fs_violations" in team;

// What the team's devices need to know. `required` false switches the overlay off on every device.
export function fullscreenView(ev, team) {
  const supported = fullscreenSupported(team);
  return {
    supported,
    required: supported && ev?.fullscreen_required !== false,
    violations: supported ? Number(team.fs_violations || 0) : 0,
    max: FS_MAX_VIOLATIONS,
    locked: supported && !!team.fs_locked_at,
    lockedAt: supported ? (team.fs_locked_at ?? null) : null,
  };
}

// The team's clock: the event clock plus its extra time, frozen while the team is locked out.
// A manual "end" by the organisers still ends it (the hunt is over for everyone).
export function teamClock(ev, team, now = Date.now()) {
  const clock = clockView(ev, team?.extra_time_ms, now);
  if (!team?.fs_locked_at || clock.status === "idle") return clock;
  if (ev?.status === "ended") return { ...clock, fsLocked: true };
  const frozen = Number(team.fs_locked_remaining_ms);
  return {
    ...clock,
    status: "paused",
    remainingMs: Number.isFinite(frozen) ? Math.max(0, frozen) : clock.remainingMs,
    endsAt: null,
    fsLocked: true,
  };
}

// The update for one reported exit, or null when it must not count:
// rule off or column missing, clock not running, team locked or finished, or a duplicate report.
export function violationPatch(ev, team, { finished = false, now = Date.now() } = {}) {
  const fs = fullscreenView(ev, team);
  if (!fs.required || fs.locked || finished) return null;
  const clock = teamClock(ev, team, now);
  if (clock.status !== "running") return null;
  const last = team.fs_last_violation_at ? new Date(team.fs_last_violation_at).getTime() : 0;
  if (now - last < FS_DUPLICATE_MS) return null;

  const fs_violations = fs.violations + 1;
  const patch = { fs_violations, fs_last_violation_at: new Date(now).toISOString() };
  if (fs_violations >= FS_MAX_VIOLATIONS) {
    patch.fs_locked_at = patch.fs_last_violation_at;
    patch.fs_locked_remaining_ms = clock.remainingMs;
  }
  return patch;
}

// Clears the lock and shifts the team's extra time so that its time left right now equals the time it had when
// it was locked. Works whatever the event clock did in between (paused, extended, ran out for everyone else).
export function unlockPatch(ev, team, now = Date.now()) {
  const patch = { fs_locked_at: null, fs_locked_remaining_ms: null };
  const frozen = Number(team.fs_locked_remaining_ms);
  const open = clockView(ev, team.extra_time_ms, now);
  // Not started, or ended by the organisers: there is no clock to resume, just lift the lock.
  if (!open.endsAt || ev?.status === "ended" || !Number.isFinite(frozen)) return patch;
  const leftNow = new Date(open.endsAt).getTime() - now; // may be negative: not clamped like remainingMs
  patch.extra_time_ms = Math.round(Number(team.extra_time_ms || 0) + (frozen - leftNow));
  return patch;
}

// Admin "ignore one violation". Unlocks the team when it drops below the limit.
export function forgivePatch(ev, team, now = Date.now()) {
  const fs = fullscreenView(ev, team);
  if (fs.violations <= 0) return null;
  const fs_violations = fs.violations - 1;
  const patch = { fs_violations };
  if (fs.locked && fs_violations < FS_MAX_VIOLATIONS) Object.assign(patch, unlockPatch(ev, team, now));
  return patch;
}
