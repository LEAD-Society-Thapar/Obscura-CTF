// Full-screen invigilation: counting, locking, the frozen clock and resuming. No database needed.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.FLAG_PEPPER ??= "test-pepper";
const { assertRunning, assertStarted } = await import("../src/services/eventClock.js");
const { FS_DUPLICATE_MS, FS_MAX_VIOLATIONS, forgivePatch, fullscreenView, teamClock, unlockPatch, violationPatch } = await import(
  "../src/services/fullscreen.js"
);

const T0 = Date.parse("2026-11-20T10:00:00Z");
const MIN = 60_000;
const iso = (ms) => new Date(ms).toISOString();
const running = { status: "running", started_at: iso(T0), paused_at: null, total_paused_ms: 0, duration_minutes: 90, fullscreen_required: true };
const team = (over = {}) => ({
  id: "t1",
  extra_time_ms: 0,
  fs_violations: 0,
  fs_last_violation_at: null,
  fs_locked_at: null,
  fs_locked_remaining_ms: null,
  ...over,
});
const apply = (t, patch) => ({ ...t, ...patch });
const code = (fn) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e.data?.code ?? e.message;
  }
};

test("fullscreen: off without migration 003 or when the organisers switch it off", () => {
  const { fs_violations: _a, fs_last_violation_at: _b, fs_locked_at: _c, fs_locked_remaining_ms: _d, ...old } = team();
  assert.equal(fullscreenView(running, old).required, false);
  assert.equal(violationPatch(running, old, { now: T0 + MIN }), null);
  assert.equal(fullscreenView({ ...running, fullscreen_required: false }, team()).required, false);
  assert.equal(violationPatch({ ...running, fullscreen_required: false }, team(), { now: T0 + MIN }), null);
  assert.equal(fullscreenView(running, team()).required, true);
  assert.equal(fullscreenView(running, team()).max, 3);
});

test("fullscreen: exits only count while the clock runs and the team has not finished", () => {
  assert.equal(violationPatch({ status: "idle" }, team(), { now: T0 }), null);
  assert.equal(violationPatch({ ...running, status: "paused", paused_at: iso(T0 + MIN) }, team(), { now: T0 + 2 * MIN }), null);
  assert.equal(violationPatch({ ...running, status: "ended" }, team(), { now: T0 + 2 * MIN }), null);
  assert.equal(violationPatch(running, team(), { now: T0 + 91 * MIN }), null); // time ran out
  assert.equal(violationPatch(running, team(), { now: T0 + MIN, finished: true }), null);
  assert.equal(violationPatch(running, team(), { now: T0 + MIN }).fs_violations, 1);
});

test("fullscreen: duplicate reports within a moment count once", () => {
  let t = apply(team(), violationPatch(running, team(), { now: T0 + MIN }));
  assert.equal(violationPatch(running, t, { now: T0 + MIN + FS_DUPLICATE_MS - 1 }), null);
  t = apply(t, violationPatch(running, t, { now: T0 + MIN + FS_DUPLICATE_MS }));
  assert.equal(t.fs_violations, 2);
});

test("fullscreen: the third exit locks the team and freezes its time left", () => {
  let t = team({ extra_time_ms: 5 * MIN });
  t = apply(t, violationPatch(running, t, { now: T0 + 10 * MIN }));
  t = apply(t, violationPatch(running, t, { now: T0 + 20 * MIN }));
  assert.equal(t.fs_locked_at, null);
  t = apply(t, violationPatch(running, t, { now: T0 + 30 * MIN }));
  assert.equal(t.fs_violations, FS_MAX_VIOLATIONS);
  assert.equal(t.fs_locked_at, iso(T0 + 30 * MIN));
  assert.equal(t.fs_locked_remaining_ms, 65 * MIN); // 90 + 5 extra - 30 elapsed

  // Frozen and paused for this team, however long it stays locked, even after everyone else's time ran out.
  for (const now of [T0 + 31 * MIN, T0 + 80 * MIN, T0 + 200 * MIN]) {
    const c = teamClock(running, t, now);
    assert.equal(c.status, "paused");
    assert.equal(c.remainingMs, 65 * MIN);
    assert.equal(c.fsLocked, true);
  }
  // No more counting while locked.
  assert.equal(violationPatch(running, t, { now: T0 + 40 * MIN }), null);
});

