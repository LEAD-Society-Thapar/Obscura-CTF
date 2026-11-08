// Content loading + what each API shape may reveal. No database needed (TeamState is built from fake rows).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

process.env.FLAG_PEPPER ??= "test-pepper";
const raw = JSON.parse(readFileSync(new URL("../src/data/content/challenges.json", import.meta.url), "utf8"));
const { ACTS, ACT_CHECKPOINTS, CHECKPOINTS, RELICS, RULES, FINAL_BOSS } = await import("../src/data/game.js");
const { TeamState, relicOfAct, isLastOfAct } = await import("../src/services/teamState.js");

test("loads 5 acts, 20 act checkpoints + the final face-off as the 21st gate, 5 relics", () => {
  assert.equal(ACTS.length, 5);
  assert.equal(ACT_CHECKPOINTS.length, 20);
  assert.equal(CHECKPOINTS.length, 21);
  assert.equal(CHECKPOINTS.at(-1), FINAL_BOSS);
  assert.equal(FINAL_BOSS.id, "final");
  assert.equal(FINAL_BOSS.act, null);
  assert.equal(RELICS.length, 5);
  assert.deepEqual(RULES, raw.rules);
});

test("content strings are passed through byte-for-byte", () => {
  ACT_CHECKPOINTS.forEach((cp, i) => {
    const src = raw.checkpoints[i];
    for (const k of ["id", "title", "category", "points", "story", "body"]) assert.equal(cp[k], src[k], `${cp.id}.${k}`);
    assert.equal(cp.reel.quote, src.reel.quote);
    assert.equal(cp.reel.clue, src.reel.clue);
    assert.deepEqual(cp.hints, src.hints);
  });
  assert.equal(FINAL_BOSS.body, raw.finalBoss.body);
  RELICS.forEach((r, i) => {
    assert.equal(r.inscription, raw.relics[i].inscription);
    assert.equal(r.lore, raw.relics[i].lore);
  });
  ACTS.forEach((a, i) => assert.equal(a.film, raw.acts[i].film));
});

test("CP 2.4 keeps its Cyrillic letters and CP 1.1 keeps its HTML", () => {
  const cyr = /[Ѐ-ӿ]/;
  const cp24 = CHECKPOINTS.find((c) => c.id === "2.4");
  assert.ok(cyr.test(cp24.body) || cyr.test(cp24.story), "no Cyrillic found in CP 2.4");
  assert.ok(CHECKPOINTS.find((c) => c.id === "1.1").body.includes("<"), "no HTML found in CP 1.1");
});

test("relic is awarded on the last checkpoint of each act", () => {
  for (const a of ACTS) {
    const last = CHECKPOINTS.filter((c) => c.act === a.id).at(-1);
    assert.ok(isLastOfAct(last));
    assert.equal(relicOfAct(a.id).id, a.relicId);
  }
});

// Team that solved all of act 1 (so it holds relic 1) and revealed hint 1 on 2.1.
const solves = CHECKPOINTS.filter((c) => c.act === 1).map((c) => ({ cp_id: c.id, points: c.points, solved_at: new Date().toISOString() }));
const hints = [{ cp_id: "2.1", hint_id: 1, cost: 20, revealed_at: new Date().toISOString() }];
const relics = [{ relic_id: ACTS[0].relicId, earned_at: new Date().toISOString() }];
const state = new TeamState({ id: "t1", name: "T", points_adjust: 0 }, solves, hints, relics);

test("/progress: checkpoint summaries carry no story, body, hints or reel", () => {
  const p = state.progress();
  const keys = new Set(p.acts.flatMap((a) => a.checkpoints.flatMap(Object.keys)));
  for (const k of ["story", "body", "hints", "reel", "downloads"]) assert.ok(!keys.has(k), `summary leaks ${k}`);
  const locked = p.acts.flatMap((a) => a.checkpoints).filter((c) => c.status === "locked");
  assert.ok(locked.length > 0 && locked.every((c) => c.slug === null));
  assert.ok(!JSON.stringify(p).includes(CHECKPOINTS[5].body), "a body text appears somewhere in /progress");
});

test("/progress: relic inscription and lore only for collected relics", () => {
  for (const r of state.progress().relics) {
    if (r.collected) {
      assert.equal(r.inscription, RELICS.find((x) => x.id === r.id).inscription);
      assert.equal(r.lore, RELICS.find((x) => x.id === r.id).lore);
    } else {
      assert.equal(r.inscription, null);
      assert.equal(r.lore, null);
    }
  }
  assert.equal(state.progress().relics.filter((r) => r.collected).length, 1);
});

