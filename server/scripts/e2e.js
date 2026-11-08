// End-to-end walk of all 21 gates against the REAL database in .env, through the real Express app over HTTP.
//
//   npm run e2e -- --allow-db        (repo root)     or     npm run e2e -- --allow-db   (server/)
//
// Safety rules (enforced below):
//   - only creates/deletes ONE throwaway team (team_code "e2e_team") and rows that belong to it;
//   - never resets progress, never touches event_state (the clock), never modifies other teams or checkpoints;
//   - always deletes the e2e team (and, by FK cascade, its solves/hints/relics/submissions) at the end, even on failure.
// Answers come from server/private/flags.local.json and are never printed.
// The submit limiter allows 1 submission per 10 s per team, so a full run takes about 4 minutes.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

if (!process.argv.includes("--allow-db")) {
  console.error("Refusing to run without --allow-db (this talks to the database in .env).");
  process.exit(2);
}
if (!process.env.FLAG_PEPPER) {
  console.error("FLAG_PEPPER is not set; it must match the value used by db:seed:flags.");
  process.exit(2);
}

// Hide morgan's per-request log lines so the report stays readable.
const realWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, ...rest) =>
  /(GET|POST|PUT|DELETE) \/api\//.test(String(chunk)) ? true : realWrite(chunk, ...rest);

const { default: app } = await import("../src/app.js");
const { requireDb } = await import("../src/config/supabase.js");
const { CHECKPOINTS, FINAL_BOSS, RELICS, ACTS } = await import("../src/data/game.js");
const { deriveGateSlug, hashFlag } = await import("../src/utils/gate.js");
const { hashPassword } = await import("../src/utils/password.js");
const { loadFlagsFile } = await import("../src/utils/flagRows.js");

const TEAM_CODE = "e2e_team";
const TEAM_NAME = "E2E throwaway team";
const PASSWORD = crypto.randomBytes(12).toString("hex");
const SUBMIT_GAP_MS = 10_300;

const raw = JSON.parse(readFileSync(new URL("../src/data/content/challenges.json", import.meta.url), "utf8"));
const flags = loadFlagsFile();
if (!flags) {
  console.error("server/private/flags.local.json not found.");
  process.exit(2);
}
const db = requireDb();

// ---------- tiny assertion log ----------
let passed = 0;
const failures = [];
function ok(cond, name) {
  if (cond) passed++;
  else failures.push(name);
  return cond;
}
class Fatal extends Error {}
function must(cond, name) {
  if (!ok(cond, name)) throw new Fatal(name);
}
const log = (s) => console.log(s);

// ---------- HTTP client with a one-cookie jar ----------
let base = "";
let cookie = "";
let lastSubmitAt = 0;
async function call(method, path, body) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const set = res.headers.getSetCookie?.() ?? [];
  for (const c of set) if (c.startsWith("sat_team=")) cookie = c.split(";")[0];
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  return { status: res.status, data };
}
async function submit(slug, flag) {
  const wait = lastSubmitAt + SUBMIT_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSubmitAt = Date.now();
  return call("POST", `/game/gate/${slug}/submit`, { flag });
}

// ---------- expectations ----------
const unwrap = (s) => {
  const m = /^obscura\{([\s\S]*)\}$/i.exec(String(s).trim());
  return m ? m[1] : String(s);
};
const secretTexts = (cp) =>
  [cp.body, cp.story, cp.reel.quote, cp.reel.clue, ...cp.hints.flatMap((h) => [h.text])].filter(
    (t) => typeof t === "string" && t.length >= 8
  );
const ALL_SECRET_TEXTS = CHECKPOINTS.flatMap((cp) => secretTexts(cp).map((t) => [cp.id, t]));
const SUMMARY_KEYS = ["act", "category", "id", "index", "points", "slug", "status", "title"].join();
const FINAL_KEYS = ["category", "id", "points", "slug", "status", "title"].join();

