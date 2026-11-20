// Event clock + the one-attempt rule. No database needed (TeamState is built from fake rows).
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.FLAG_PEPPER ??= "test-pepper";
const { clockView, assertRunning, assertStarted, DEFAULT_DURATION_MINUTES } = await import("../src/services/eventClock.js");
const { ACTS, ACT_CHECKPOINTS, CHECKPOINTS, FINAL_BOSS, RELICS } = await import("../src/data/game.js");
const { TeamState, earnedRelicIds } = await import("../src/services/teamState.js");
const { openGate } = await import("../src/controllers/game.controller.js");

const T0 = Date.parse("2026-11-20T10:00:00Z");
const MIN = 60_000;
const iso = (ms) => new Date(ms).toISOString();
const running = { status: "running", started_at: iso(T0), paused_at: null, total_paused_ms: 0, duration_minutes: 90 };

// ---------- clock ----------
test("clock: idle shows the full duration and no end time", () => {
  for (const ev of [undefined, { status: "idle", started_at: null, duration_minutes: DEFAULT_DURATION_MINUTES }]) {
    const c = clockView(ev, 0, T0);
    assert.equal(c.status, "idle");
    assert.equal(c.endsAt, null);
    assert.equal(c.remainingMs, DEFAULT_DURATION_MINUTES * MIN);
  }
  assert.equal(DEFAULT_DURATION_MINUTES, 60);
});

test("clock: running counts down and ends by itself", () => {
  const mid = clockView(running, 0, T0 + 30 * MIN);
  assert.equal(mid.status, "running");
  assert.equal(mid.remainingMs, 60 * MIN);
  assert.equal(mid.endsAt, iso(T0 + 90 * MIN));
  const over = clockView(running, 0, T0 + 91 * MIN);
  assert.equal(over.status, "ended");
  assert.equal(over.remainingMs, 0);
});

test("clock: a pause freezes the remaining time, and resuming pushes the end back", () => {
  const paused = { ...running, status: "paused", paused_at: iso(T0 + 20 * MIN) };
  assert.equal(clockView(paused, 0, T0 + 25 * MIN).remainingMs, 70 * MIN);
  assert.equal(clockView(paused, 0, T0 + 500 * MIN).remainingMs, 70 * MIN);
  assert.equal(clockView(paused, 0, T0 + 500 * MIN).status, "paused");
  const resumed = { ...running, total_paused_ms: 10 * MIN };
  assert.equal(clockView(resumed, 0, T0 + 30 * MIN).remainingMs, 70 * MIN);
  assert.equal(clockView(resumed, 0, T0 + 30 * MIN).endsAt, iso(T0 + 100 * MIN));
});

test("clock: extra time applies to one team only", () => {
  const now = T0 + 95 * MIN;
  assert.equal(clockView(running, 0, now).status, "ended");
  const withExtra = clockView(running, 10 * MIN, now);
  assert.equal(withExtra.status, "running");
  assert.equal(withExtra.remainingMs, 5 * MIN);
  assert.equal(clockView(running, undefined, now).status, "ended"); // column missing before migration 002
});

test("clock: a manual end beats extra time", () => {
  const c = clockView({ ...running, status: "ended" }, 30 * MIN, T0 + 10 * MIN);
  assert.equal(c.status, "ended");
  assert.equal(c.remainingMs, 0);
});

test("clock: flags need a running clock; reading needs a started one", () => {
  const code = (fn) => {
    try {
      fn();
      return null;
    } catch (e) {
      return `${e.status} ${e.data.code}`;
    }
  };
  assert.equal(code(() => assertRunning({ status: "running" })), null);
  assert.equal(code(() => assertRunning({ status: "idle" })), "403 EVENT_NOT_STARTED");
  assert.equal(code(() => assertRunning({ status: "paused" })), "403 EVENT_PAUSED");
  assert.equal(code(() => assertRunning({ status: "ended" })), "403 EVENT_ENDED");
  assert.equal(code(() => assertStarted({ status: "idle" })), "403 EVENT_NOT_STARTED");
  assert.equal(code(() => assertStarted({ status: "paused" })), null);
  assert.equal(code(() => assertStarted({ status: "ended" })), null);
});

// ---------- one attempt per checkpoint ----------
const team = { id: "t9", name: "T9", team_code: "T9", points_adjust: 0 };
const at = (n) => iso(T0 + n * MIN);
const solve = (cp, n = 1) => ({ cp_id: cp.id, points: cp.points, solved_at: at(n) });
const miss = (cp, n = 1, submitted = "wrong") => ({ cp_id: cp.id, submitted, created_at: at(n) });
const relicRows = (ids) => ids.map((relic_id) => ({ relic_id, earned_at: at(0) }));
const cp = (id) => CHECKPOINTS.find((c) => c.id === id);

