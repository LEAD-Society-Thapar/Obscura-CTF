// Leaderboard ranking (rankTeams). No database needed.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.FLAG_PEPPER ??= "test-pepper";
const { rankTeams } = await import("../src/services/teamState.js");

const at = (min) => new Date(Date.UTC(2026, 10, 21, 10, min)).toISOString();
const team = (id, adjust = 0) => ({ id, name: id.toUpperCase(), points_adjust: adjust });
const solve = (team_id, points, min) => ({ team_id, points, solved_at: at(min) });

test("higher points rank first, regardless of time", () => {
  const rows = rankTeams([team("a"), team("b")], [solve("a", 100, 5), solve("b", 200, 50)], []);
  assert.deepEqual(rows.map((r) => r.teamId), ["b", "a"]);
});

test("equal points: the team whose most recent solve was earlier ranks first", () => {
  const solves = [solve("late", 100, 2), solve("late", 100, 40), solve("early", 200, 30)];
  const rows = rankTeams([team("late"), team("early")], solves, []);
  assert.deepEqual(rows.map((r) => [r.teamId, r.points, r.rank]), [["early", 200, 1], ["late", 200, 2]]);
});

test("equal points and equal last-solve time: more solves first", () => {
  const solves = [solve("one", 200, 30), solve("two", 100, 10), solve("two", 100, 30)];
  const rows = rankTeams([team("one"), team("two")], solves, []);
  assert.deepEqual(rows.map((r) => r.teamId), ["two", "one"]);
});

test("hint costs and admin adjustments count; a team with no solves ranks below an equal-points team with solves", () => {
  // "h": 100 - 20 hint + 0 = 80. "adj": no solves, +80 adjustment. Equal points; h has a solve, so it ranks first.
  const rows = rankTeams([team("adj", 80), team("h")], [solve("h", 100, 15)], [{ team_id: "h", cost: 20 }]);
  assert.deepEqual(rows.map((r) => [r.teamId, r.points]), [["h", 80], ["adj", 80]]);
});

test("output shape is unchanged: { teamId, team, points, solved, rank, isYou }", () => {
  const rows = rankTeams([team("a"), team("b")], [solve("a", 100, 1)], [], "b");
  for (const r of rows) assert.deepEqual(Object.keys(r).sort(), ["isYou", "points", "rank", "solved", "team", "teamId"]);
  assert.equal(rows.find((r) => r.teamId === "b").isYou, true);
  assert.equal(rows.find((r) => r.teamId === "a").isYou, false);
  assert.equal(rows.find((r) => r.teamId === "a").solved, 1);
});
