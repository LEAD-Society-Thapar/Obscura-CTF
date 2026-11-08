// Content loading + what each API shape may reveal. No database needed (TeamState is built from fake rows).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

process.env.FLAG_PEPPER ??= "test-pepper";
const raw = JSON.parse(readFileSync(new URL("../src/data/content/challenges.json", import.meta.url), "utf8"));
const { ACTS, CHECKPOINTS, RELICS, RULES, FINAL_BOSS } = await import("../src/data/game.js");
const { TeamState, relicOfAct, isLastOfAct } = await import("../src/services/teamState.js");

test("loads 5 acts, 20 checkpoints, 5 relics; final boss kept out of the unlock chain", () => {
  assert.equal(ACTS.length, 5);
  assert.equal(CHECKPOINTS.length, 20);
  assert.equal(RELICS.length, 5);
  assert.equal(FINAL_BOSS.id, "final");
  assert.ok(!CHECKPOINTS.some((c) => c.id === "final"));
  assert.deepEqual(RULES, raw.rules);
});

test("content strings are passed through byte-for-byte", () => {
  CHECKPOINTS.forEach((cp, i) => {
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
