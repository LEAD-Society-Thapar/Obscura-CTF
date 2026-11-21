// Load test: bot teams play a whole (shortened) event against a running API while the admin dashboard is open.
//
//   1. start an API:   (server/)  NODE_ENV=production PORT=5055 node --env-file-if-exists=../.env src/index.js
//   2. run:            npm run loadtest -- --base http://localhost:5055 --teams 500 --devices 3 --minutes 10
//
// What happens:
//   - refuses to run unless the event clock is idle; saves the event_state row to put it back afterwards;
//   - creates LOADBOT-0001.. teams (one shared password) and logs every device in (ramped);
//   - everyone waits on the "not started" screen, polling like the real client (GameDataContext.jsx);
//   - the admin shortens the clock to --minutes and starts it; every team plays every gate in order: opens the gate,
//     sometimes buys hints, sometimes answers wrong (sometimes 3 times = missed), answers right, opens its Reel Card
//     and relics; team-mates poll the clock, refresh the map and react to Realtime "changed" messages exactly like
//     the client (random 0-500 ms delay); the admin dashboard (5 s) and leaderboard (10 s) refresh throughout;
//   - mid-run the admin pauses + resumes, adds coins for everyone, adds time for one team, gives an attempt back,
//     forgives a full-screen violation and extends the clock;
//   - afterwards every bot's points / coins / solves are checked on its own progress page, the admin overview, the
//     leaderboard and in the database against what the bot itself did;
//   - the bots are deleted (their rows cascade) and event_state is restored exactly. Real teams are never touched.
//
// Flags: --teams N  --devices N (per team, the first one plays) or --screens N (in total, spread over the teams)
//        --minutes N (event length)  --wait S (idle phase)  --login-ramp S  --keep (leave the bots in the DB)
//        --cleanup-only (delete bots, restore the clock saved in private/loadtest-event-state.json)
//
// CAUTION: this runs against the project's real Supabase database. 500 teams x 3 screens with the old code
// overloaded the database for ~10 minutes. Stay near the real event size (48 teams, ~70 screens).
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";
import { requireDb } from "../src/config/supabase.js";
import { CHECKPOINTS, FINAL_BOSS } from "../src/data/game.js";
import { START_COINS } from "../src/services/coins.js";
import * as live from "../src/services/live.js";
import { hashPassword } from "../src/utils/password.js";

const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : def;
};
const BASE = String(arg("base", "http://localhost:5055")).replace(/\/+$/, "");
const TEAMS = Number(arg("teams", 500));
const DEVICES = Math.max(1, Number(arg("devices", 3)));
// --screens N: N devices in total, spread over the teams (some teams get one more), instead of --devices each.
const SCREENS = arg("screens", null) == null ? null : Number(arg("screens"));
const devicesOf = (i) => (SCREENS == null ? DEVICES : Math.max(1, Math.floor(SCREENS / TEAMS) + (i < SCREENS % TEAMS ? 1 : 0)));
const MINUTES = Number(arg("minutes", 10));
const WAIT_S = Number(arg("wait", 45));
const LOGIN_RAMP_S = Number(arg("login-ramp", 30));
const KEEP = argv.includes("--keep");
const CLEANUP_ONLY = argv.includes("--cleanup-only");
const PREFIX = "LOADBOT-";
const PASSWORD = "loadtest-bot-pass";
const COIN_BONUS = 10;

const FLAGS = JSON.parse(readFileSync(new URL("../private/flags.local.json", import.meta.url), "utf8"));
const db = requireDb();
const rowsOf = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const rand = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const T0 = performance.now();
const since = () => ((performance.now() - T0) / 1000).toFixed(0).padStart(4) + "s";
const log = (...a) => console.log(`[${since()}]`, ...a);

// ---------------------------------------------------------------- metrics
let phase = "setup";
let stopping = false; // every bot loop ends when this is set
const stats = new Map(); // `${phase}|${label}` -> { lat: [], codes: Map, bytes }
const problems = new Map(); // key -> { n, sample }
function record(label, ms, status, bytes = 0) {
  const key = `${phase}|${label}`;
  if (!stats.has(key)) stats.set(key, { lat: [], codes: new Map(), bytes: 0 });
  const s = stats.get(key);
  s.lat.push(ms);
  s.codes.set(status, (s.codes.get(status) ?? 0) + 1);
  s.bytes += bytes;
}
function problem(what, res, extra = "") {
  const key = `${what} -> ${res.status}${res.data?.code ? ` ${res.data.code}` : ""}`;
  const p = problems.get(key) ?? { n: 0, sample: "" };
  p.n += 1;
  p.sample ||= `${res.data?.error ?? ""} ${extra}`.trim().slice(0, 160);
  problems.set(key, p);
}
const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

