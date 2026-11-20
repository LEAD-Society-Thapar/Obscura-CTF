// Leaderboard ranking (rankTeams) and coins. No database needed.
//   1. more points  2. on equal points, earlier LAST correct answer  3. then more coins left
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.FLAG_PEPPER ??= "test-pepper";
const { rankTeams } = await import("../src/services/teamState.js");
const { coinsView, readCoins, resetAdjust, START_COINS, wouldOverdraw } = await import("../src/services/coins.js");

const at = (min) => new Date(Date.UTC(2026, 10, 21, 10, min)).toISOString();
const team = (id, adjust = 0, coins_adjust = 0) => ({ id, name: id.toUpperCase(), points_adjust: adjust, coins_adjust });
const solve = (team_id, points, min) => ({ team_id, points, solved_at: at(min) });
const hint = (team_id, cost) => ({ team_id, cost });

test("higher points rank first, regardless of time or coins", () => {
  const rows = rankTeams([team("a"), team("b")], [solve("a", 10, 5), solve("b", 10, 50), solve("b", 10, 51)], [hint("b", 10), hint("b", 15)]);
  assert.deepEqual(rows.map((r) => r.teamId), ["b", "a"]);
});

test("equal points: the team whose last correct answer came earlier ranks first", () => {
  const solves = [solve("late", 10, 2), solve("late", 10, 40), solve("early", 10, 10), solve("early", 10, 30)];
  const rows = rankTeams([team("late"), team("early")], solves, []);
  assert.deepEqual(rows.map((r) => [r.teamId, r.points, r.rank]), [["early", 20, 1], ["late", 20, 2]]);
});

test("equal points and equal last-answer time: more coins left ranks first", () => {
  const solves = [solve("spender", 10, 30), solve("saver", 10, 30)];
  const rows = rankTeams([team("spender"), team("saver")], solves, [hint("spender", 10), hint("spender", 15), hint("saver", 10)]);
  assert.deepEqual(rows.map((r) => [r.teamId, r.coinsLeft]), [["saver", START_COINS - 10], ["spender", START_COINS - 25]]);
});

test("hints never cost points; admin point adjustments count; no correct answer ranks below an equal-points team with one", () => {
  // "h": one solve (10) and a hint: still 10 points. "adj": no solves, +10 adjustment. Equal points; h has a solve.
  const rows = rankTeams([team("adj", 10), team("h")], [solve("h", 10, 15)], [hint("h", 15)]);
  assert.deepEqual(rows.map((r) => [r.teamId, r.points]), [["h", 10], ["adj", 10]]);
});

test("coins: start amount, plus the all-teams bonus and the team's own coins, minus hints", () => {
  assert.deepEqual(coinsView(null, team("a"), []), { total: START_COINS, spent: 0, left: START_COINS });
  assert.deepEqual(coinsView({ coins_bonus: 20 }, team("a", 0, 5), [hint("a", 10), hint("a", 15)]), {
    total: START_COINS + 25,
    spent: 25,
    left: START_COINS,
  });
  // The bonus counts in the ranking too.
  const rows = rankTeams([team("a"), team("b", 0, 30)], [], [], null, { coins_bonus: 10 });
  assert.deepEqual(rows.map((r) => [r.teamId, r.coinsLeft]), [["b", START_COINS + 40], ["a", START_COINS + 10]]);
});

test("never negative: points and coins are floored at 0", () => {
  // A hand-edited negative point adjustment cannot push a score below 0.
  assert.equal(rankTeams([team("neg", -500)], [solve("neg", 20, 1)], [])[0].points, 0);
  // A huge removal for every team, or coins spent beyond the total (a race), shows 0, never less.
  assert.deepEqual(coinsView({ coins_bonus: -500 }, team("a"), []), { total: 0, spent: 0, left: 0 });
  assert.deepEqual(coinsView(null, team("a", 0, -20), [hint("a", 10), hint("a", 15), hint("a", 10), hint("a", 15), hint("a", 10), hint("a", 15), hint("a", 10), hint("a", 15)]).left, 0);
  // Reset clock keeps a team's coin adjustment at exactly what it has spent beyond the start amount.
  assert.equal(resetAdjust(40), 0);
  assert.equal(resetAdjust(START_COINS + 15), 15);
  assert.equal(coinsView(null, team("a", 0, resetAdjust(START_COINS + 15)), [hint("a", START_COINS + 15)]).left, 0);
});

test("admin guard: removing coins below what a team already spent is caught (even though coins show 0)", () => {
  const spent = [hint("a", 10), hint("a", 15)]; // 25 spent
  assert.equal(wouldOverdraw(null, team("a", 0, -(START_COINS - 25)), spent), false); // exactly 0 left: allowed
  assert.equal(wouldOverdraw(null, team("a", 0, -(START_COINS - 24)), spent), true); // 1 short: refused
  assert.equal(wouldOverdraw({ coins_bonus: -(START_COINS - 20) }, team("a"), spent), true); // all-teams removal
  assert.equal(coinsView({ coins_bonus: -(START_COINS - 20) }, team("a"), spent).left, 0); // display stays at 0
});

test("admin coin input: a non-zero whole number within the limit", () => {
  assert.equal(readCoins({ coins: 20 }), 20);
  assert.equal(readCoins({ coins: -15 }), -15);
  for (const coins of [0, 1.5, "abc", 5000, -5000, null]) assert.equal(readCoins({ coins }), null);
});

test("output shape: { teamId, team, points, solved, coinsLeft, rank, isYou }", () => {
  const rows = rankTeams([team("a"), team("b")], [solve("a", 10, 1)], [], "b");
  for (const r of rows) assert.deepEqual(Object.keys(r).sort(), ["coinsLeft", "isYou", "points", "rank", "solved", "team", "teamId"]);
  assert.equal(rows.find((r) => r.teamId === "b").isYou, true);
  assert.equal(rows.find((r) => r.teamId === "a").isYou, false);
  assert.equal(rows.find((r) => r.teamId === "a").solved, 1);
});