test("fullscreen: a locked team cannot read gates, submit or reveal hints", () => {
  const t = team({ fs_violations: 3, fs_locked_at: iso(T0 + 30 * MIN), fs_locked_remaining_ms: 60 * MIN });
  const c = teamClock(running, t, T0 + 35 * MIN);
  assert.equal(code(() => assertRunning(c)), "FULLSCREEN_LOCKED");
  assert.equal(code(() => assertStarted(c)), "FULLSCREEN_LOCKED");
  // Ended by the organisers: the hunt is over for everyone, the usual message wins.
  const ended = teamClock({ ...running, status: "ended" }, t, T0 + 35 * MIN);
  assert.equal(ended.status, "ended");
  assert.equal(code(() => assertRunning(ended)), "EVENT_ENDED");
});

test("fullscreen: ignoring a violation unlocks at 2/3 and the timer resumes from where it froze", () => {
  const locked = team({ extra_time_ms: 0, fs_violations: 3, fs_locked_at: iso(T0 + 30 * MIN), fs_locked_remaining_ms: 60 * MIN });
  const now = T0 + 45 * MIN; // locked for 15 minutes
  const t = apply(locked, forgivePatch(running, locked, now));
  assert.equal(t.fs_violations, 2);
  assert.equal(t.fs_locked_at, null);
  assert.equal(t.extra_time_ms, 15 * MIN); // the 15 locked minutes are given back
  const c = teamClock(running, t, now);
  assert.equal(c.status, "running");
  assert.equal(c.remainingMs, 60 * MIN);
  assert.equal(code(() => assertRunning(c)), null);
  // One more exit locks again.
  const again = apply(t, violationPatch(running, t, { now: now + MIN }));
  assert.equal(again.fs_violations, 3);
  assert.equal(again.fs_locked_remaining_ms, 59 * MIN);
});

test("fullscreen: unlock is exact across a global pause and after everyone else's time ran out", () => {
  const locked = team({ extra_time_ms: 2 * MIN, fs_violations: 3, fs_locked_at: iso(T0 + 30 * MIN), fs_locked_remaining_ms: 62 * MIN });
  // Global pause from 40 to 50 min, still paused at 55.
  const paused = { ...running, status: "paused", paused_at: iso(T0 + 40 * MIN) };
  const t1 = apply(locked, unlockPatch(paused, locked, T0 + 55 * MIN));
  assert.equal(teamClock(paused, t1, T0 + 55 * MIN).remainingMs, 62 * MIN);
  assert.equal(teamClock(paused, t1, T0 + 55 * MIN).status, "paused"); // still the global pause
  // Unlocked long after the hunt ran out for everyone else: this team still gets its 62 minutes.
  const t2 = apply(locked, unlockPatch(running, locked, T0 + 120 * MIN));
  const c = teamClock(running, t2, T0 + 120 * MIN);
  assert.equal(c.status, "running");
  assert.equal(c.remainingMs, 62 * MIN);
  // Ended by the organisers: only the lock is lifted, the clock stays ended.
  const ended = { ...running, status: "ended" };
  const t3 = apply(locked, unlockPatch(ended, locked, T0 + 60 * MIN));
  assert.equal(t3.fs_locked_at, null);
  assert.equal(t3.extra_time_ms, 2 * MIN);
  assert.equal(teamClock(ended, t3, T0 + 60 * MIN).status, "ended");
});

test("fullscreen: forgiving below the limit only lowers the count; nothing to forgive at 0", () => {
  const t = team({ fs_violations: 2 });
  assert.deepEqual(forgivePatch(running, t, T0), { fs_violations: 1 });
  assert.equal(forgivePatch(running, team(), T0), null);
});