// ---------------------------------------------------------------- HTTP
const labelOf = (method, path) =>
  `${method} ${path.replace(/\/gate\/[^/]+/, "/gate/:slug").replace(/\/reel\/[^/]+/, "/reel/:id").replace(/\/teams\/[^/]+/, "/teams/:id")}`;

async function call(dev, method, path, body) {
  const t = performance.now();
  let status;
  let data = null;
  let bytes = 0;
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...(dev?.cookie ? { cookie: dev.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    status = res.status;
    const text = await res.text();
    bytes = text.length;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    const set = res.headers.getSetCookie?.() ?? [];
    if (dev && set.length) dev.cookie = set.map((c) => c.split(";")[0]).join("; ");
  } catch (e) {
    status = e.name === "TimeoutError" ? "timeout" : "neterr";
    data = { error: e.message };
  }
  record(labelOf(method, path), performance.now() - t, status, bytes);
  const bad = status === "timeout" || status === "neterr" || (typeof status === "number" && status >= 500);
  if (bad) problem(labelOf(method, path), { status, data });
  recent.push([Date.now(), bad]);
  return { status, data };
}

// Safety stop: if the system is clearly falling over, stop loading it (and clean up) instead of making it worse.
// The database is the project's real one.
const recent = []; // [ms, bad]
const ABORT_WINDOW_MS = 30_000;
const ABORT_BAD_SHARE = 0.25;
let aborted = null;
setInterval(() => {
  const from = Date.now() - ABORT_WINDOW_MS;
  while (recent.length && recent[0][0] < from) recent.shift();
  const bad = recent.filter(([, b]) => b).length;
  if (!aborted && recent.length >= 200 && bad / recent.length > ABORT_BAD_SHARE) {
    aborted = `${bad}/${recent.length} requests failed in the last 30 s`;
    log(`ABORTING: the system is overloaded (${aborted}). Stopping the bots and cleaning up.`);
    stopping = true;
  }
}, 5000).unref();

// ---------------------------------------------------------------- DB helpers
async function fetchAll(build) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const page = rowsOf(await build().range(from, from + 999));
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

async function cleanup(snapshot) {
  log("cleanup: deleting bot teams (their solves, hints, relics, submissions cascade)...");
  let gone = 0;
  for (;;) {
    const batch = rowsOf(await db.from("teams").select("id").like("team_code", `${PREFIX}%`).limit(200));
    if (!batch.length) break;
    rowsOf(await db.from("teams").delete().in("id", batch.map((b) => b.id)));
    gone += batch.length;
  }
  log(`cleanup: ${gone} bot teams deleted`);
  if (snapshot) {
    const { id: _id, ...rest } = snapshot;
    rowsOf(await db.from("event_state").update(rest).eq("id", snapshot.id));
    await live.notifyChange("clock");
    log("cleanup: event_state restored to", JSON.stringify(snapshot));
  }
}

// The event_state row from before the run, kept on disk so a killed run can still be undone with --cleanup-only.
const SNAPSHOT_FILE = new URL("../private/loadtest-event-state.json", import.meta.url);
if (CLEANUP_ONLY) {
  const saved = existsSync(SNAPSHOT_FILE) ? JSON.parse(readFileSync(SNAPSHOT_FILE, "utf8")) : null;
  if (!saved) log("no saved event_state (private/loadtest-event-state.json): only deleting bot teams");
  await cleanup(saved);
  if (saved) rmSync(SNAPSHOT_FILE);
  process.exit(0);
}

// ---------------------------------------------------------------- setup
if (existsSync(SNAPSHOT_FILE)) {
  console.error("A previous load test was not cleaned up. Run: npm run loadtest -- --cleanup-only");
  process.exit(1);
}
const [snapshot] = rowsOf(await db.from("event_state").select("*").eq("id", 1));
if (!snapshot) throw new Error("No event_state row.");
if (snapshot.status !== "idle") {
  console.error(`The event clock is "${snapshot.status}". This test only runs while it is idle (not during an event).`);
  process.exit(1);
}
const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch((e) => ({ error: e.message }));
if (!health.ok) {
  console.error(`No API at ${BASE}: ${health.error ?? JSON.stringify(health)}`);
  process.exit(1);
}
const screenCount = Array.from({ length: TEAMS }, (_, i) => devicesOf(i)).reduce((a, b) => a + b, 0);
log(`API ${BASE} (${health.env}). ${TEAMS} teams, ${screenCount} screens, ${MINUTES}-minute event.`);
mkdirSync(new URL("../private/", import.meta.url), { recursive: true });
writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot));
log("saved event_state:", JSON.stringify(snapshot));