test("gate detail: body included, unrevealed hint text and unsolved reel withheld", () => {
  const d = state.detail(CHECKPOINTS.find((c) => c.id === "2.1"));
  assert.equal(d.status, "current");
  assert.equal(d.body, CHECKPOINTS[4].body);
  assert.equal(d.hints[0].text, CHECKPOINTS[4].hints[0].text);
  assert.equal(d.hints[1].text, null);
  assert.equal(d.reel, null);
});

test("submit response relic carries inscription and lore", () => {
  const relic = relicOfAct(1);
  assert.equal(typeof relic.inscription, "string");
  assert.equal(typeof relic.lore, "string");
});

// ---------- Final face-off ----------
const { openGate } = await import("../src/controllers/game.controller.js");
const now = () => new Date().toISOString();
const solveRows = (cps) => cps.map((c) => ({ cp_id: c.id, points: c.points, solved_at: now() }));
const relicRows = (ids) => ids.map((relic_id) => ({ relic_id, earned_at: now() }));
const team = { id: "t2", name: "T2", points_adjust: 0 };

test("final boss: 5.4 still awards the Martian Orb; final never awards a relic", () => {
  const cp54 = CHECKPOINTS.find((c) => c.id === "5.4");
  assert.ok(isLastOfAct(cp54));
  assert.equal(relicOfAct(cp54.act).id, "martian-orb");
  assert.equal(isLastOfAct(FINAL_BOSS), false);
  assert.equal(relicOfAct(FINAL_BOSS.act), null);
});

test("final boss: never in acts or per-act counts", () => {
  const p = new TeamState(team, [], [], []).progress();
  const ids = p.acts.flatMap((a) => a.checkpoints.map((c) => c.id));
  assert.equal(ids.length, 20);
  assert.ok(!ids.includes("final"));
  assert.equal(p.finalBoss.status, "locked");
  assert.equal(p.finalBoss.slug, null);
  assert.equal(p.finished, false);
  assert.equal(p.finishedAt, null);
  assert.equal(p.relicsTotal, 5);
  assert.deepEqual(Object.keys(p.finalBoss).sort(), ["category", "id", "points", "slug", "status", "title"]);
});

test("final boss: unlocks after 5.4 with all five relics", () => {
  const s = new TeamState(team, solveRows(ACT_CHECKPOINTS), [], relicRows(RELICS.map((r) => r.id)));
  const p = s.progress();
  assert.equal(p.finalBoss.status, "current");
  assert.equal(p.finalBoss.slug, s.slugOf(FINAL_BOSS));
  assert.equal(p.relicsCollected, 5);
  assert.equal(openGate(s, s.slugOf(FINAL_BOSS)), FINAL_BOSS);
  assert.equal(s.nextOf(CHECKPOINTS.find((c) => c.id === "5.4")).id, "final");
});

test("final boss: defence in depth, 403 LOCKED without every relic even when order allows it", () => {
  // All 20 solved (order says final is next) but one relic row is missing.
  const s = new TeamState(team, solveRows(ACT_CHECKPOINTS), [], relicRows(RELICS.slice(0, 4).map((r) => r.id)));
  assert.equal(s.progress().finalBoss.status, "locked");
  assert.equal(s.progress().finalBoss.slug, null);
  assert.equal(s.nextOf(CHECKPOINTS.find((c) => c.id === "5.4")), null);
  assert.throws(() => openGate(s, s.slugOf(FINAL_BOSS)), (e) => e.status === 403 && e.data.code === "LOCKED" && e.data.final === true);
});

test("final boss: solved -> finished, finishedAt, counted in stats and activity", () => {
  const rows = solveRows(CHECKPOINTS);
  const s = new TeamState(team, rows, [], relicRows(RELICS.map((r) => r.id)));
  const p = s.progress();
  assert.equal(p.finished, true);
  assert.equal(p.finishedAt, rows.at(-1).solved_at);
  assert.equal(p.finalBoss.status, "solved");
  assert.equal(p.stats.solved, 21);
  assert.equal(p.stats.totalCheckpoints, 21);
  assert.equal(p.team.points, CHECKPOINTS.reduce((n, c) => n + c.points, 0));
  const fin = p.activity.find((e) => e.cpId === "final");
  assert.equal(fin.cp.id, "final");
  assert.equal(fin.delta, FINAL_BOSS.points);
  assert.equal(openGate(s, s.slugOf(FINAL_BOSS)), FINAL_BOSS); // still viewable after solving
});