// /progress must never carry body, story, hint text or reel text for ANY checkpoint, and relic
// inscription/lore only for collected relics.
function checkProgress(p, label, expect) {
  const json = JSON.stringify(p);
  const leaks = ALL_SECRET_TEXTS.filter(([, t]) => json.includes(t)).map(([id]) => id);
  ok(leaks.length === 0, `${label}: /progress leaks body/story/hint/reel text of ${[...new Set(leaks)].join(", ")}`);

  const summaries = p.acts.flatMap((a) => a.checkpoints);
  ok(summaries.length === 20, `${label}: acts list ${summaries.length} checkpoints, expected 20`);
  ok(!summaries.some((c) => c.id === FINAL_BOSS.id), `${label}: final appears inside an act`);
  ok(summaries.every((c) => Object.keys(c).sort().join() === SUMMARY_KEYS), `${label}: summary has unexpected keys`);
  ok(summaries.every((c) => c.status !== "locked" || c.slug === null), `${label}: a locked checkpoint exposes a slug`);
  ok(Object.keys(p.finalBoss).sort().join() === FINAL_KEYS, `${label}: finalBoss has unexpected keys`);
  ok(p.finalBoss.status !== "locked" || p.finalBoss.slug === null, `${label}: locked final exposes a slug`);

  for (const r of p.relics) {
    const src = RELICS.find((x) => x.id === r.id);
    if (r.collected) {
      ok(r.inscription === src.inscription && r.lore === src.lore, `${label}: collected relic ${r.id} text mismatch`);
    } else {
      ok(r.inscription === null && r.lore === null, `${label}: uncollected relic ${r.id} exposes inscription/lore`);
      ok(!json.includes(src.lore), `${label}: lore of uncollected relic ${r.id} appears in /progress`);
    }
  }
  ok(p.team.points === expect.points, `${label}: points ${p.team.points}, expected ${expect.points}`);
  ok(p.relicsCollected === expect.relics, `${label}: relicsCollected ${p.relicsCollected}, expected ${expect.relics}`);
  ok(p.stats.solved === expect.solved, `${label}: stats.solved ${p.stats.solved}, expected ${expect.solved}`);
}

// ---------- DB helpers (own team only) ----------
const rowsOf = ({ data, error }) => {
  if (error) throw error;
  return data;
};
async function deleteE2eTeam() {
  rowsOf(await db.from("teams").delete().eq("team_code", TEAM_CODE)); // cascades to its solves/hints/relics/submissions
}