let cleaned = false;
const finish = async (code) => {
  if (!cleaned && !KEEP) {
    cleaned = true;
    try {
      await cleanup(snapshot);
      rmSync(SNAPSHOT_FILE);
    } catch (e) {
      console.error("CLEANUP FAILED:", e.message?.slice(0, 200), "- run: npm run loadtest -- --cleanup-only");
    }
  }
  process.exit(code);
};
process.on("SIGINT", () => {
  log("interrupted");
  finish(130);
});

const hash = hashPassword(PASSWORD);
const codes = Array.from({ length: TEAMS }, (_, i) => `${PREFIX}${String(i + 1).padStart(4, "0")}`);
for (let i = 0; i < codes.length; i += 100) {
  rowsOf(
    await db.from("teams").upsert(
      codes.slice(i, i + 100).map((c) => ({ name: c, team_code: c, password_hash: hash })),
      { onConflict: "team_code" }
    )
  );
}
const idOf = new Map((await fetchAll(() => db.from("teams").select("id, team_code").like("team_code", `${PREFIX}%`).order("team_code"))).map((t) => [t.team_code, t.id]));
log(`created ${idOf.size} bot teams`);

const teams = codes.map((code, i) => ({
  i,
  code,
  id: idOf.get(code),
  speed: rand(0.6, 1.5), // > 1 = slower team
  devices: Array.from({ length: devicesOf(i) }, (_, d) => ({ d, cookie: null, clock: null, progress: null })),
  solved: new Map(), // cpId -> points (what the bot saw the server award)
  missed: new Set(),
  hintCost: 0,
  lastSubmit: 0,
  wrongOn: new Map(),
  violation: false,
  extraMinutes: 0,
  done: false,
  ended: false,
}));
const byId = new Map(teams.map((t) => [t.id, t]));

// ---------------------------------------------------------------- client behaviour (mirrors client/src/context/GameDataContext.jsx)

async function refreshEvent(dev) {
  const r = await call(dev, "GET", "/game/state");
  if (r.status === 200) dev.clock = { ...r.data, at: Date.now() };
  else problem("GET /game/state", r);
}
async function refresh(dev) {
  const [p, e] = await Promise.all([call(dev, "GET", "/game/progress"), call(dev, "GET", "/game/state")]);
  dev.progressOk = p.status === 200;
  if (p.status === 200) dev.progress = p.data;
  else problem("GET /game/progress", p);
  if (e.status === 200) dev.clock = { ...e.data, at: Date.now() };
  else problem("GET /game/state", e);
}

// One screen: clock poll (5 s while waiting, 20 s while running), the local countdown hitting zero, and (for
// team-mates) looking at the map / current gate now and then.
async function screen(team, dev, isDriver) {
  let nextPoll = Date.now() + rand(0, 5000);
  let nextLook = Date.now() + rand(15_000, 60_000);
  let deadlineFired = null;
  while (!stopping) {
    await sleep(250);
    const now = Date.now();
    const c = dev.clock;
    const waiting = !c || c.status === "idle" || c.fullscreen?.locked;
    if (now >= nextPoll) {
      nextPoll = now + (waiting ? 5_000 : 20_000);
      await refreshEvent(dev);
    }
    // GameDataContext: when the countdown reaches 0, ask the server again (+400 ms).
    if (c?.status === "running") {
      const deadline = c.at + c.remainingMs + 400;
      if (now >= deadline && deadlineFired !== deadline) {
        deadlineFired = deadline;
        await refreshEvent(dev);
      }
    }
    if (!isDriver && c?.status && c.status !== "idle" && now >= nextLook) {
      nextLook = now + rand(25_000, 70_000);
      await refresh(dev); // tab focus / map
      const cur = currentOf(dev.progress);
      if (cur && chance(0.5)) {
        const r = await call(dev, "GET", `/game/gate/${cur.slug}`);
        if (r.status !== 200 && !["EVENT_NOT_STARTED", "FULLSCREEN_LOCKED"].includes(r.data?.code)) problem("teammate GET gate", r);
      }
    }
  }
}