test("one attempt: a wrong answer closes the checkpoint with 0 points and opens the next gate", () => {
  const s = new TeamState(team, [solve(cp("1.1"))], [], [], [miss(cp("1.2"), 2)]);
  assert.equal(s.status.get("1.1"), "solved");
  assert.equal(s.status.get("1.2"), "failed");
  assert.equal(s.status.get("1.3"), "current");
  assert.equal(s.status.get("2.1"), "locked");
  assert.equal(s.points, cp("1.1").points);
  assert.equal(s.summary(cp("1.2")).slug, s.slugOf(cp("1.2"))); // still viewable
  assert.equal(s.nextOf(cp("1.2")).id, "1.3");
  const p = s.progress();
  assert.equal(p.stats.solved, 1);
  assert.equal(p.stats.missed, 1);
  assert.equal(p.stats.streak, 0); // the miss is the most recent event
  assert.equal(p.activity[0].type, "miss");
  assert.equal(p.activity[0].delta, 0);
});

test("one attempt: a missed checkpoint shows its reel but never the text the team typed", () => {
  const s = new TeamState(team, [], [], [], [miss(cp("1.1"), 1, "my-secret-guess")]);
  const d = s.detail(cp("1.1"));
  assert.equal(d.status, "failed");
  assert.equal(d.reel.clue, cp("1.1").reel.clue);
  assert.equal(d.next.id, "1.2");
  assert.ok(!JSON.stringify(s.progress()).includes("my-secret-guess"));
  assert.ok(!JSON.stringify(d).includes("my-secret-guess"));
  assert.equal(s.adminRow().misses[0].submitted, "my-secret-guess"); // organisers do see it
});

test("one attempt: a solve wins over a wrong row for the same checkpoint (two requests racing)", () => {
  const s = new TeamState(team, [solve(cp("1.1"), 2)], [], [], [miss(cp("1.1"), 1)]);
  assert.equal(s.status.get("1.1"), "solved");
  assert.equal(s.progress().stats.missed, 0);
});

test("one attempt: relics are earned when an act's last checkpoint closes, solved or missed", () => {
  assert.deepEqual(earnedRelicIds(["1.1", "1.2"]), []);
  assert.deepEqual(earnedRelicIds(["1.3"]), [ACTS[0].relicId]);
  assert.deepEqual(earnedRelicIds(ACT_CHECKPOINTS.map((c) => c.id)).sort(), RELICS.map((r) => r.id).sort());
  assert.deepEqual(earnedRelicIds(["final"]), []);
});

test("one attempt: a team that missed every act checkpoint still reaches the final", () => {
  const s = new TeamState(team, [], [], relicRows(RELICS.map((r) => r.id)), ACT_CHECKPOINTS.map((c, i) => miss(c, i)));
  assert.equal(s.points, 0);
  assert.equal(s.status.get(FINAL_BOSS.id), "current");
  assert.equal(openGate(s, s.slugOf(FINAL_BOSS)), FINAL_BOSS);
});

test("one attempt: a missed final ends the run without the victory ending", () => {
  const s = new TeamState(team, ACT_CHECKPOINTS.map((c, i) => solve(c, i)), [], relicRows(RELICS.map((r) => r.id)), [miss(FINAL_BOSS, 50)]);
  const p = s.progress();
  assert.equal(p.finalBoss.status, "failed");
  assert.equal(p.finished, false);
  assert.equal(p.finalMissed, true);
  assert.equal(s.detail(FINAL_BOSS).reel, null);
  assert.equal(s.canSeeReel(FINAL_BOSS), false);
  assert.ok(!JSON.stringify(p).includes(FINAL_BOSS.reel.clue));
  assert.equal(openGate(s, s.slugOf(FINAL_BOSS)), FINAL_BOSS); // the gate page still opens, read-only
});

test("one attempt: reopening (the wrong row is gone) makes that checkpoint current again", () => {
  // Team missed 1.2 and went on to solve 1.3; an admin then deletes the wrong row for 1.2.
  const s = new TeamState(team, [solve(cp("1.1")), solve(cp("1.3"), 3)], [], [], []);
  assert.equal(s.status.get("1.2"), "current");
  assert.equal(s.status.get("1.3"), "solved");
  assert.equal(s.status.get("2.1"), "locked"); // waits until 1.2 is closed again
});

test("admin row: counts, current gate and per-checkpoint statuses", () => {
  const clock = clockView(running, 5 * MIN, T0 + 10 * MIN);
  const s = new TeamState(team, [solve(cp("1.1"))], [{ cp_id: "1.1", hint_id: 1, cost: 20, revealed_at: at(1) }], [], [miss(cp("1.2"), 4)], clock);
  const row = s.adminRow(3);
  assert.equal(row.rank, 3);
  assert.equal(row.code, "T9");
  assert.equal(row.points, cp("1.1").points - 20);
  assert.deepEqual([row.solved, row.missed, row.hintsUsed, row.relics], [1, 1, 1, 0]);
  assert.deepEqual(row.current, { id: "1.3", title: cp("1.3").title });
  assert.equal(row.lastActivityAt, at(4));
  assert.deepEqual(row.clock, { status: "running", remainingMs: 85 * MIN, extraTimeMs: 5 * MIN });
  assert.equal(row.checkpoints.length, CHECKPOINTS.length); // 15 act checkpoints + the final
  assert.deepEqual(row.checkpoints.slice(0, 4).map((c) => c.status), ["solved", "failed", "current", "locked"]);
  assert.ok(!("password_hash" in row));
});