// ---------- run ----------
let server;
let teamId = null;
const t0 = Date.now();
try {
  // Preflight (read-only): every checkpoint row exists and its hash matches this machine's FLAG_PEPPER.
  const rows = rowsOf(await db.from("checkpoints").select("*"));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const missing = CHECKPOINTS.filter((c) => !byId.has(c.id)).map((c) => c.id);
  must(missing.length === 0, `preflight: checkpoints table is missing ${missing.join(", ")} (run npm run db:seed:flags)`);
  const mismatched = CHECKPOINTS.filter((c) => byId.get(c.id).flag_hash !== hashFlag(c.id, flags[c.id].primary)).map((c) => c.id);
  must(
    mismatched.length === 0,
    `preflight: flag_hash does not match FLAG_PEPPER + flags.local.json for ${mismatched.join(", ")} (re-run npm run db:seed:flags with the same FLAG_PEPPER)`
  );
  ok(rows.every((r) => Array.isArray(r.accepted_hashes)), "preflight: accepted_hashes column missing (apply migration 001)");
  log(`preflight: ${CHECKPOINTS.length} checkpoint rows present, hashes match FLAG_PEPPER`);

  await deleteE2eTeam(); // leftovers from a crashed run (own team only)
  const [team] = rowsOf(
    await db
      .from("teams")
      .insert({ name: TEAM_NAME, team_code: TEAM_CODE, password_hash: hashPassword(PASSWORD), members: [] })
      .select("id")
  );
  teamId = team.id;
  log(`created throwaway team ${TEAM_CODE} (${teamId})`);

  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;

  must((await call("POST", "/auth/login", { teamCode: TEAM_CODE, password: PASSWORD })).status === 200, "login");
  log("login: ok");

  const slug = (cp) => deriveGateSlug(teamId, cp.id);
  const cpById = (id) => CHECKPOINTS.find((c) => c.id === id);
  const expect = { points: 0, relics: 0, solved: 0 };

  // ----- before any solve -----
  let p = (await call("GET", "/game/progress")).data;
  checkProgress(p, "start", expect);
  ok(p.finalBoss.status === "locked" && p.finalBoss.slug === null, "start: final is locked with no slug");
  ok(p.finished === false && p.finishedAt === null, "start: finished is false");

  let r = await call("GET", `/game/gate/${slug(cpById("1.2"))}`);
  ok(r.status === 403 && r.data?.code === "LOCKED", `locked: CP 1.2 slug -> ${r.status} ${r.data?.code}`);
  r = await call("GET", `/game/gate/${slug(cpById("3.1"))}`);
  ok(r.status === 403 && r.data?.code === "LOCKED", `locked: CP 3.1 slug -> ${r.status} ${r.data?.code}`);
  r = await call("GET", `/game/gate/${slug(FINAL_BOSS)}`);
  ok(r.status === 403 && r.data?.code === "LOCKED" && r.data?.final === true, `locked: final slug -> ${r.status} ${r.data?.code}`);
  r = await call("GET", "/game/gate/not-a-real-slug");
  ok(r.status === 404 && r.data?.code === "NOT_FOUND", `unknown slug -> ${r.status}`);
  r = await call("POST", `/game/gate/${slug(cpById("1.2"))}/submit`, { flag: "x" });
  ok(r.status === 403, `locked: submit on CP 1.2 -> ${r.status}`);
  lastSubmitAt = Date.now();
  log("locked gates: checked (1.2, 3.1, final, unknown slug, submit on locked)");

  const cp11 = cpById("1.1");
  r = await call("POST", `/game/gate/${slug(cp11)}/hint`, { level: 2 });
  ok(r.status === 400 && r.data?.code === "OUT_OF_ORDER", `hint 2 before hint 1 -> ${r.status} ${r.data?.code}`);
  r = await call("GET", `/game/gate/${slug(cp11)}`);
  ok(r.data?.checkpoint?.hints?.every((h) => h.text === null && h.revealed === false), "1.1: hint text hidden before reveal");
  log("hint order: OUT_OF_ORDER before hint 1 confirmed");

  // Hints revealed during the walk (charged once each): both on 1.1, hint 1 on 3.2, hint 1 on final.
  const HINTS_TO_REVEAL = { "1.1": [1, 2], "3.2": [1], final: [1] };
  const revealed = new Set();

  // Answer to submit: an accepted alternate where one exists, else alternate bare / wrapped primary.
  let alternatesTested = 0;
  const answerFor = (cp, i) => {
    const f = flags[cp.id];
    if (f.accept?.length) {
      alternatesTested++;
      return { value: f.accept[0], kind: "alternate (accept[0])" };
    }
    return i % 2 === 0 ? { value: f.primary, kind: "wrapped" } : { value: `  ${unwrap(f.primary)} `, kind: "bare" };
  };

  for (const [i, cp] of CHECKPOINTS.entries()) {
    const label = cp.id === FINAL_BOSS.id ? "final" : `CP ${cp.id}`;
    const isFinal = cp.id === FINAL_BOSS.id;

    if (isFinal) {
      // Defence in depth: remove one of our own relic rows -> the final must refuse, then restore it.
      const [held] = rowsOf(await db.from("team_relics").select("*").eq("team_id", teamId).eq("relic_id", "martian-orb"));
      must(!!held, "final: e2e team holds the Martian Orb before the guard test");
      rowsOf(await db.from("team_relics").delete().eq("team_id", teamId).eq("relic_id", "martian-orb"));
      r = await call("GET", `/game/gate/${slug(cp)}`);
      ok(r.status === 403 && r.data?.final === true, `final guard: 4 relics -> ${r.status} (expected 403)`);
      p = (await call("GET", "/game/progress")).data;
      ok(p.finalBoss.status === "locked" && p.finalBoss.slug === null, "final guard: progress shows final locked with 4 relics");
      rowsOf(await db.from("team_relics").insert(held));
      log("final guard: 403 with 4 relics, restored the 5th");
    }

    r = await call("GET", `/game/gate/${slug(cp)}`);
    must(r.status === 200, `${label}: open gate -> ${r.status}`);
    const d = r.data.checkpoint;
    const src = isFinal ? raw.finalBoss : raw.checkpoints[i];
    ok(d.status === "current", `${label}: status ${d.status}, expected current`);
    ok(d.body === src.body, `${label}: body differs from challenges.json`);
    ok(d.story === src.story, `${label}: story differs from challenges.json`);
    ok(d.reel === null, `${label}: reel sent before solve`);
    ok(d.hints.every((h) => h.text === null), `${label}: hint text sent before reveal`);
    if (cp.id === "2.4") {
      ok(Buffer.from(d.body, "utf8").equals(Buffer.from(src.body, "utf8")), "CP 2.4: body bytes differ from challenges.json");
      log("CP 2.4: body is byte-for-byte identical to challenges.json");
    }

    for (const level of HINTS_TO_REVEAL[cp.id] ?? []) {
      r = await call("POST", `/game/gate/${slug(cp)}/hint`, { level });
      const h = cp.hints.find((x) => x.id === level);
      ok(r.status === 200 && r.data?.hint?.text === h.text, `${label}: hint ${level} reveal -> ${r.status}`);
      if (!revealed.has(`${cp.id}:${level}`)) expect.points -= h.cost;
      revealed.add(`${cp.id}:${level}`);
    }
    if (cp.id === "1.1") {
      r = await call("POST", `/game/gate/${slug(cp)}/hint`, { level: 1 }); // again: must not charge twice
      ok(r.status === 200, "1.1: re-revealing hint 1 -> 200");
      r = await submit(slug(cp), "definitely-not-the-answer");
      ok(r.status === 200 && r.data?.correct === false && r.data?.attemptsLeft === 4, `1.1: wrong answer -> correct:false, attemptsLeft ${r.data?.attemptsLeft}`);
    }

    // The final must be refused before 5.4 is solved (strict order + relic guard).
    if (cp.id === "5.4") {
      r = await call("GET", `/game/gate/${slug(FINAL_BOSS)}`);
      ok(r.status === 403 && r.data?.final === true, `final before 5.4 solved (4 relics) -> ${r.status}`);
    }

    const ans = answerFor(cp, i);
    r = await submit(slug(cp), ans.value);
    must(r.status === 200 && r.data?.correct === true, `${label}: ${ans.kind} answer accepted -> ${r.status} correct=${r.data?.correct}`);
    expect.points += cp.points;
    expect.solved += 1;
    const res = r.data;
    ok(res.pointsAwarded === cp.points, `${label}: pointsAwarded ${res.pointsAwarded}, expected ${cp.points}`);

    const relicExpected = cp.act != null && cp.index === 4;
    if (relicExpected) {
      const want = RELICS.find((x) => x.id === ACTS.find((a) => a.id === cp.act).relicId);
      ok(res.relic?.id === want.id, `${label}: relic ${res.relic?.id}, expected ${want.id}`);
      ok(res.relic?.inscription === want.inscription && res.relic?.lore === want.lore, `${label}: relic inscription/lore missing`);
      expect.relics += 1;
    } else {
      ok(res.relic === null, `${label}: unexpected relic ${res.relic?.id}`);
    }

    const next = CHECKPOINTS[i + 1] ?? null;
    ok((res.next?.slug ?? null) === (next ? slug(next) : null), `${label}: next gate slug mismatch`);
    ok(res.finished === isFinal, `${label}: finished ${res.finished}`);
    if (isFinal) {
      ok(res.ending === FINAL_BOSS.reel.clue, "final: ending text mismatch");
      ok(typeof res.endingTitle === "string" && res.endingTitle.length > 0, "final: endingTitle missing");
    } else {
      ok(res.ending === null && res.endingTitle === null, `${label}: ending sent before the final`);
    }

    r = await call("GET", `/game/reel/${cp.id}`);
    ok(r.status === 200 && r.data?.reel?.clue === cp.reel.clue, `${label}: reel after solve -> ${r.status}`);

    p = (await call("GET", "/game/progress")).data;
    checkProgress(p, label, expect);
    if (cp.id === "5.4") {
      ok(p.finalBoss.status === "current" && p.finalBoss.slug === slug(FINAL_BOSS), "after 5.4: final unlocked with slug");
    }
    log(`${label.padEnd(8)} solved (${ans.kind.padEnd(21)}) +${String(cp.points).padStart(3)}  points=${p.team.points}  relics=${p.relicsCollected}/5${res.relic ? `  relic: ${res.relic.name}` : ""}`);

    if (cp.id === "1.1") {
      r = await submit(slug(cp), flags["1.1"].primary);
      ok(r.status === 409 && r.data?.code === "ALREADY_SOLVED", `1.1: resubmit -> ${r.status} ${r.data?.code}`);
    }
  }

  // ----- after the final -----
  p = (await call("GET", "/game/progress")).data;
  ok(p.finished === true && !!p.finishedAt, "end: finished true with finishedAt");
  ok(p.finalBoss.status === "solved", "end: final status solved");
  ok(p.stats.solved === 21 && p.stats.totalCheckpoints === 21, `end: stats ${p.stats.solved}/${p.stats.totalCheckpoints}`);
  const hintCost = [...revealed].reduce((n, k) => {
    const [id, lvl] = k.split(":");
    return n + cpById(id).hints.find((h) => h.id === Number(lvl)).cost;
  }, 0);
  const totalPts = CHECKPOINTS.reduce((n, c) => n + c.points, 0);
  ok(p.team.points === totalPts - hintCost, `end: points ${p.team.points}, expected ${totalPts} - ${hintCost}`);
  ok(p.stats.hintPointsSpent === hintCost && p.stats.hintsUsed === revealed.size, "end: hint stats");
  const lb = (await call("GET", "/game/leaderboard")).data;
  const me = lb?.rows?.find((x) => x.isYou);
  ok(me?.solved === 21 && me?.points === p.team.points, `end: leaderboard row solved=${me?.solved} points=${me?.points}`);
  ok(alternatesTested >= 3, `alternates tested: ${alternatesTested}`);
  log(`end: finished, ${p.stats.solved}/21 solved, ${p.team.points} pts (= ${totalPts} - ${hintCost} hints), leaderboard rank #${me?.rank}`);
} catch (e) {
  if (!(e instanceof Fatal)) failures.push(`crashed: ${e.message}`);
  log(`STOPPED: ${e.message}`);
} finally {
  server?.close();
  try {
    await deleteE2eTeam();
    if (teamId) {
      const left = await Promise.all(
        ["team_solves", "team_hints", "team_relics", "submissions"].map(async (t) => [t, rowsOf(await db.from(t).select("team_id").eq("team_id", teamId)).length])
      );
      const remaining = left.filter(([, n]) => n > 0);
      ok(remaining.length === 0, `cleanup: rows left behind in ${remaining.map(([t, n]) => `${t}(${n})`).join(", ")}`);
      const [still] = rowsOf(await db.from("teams").select("id").eq("team_code", TEAM_CODE));
      ok(!still, "cleanup: e2e team still exists");
    }
    log("cleanup: e2e team and all its rows deleted");
  } catch (e) {
    failures.push(`cleanup failed: ${e.message}`);
    log(`CLEANUP FAILED: ${e.message}. Delete the team with team_code '${TEAM_CODE}' by hand.`);
  }
  log(`\n${passed} checks passed, ${failures.length} failed, ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const f of failures) log(`  FAIL: ${f}`);
  process.exit(failures.length ? 1 : 0);
}