const currentOf = (p) => (p ? [...p.acts.flatMap((a) => a.checkpoints), p.finalBoss].find((c) => c.status === "current") ?? null : null);

// ---------------------------------------------------------------- the team playing
async function submit(team, cp, flag) {
  const d = team.devices[0];
  for (let tries = 0; tries < 40 && !stopping; tries++) {
    const deliberateTooFast = team.lastSubmit && chance(0.03);
    if (!deliberateTooFast) await sleep(team.lastSubmit + 10_600 - Date.now());
    const r = await call(d, "POST", `/game/gate/${cp.slug}/submit`, { flag });
    team.lastSubmit = Date.now();
    if (r.status === 200) return r.data;
    const code = r.data?.code;
    if (code === "TOO_FAST") {
      if (!deliberateTooFast) problem("submit (unplanned TOO_FAST)", r);
      team.lastSubmit = Date.now() - 10_600 + (r.data.retryAfter ?? 10) * 1000;
      continue;
    }
    if (code === "EVENT_PAUSED") {
      team.lastSubmit = 0;
      await sleep(rand(2000, 4000));
      continue;
    }
    if (code === "EVENT_ENDED") {
      team.ended = true;
      return null;
    }
    if (code === "FULLSCREEN_LOCKED") {
      await sleep(5000);
      continue;
    }
    // The page is out of date (e.g. an organiser reopened an earlier checkpoint, which seals the later gates
    // again): the client reloads (FlagForm.jsx STALE codes), so does the bot.
    if (["LOCKED", "ALREADY_SOLVED", "ALREADY_ATTEMPTED"].includes(code)) return null;
    if (typeof r.status === "number" && r.status < 500) problem("submit", r, `team ${team.code} cp ${cp.id}`);
    await sleep(rand(1000, 3000)); // 5xx / timeout: a person would try again
    team.lastSubmit = 0;
  }
  return null;
}

async function useHint(team, cp, level) {
  const d = team.devices[0];
  const r = await call(d, "POST", `/game/gate/${cp.slug}/hint`, { level });
  if (r.status === 200) {
    const already = d.lastGate?.hints?.find((h) => h.id === level)?.revealed;
    if (!already) team.hintCost += r.data.hint.cost;
    return true;
  }
  if (!["NOT_ENOUGH_COINS", "EVENT_PAUSED", "EVENT_ENDED", "LOCKED", "NOT_ACTIVE"].includes(r.data?.code)) {
    problem("hint", r, `team ${team.code} cp ${cp.id} L${level}`);
  }
  return false;
}

async function play(team) {
  const d = team.devices[0];
  const budgetS = ((MINUTES * 60 * 0.8) / CHECKPOINTS.length - 6) * team.speed;
  await sleep(rand(500, 5000)); // reading the start screen
  await refresh(d);
  let stuck = 0;
  while (!stopping && !team.ended) {
    // The map could not be loaded (server error / timeout): keep trying like a person would, until the hunt ends.
    if (!d.progressOk) {
      if (d.clock?.status === "ended" || Date.now() > (globalThis.huntOverAt ?? Infinity)) break;
      await sleep(rand(2000, 4000));
      await refresh(d);
      continue;
    }
    const cur = currentOf(d.progress);
    if (!cur) {
      const f = d.progress?.finalBoss?.status;
      if (f === "solved" || f === "failed") break;
      if (++stuck > 5) {
        problem("no current gate", { status: "logic" }, `team ${team.code} final=${f}`);
        break;
      }
      await sleep(3000);
      await refresh(d);
      continue;
    }
    stuck = 0;
    const g = await call(d, "GET", `/game/gate/${cur.slug}`);
    if (g.status !== 200) {
      if (g.data?.code === "EVENT_ENDED") break;
      if (g.data?.code !== "FULLSCREEN_LOCKED") problem("GET gate", g, `team ${team.code} cp ${cur.id}`);
      await sleep(3000);
      await refresh(d);
      continue;
    }
    d.lastGate = g.data.checkpoint;
    const cp = { ...cur, attempts: g.data.checkpoint.attempts };
    await sleep(rand(0.3, 1) * budgetS * 1000 * 0.5);

    if (chance(0.25) && (await useHint(team, cp, 1))) {
      await refresh(d);
      if (chance(0.3) && (await useHint(team, cp, 2))) await refresh(d);
    }
    // A full-screen slip by some teams, once.
    if (!team.violation && chance(0.006)) {
      team.violation = true;
      const v = await call(d, "POST", "/game/fullscreen/violation");
      if (v.status !== 200) problem("fullscreen violation", v);
    }
    await sleep(rand(0.3, 1) * budgetS * 1000 * 0.5);

    const roll = Math.random();
    let wrongs = roll < 0.6 ? 0 : roll < 0.84 ? 1 : roll < 0.95 ? 2 : 3;
    wrongs = Math.min(wrongs, 3 - (cp.attempts?.used ?? 0));
    let result = null;
    for (let w = 0; w < wrongs && !team.ended; w++) {
      result = await submit(team, cp, `wrong-${Math.random().toString(36).slice(2, 8)}`);
      if (!result) break;
      if (result.correct) problem("wrong answer accepted", { status: "logic" }, cp.id);
      team.wrongOn.set(cp.id, (team.wrongOn.get(cp.id) ?? 0) + 1);
      if (result.missed) break;
      await refresh(d); // the client refreshes after every answer
    }
    if (!team.ended && !result?.missed) {
      result = await submit(team, cp, FLAGS[cp.id].primary);
      if (result && !result.correct) problem("correct answer rejected", { status: "logic", data: result }, `cp ${cp.id}`);
    }
    if (!result) {
      if (team.ended) break;
      await refresh(d);
      continue;
    }
    if (result.correct) team.solved.set(cp.id, result.pointsAwarded);
    if (result.missed) team.missed.add(cp.id);
    await refresh(d);
    if (result.reel) {
      const r = await call(d, "GET", `/game/reel/${cp.id}`);
      if (r.status !== 200) problem("GET reel", r, `cp ${cp.id}`);
    }
    if (result.relic) {
      const r = await call(d, "GET", "/game/inventory");
      if (r.status !== 200) problem("GET inventory", r);
    }
    if (cp.id === FINAL_BOSS.id) break;
  }
  team.done = true;
}

// ---------------------------------------------------------------- Realtime: one listener, fanned out to every bot screen
// The real client opens one connection per screen; one connection here produces the same API load (every screen of
// the addressed team(s) refetches after 0-500 ms) without spending the project's Realtime quota on 1500 sockets.
const rtClients = [];
async function listen() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    log("Realtime: no VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY, screens rely on polling only");
    return;
  }
  // Same waits as the client (GameDataContext.jsx). Older clients refetched after 0-500 ms whatever the message.
  const perTeam = !!live.teamTopic;
  const wait = (kind, teamId) =>
    !perTeam ? Math.random() * 500 : teamId ? Math.random() * 300 : 1200 + Math.random() * (kind === "progress" ? 6000 : 2000);
  const onMsg = (msg) => {
    const { kind, teamId } = msg?.payload ?? {};
    const targets = teamId ? [byId.get(teamId)].filter(Boolean) : teams;
    for (const t of targets)
      for (const dev of t.devices) setTimeout(() => (kind === "progress" ? refresh(dev) : refreshEvent(dev)), wait(kind, teamId));
    // The admin dashboard reloads on messages it hears (AdminDashboard.jsx): all of them on the old shared topic,
    // only the every-team ones with per-team topics.
    if (admin.cookie && (!perTeam || !teamId)) call(admin, "GET", "/admin/overview");
  };
  const topics = [live.LIVE_TOPIC, ...(live.teamTopic ? teams.map((t) => live.teamTopic(t.id)) : [])];
  const PER_SOCKET = 90;
  const joins = [];
  for (let i = 0; i < topics.length; i += PER_SOCKET) {
    const c = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    rtClients.push(c);
    for (const topic of topics.slice(i, i + PER_SOCKET)) {
      joins.push(
        new Promise((resolve) => {
          c.channel(topic)
            .on("broadcast", { event: live.LIVE_EVENT }, onMsg)
            .subscribe((s) => (s === "SUBSCRIBED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT") && resolve(s));
        })
      );
    }
  }
  const results = await Promise.race([Promise.all(joins), sleep(30_000).then(() => null)]);
  const ok = results ? results.filter((s) => s === "SUBSCRIBED").length : "some";
  log(`Realtime: ${ok}/${topics.length} topic(s) subscribed${live.teamTopic ? " (global + one per team)" : " (global)"}`);
}

// ---------------------------------------------------------------- admin
const admin = { cookie: null };
let paused = false;
async function adminAct(what, method, path, body) {
  const r = await call(admin, method, path, body);
  log(`admin: ${what} -> ${r.status}${r.data?.error ? ` ${r.data.error}` : ""}`);
  if (r.status !== 200) problem(`admin ${what}`, r);
  return r;
}
async function adminScreens() {
  let nextOverview = 0;
  let nextBoard = 0;
  while (!stopping) {
    const now = Date.now();
    if (now >= nextOverview) {
      nextOverview = now + 5000;
      const r = await call(admin, "GET", "/admin/overview");
      if (r.status === 200) admin.lastOverview = r.data;
    }
    if (now >= nextBoard) {
      nextBoard = now + 10_000;
      await call(admin, "GET", "/admin/leaderboard");
    }
    await sleep(250);
  }
}

// Health pings (no DB): how long the API takes to answer anything = event-loop blocking.
async function healthPings() {
  while (!stopping) {
    await call(null, "GET", "/health");
    await sleep(500);
  }
}

// ---------------------------------------------------------------- run
try {
  phase = "login";
  log(`logging in ${screenCount} screens over ${LOGIN_RAMP_S}s...`);
  const pings = healthPings();
  const all = teams.flatMap((t) => t.devices.map((dev) => ({ t, dev })));
  await Promise.all(
    all.map(async ({ t, dev }, k) => {
      await sleep((k / all.length) * LOGIN_RAMP_S * 1000);
      for (let tries = 0; tries < 5; tries++) {
        const r = await call(dev, "POST", "/auth/login", { teamCode: t.code, password: PASSWORD });
        if (r.status === 200) {
          await call(dev, "GET", "/auth/me");
          return refresh(dev);
        }
        problem("login", r);
        await sleep(2000);
      }
    })
  );
  const loggedIn = all.filter(({ dev }) => dev.cookie).length;
  log(`logged in: ${loggedIn}/${all.length}`);
  {
    const r = await call(admin, "POST", "/admin/login", { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD });
    if (r.status !== 200) throw new Error(`admin login failed: ${r.status} ${r.data?.error}`);
  }
  await listen();

  const checkAbort = () => {
    if (aborted) throw new Error(`aborted: ${aborted}`);
  };
  checkAbort();

  phase = "idle";
  log(`everyone waits on the start screen for ${WAIT_S}s (5 s clock polls)...`);
  const screens = teams.flatMap((t) => t.devices.map((dev) => screen(t, dev, dev.d === 0)));
  const dash = adminScreens();
  await sleep(WAIT_S * 1000);
  checkAbort();

  // Event length: --minutes instead of 60.
  const dur = snapshot.duration_minutes ?? 60;
  if (MINUTES !== dur) await adminAct(`clock length ${dur} -> ${MINUTES} min`, "POST", "/admin/event/extend", { minutes: MINUTES - dur });

  phase = "herd:start";
  await adminAct("START", "POST", "/admin/event", { action: "start" });
  const startedAt = Date.now();
  const players = teams.map((t) => play(t));
  await sleep(8000);
  phase = "play";

  const R = MINUTES * 60_000;
  const at = (f) => sleep(startedAt + f * R - Date.now());
  const timeline = (async () => {
    await at(0.25);
    phase = "herd:pause";
    paused = true;
    await adminAct("pause", "POST", "/admin/event", { action: "pause" });
    await sleep(20_000);
    phase = "herd:resume";
    await adminAct("resume", "POST", "/admin/event", { action: "resume" });
    paused = false;
    await sleep(8000);
    phase = "play";

    await at(0.4);
    phase = "herd:coins";
    await adminAct(`+${COIN_BONUS} coins for everyone`, "POST", "/admin/coins", { coins: COIN_BONUS });
    await sleep(8000);
    phase = "play";

    await at(0.5);
    teams[0].extraMinutes += 2;
    await adminAct(`+2 min for ${teams[0].code}`, "POST", `/admin/teams/${teams[0].id}/time`, { minutes: 2 });

    await at(0.55);
    const t = teams.find((x) => [...x.wrongOn].some(([cp, n]) => n > 0 && !x.solved.has(cp)));
    if (t) {
      const cpId = [...t.wrongOn].find(([cp, n]) => n > 0 && !t.solved.has(cp))[0];
      const r = await adminAct(`give ${t.code} one attempt back on ${cpId}`, "POST", `/admin/teams/${t.id}/attempts/ignore`, { cpId });
      if (r.status === 200) {
        t.wrongOn.set(cpId, t.wrongOn.get(cpId) - 1);
        if (r.data.reopened) t.missed.delete(cpId);
      }
    }
    const v = teams.find((x) => x.violation);
    if (v) await adminAct(`forgive ${v.code}'s full-screen violation`, "POST", `/admin/teams/${v.id}/fullscreen/forgive`);

    await at(0.7);
    await adminAct("+1 min for everyone", "POST", "/admin/event/extend", { minutes: 1 });
  })();

  // Until every team is done or the clock (incl. extra time) is over.
  const hardStop = startedAt + R + 4 * 60_000;
  globalThis.huntOverAt = hardStop;
  while (teams.some((t) => !t.done) && Date.now() < hardStop) {
    await sleep(5000);
    checkAbort();
    const done = teams.filter((t) => t.done).length;
    const finished = teams.filter((t) => t.solved.has(FINAL_BOSS.id)).length;
    if (Date.now() % 30_000 < 5000) log(`progress: ${done}/${TEAMS} teams done, ${finished} solved the final`);
  }
  await timeline.catch((e) => log("timeline error", e.message));
  log(`play over: ${teams.filter((t) => t.done).length}/${TEAMS} teams done`);
  await Promise.race([Promise.all(players), sleep(30_000)]);

  // ---------------------------------------------------------------- verification
  phase = "verify";
  await sleep(3000);
  stopping = true;
  await Promise.race([Promise.all([...screens, dash, pings]), sleep(15_000)]);
  for (const c of rtClients) c.removeAllChannels();

  const ov = await call(admin, "GET", "/admin/overview");
  const lb = await call(admin, "GET", "/admin/leaderboard");
  const ovRows = new Map((ov.data?.teams ?? []).map((r) => [r.id, r]));
  const lbRows = new Map((lb.data?.rows ?? []).map((r) => [r.teamId, r]));
  const dbByTeam = new Map();
  for (let i = 0; i < teams.length; i += 100) {
    const ids = teams.slice(i, i + 100).map((t) => t.id);
    const rows = await fetchAll(() => db.from("team_solves").select("team_id, cp_id, points").in("team_id", ids).order("team_id").order("cp_id"));
    for (const s of rows) dbByTeam.set(s.team_id, (dbByTeam.get(s.team_id) ?? 0) + s.points);
  }

  const mismatch = { progress: [], overview: [], leaderboard: [], db: [] };
  await Promise.all(
    teams.map(async (t) => {
      const expPoints = [...t.solved.values()].reduce((a, b) => a + b, 0);
      const expCoins = START_COINS + COIN_BONUS - t.hintCost;
      const p = await call(t.devices[0], "GET", "/game/progress");
      const pp = p.data?.team;
      if (!pp || pp.points !== expPoints || pp.coins.left !== expCoins || p.data.stats.solved !== t.solved.size)
        mismatch.progress.push(`${t.code}: bot ${expPoints}pts/${expCoins}c/${t.solved.size} vs page ${pp?.points}/${pp?.coins?.left}/${p.data?.stats?.solved}`);
      const o = ovRows.get(t.id);
      if (!o || o.points !== expPoints || o.coins.left !== expCoins || o.solved !== t.solved.size)
        mismatch.overview.push(`${t.code}: bot ${expPoints}pts/${expCoins}c/${t.solved.size} vs overview ${o?.points}/${o?.coins?.left}/${o?.solved}`);
      const l = lbRows.get(t.id);
      if (!l || l.points !== expPoints || l.coinsLeft !== expCoins || l.solved !== t.solved.size)
        mismatch.leaderboard.push(`${t.code}: bot ${expPoints}pts/${expCoins}c/${t.solved.size} vs leaderboard ${l?.points}/${l?.coinsLeft}/${l?.solved}`);
      if ((dbByTeam.get(t.id) ?? 0) !== expPoints) mismatch.db.push(`${t.code}: bot ${expPoints} vs db ${dbByTeam.get(t.id) ?? 0}`);
    })
  );
  const ranked = lb.data?.rows ?? [];
  const sortedOk = ranked.every((r, i) => i === 0 || ranked[i - 1].points >= r.points);

  // ---------------------------------------------------------------- report
  printLatency();
  const allLat = [...stats.values()];
  const total = allLat.reduce((n, s) => n + s.lat.length, 0);
  const fails = allLat.reduce((n, s) => n + [...s.codes].filter(([c]) => c === "timeout" || c === "neterr" || c >= 500).reduce((a, [, k]) => a + k, 0), 0);
  const ovBytes = [...stats].filter(([k]) => k.endsWith("GET /admin/overview")).map(([, s]) => s.bytes / s.lat.length)[0];
  console.log(`\nrequests: ${total} in ${since()} | server errors / timeouts: ${fails} | admin overview ~${Math.round((ovBytes || 0) / 1024)} KB`);
  console.log(`teams done ${teams.filter((t) => t.done).length}/${TEAMS}, solved the final ${teams.filter((t) => t.solved.has(FINAL_BOSS.id)).length}, missed >=1 checkpoint ${teams.filter((t) => t.missed.size).length}, bought hints ${teams.filter((t) => t.hintCost).length}`);
  console.log("\n================ PROBLEMS ================");
  if (!problems.size) console.log("none");
  for (const [k, p] of problems) console.log(`${String(p.n).padStart(5)} x ${k}   ${p.sample}`);
  console.log("\n================ SCORE CHECKS (bot's own record vs the system) ================");
  for (const [where, list] of Object.entries(mismatch)) {
    console.log(`${where.padEnd(12)} ${list.length ? `${list.length} WRONG, e.g. ${list.slice(0, 3).join(" | ")}` : `all ${TEAMS} correct`}`);
  }
  console.log(`leaderboard rows: ${ranked.length} (bots ${ranked.filter((r) => byId.has(r.teamId)).length}), sorted by points: ${sortedOk}`);
  console.log(`overview rows:    ${ov.data?.teams?.length ?? "n/a"}`);
  await finish(0);
} catch (e) {
  console.error(aborted ? `LOAD TEST ABORTED: ${aborted}` : "LOAD TEST CRASHED:", aborted ? "" : e);
  stopping = true;
  printLatency();
  for (const [k, p] of problems) console.log(`${String(p.n).padStart(5)} x ${k}   ${p.sample}`);
  await finish(1);
}

function printLatency() {
  const phases = [...new Set([...stats.keys()].map((k) => k.split("|")[0]))];
  console.log("\n================ LATENCY (ms) by phase and endpoint ================");
  console.log("phase        endpoint                                   n      p50    p95    p99    max   non-2xx");
  for (const ph of phases) {
    for (const [key, s] of [...stats].filter(([k]) => k.startsWith(`${ph}|`)).sort((a, b) => b[1].lat.length - a[1].lat.length)) {
      const label = key.split("|")[1];
      const bad = [...s.codes].filter(([c]) => !(typeof c === "number" && c < 300)).map(([c, n]) => `${c}x${n}`).join(" ");
      const f = (x) => String(Math.round(x)).padStart(6);
      console.log(
        `${ph.padEnd(12)} ${label.padEnd(40)} ${String(s.lat.length).padStart(6)} ${f(pct(s.lat, 50))} ${f(pct(s.lat, 95))} ${f(pct(s.lat, 99))} ${f(Math.max(...s.lat))}   ${bad}`
      );
    }
  }
}
