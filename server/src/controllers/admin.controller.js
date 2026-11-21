// Admin API (routes/admin.routes.js). Everything here needs the admin cookie.
//   GET  /api/admin/overview                     the clock + one row per team
//   POST /api/admin/event           { action }   start | pause | resume | end | reset   (the clock for every team)
//   POST /api/admin/event/extend    { minutes }  add (or remove) time for every team
//   POST /api/admin/teams/:teamId/time   { minutes }  add (or remove) time for one team
//   POST /api/admin/teams/:teamId/attempts/ignore { cpId }   give one attempt back (reopens a checkpoint at 3/3)
//   POST /api/admin/teams/:teamId/fullscreen/forgive   ignore one full-screen violation (unlocks a locked team)
//   POST /api/admin/fullscreen      { required }       switch full-screen invigilation on or off for everyone
//   POST /api/admin/coins           { coins }          add (or remove) coins for every team
//   POST /api/admin/teams/:teamId/coins  { coins }     add (or remove) coins for one team
import { requireDb } from "../config/supabase.js";
import { CHECKPOINTS } from "../data/game.js";
import {
  coinsSpent,
  coinsSupported,
  coinsView,
  MAX_COIN_CHANGE,
  readCoins,
  resetAdjust,
  START_COINS,
  wouldOverdraw,
} from "../services/coins.js";
import { clockView, DEFAULT_DURATION_MINUTES, EVENT_ROW_ID } from "../services/eventClock.js";
import { clearEventCache } from "../services/eventState.js";
import { fullscreenSupported, FS_MAX_VIOLATIONS, forgivePatch, teamClock } from "../services/fullscreen.js";
import { notifyChange } from "../services/live.js";
import { checkpointById, isLastOfAct, MAX_ATTEMPTS, rankTeams, relicOfAct, TeamState } from "../services/teamState.js";
import { fetchAll } from "../utils/fetchAll.js";
import { HttpError } from "../utils/httpError.js";

const MAX_MINUTES = 180;
// Postgres "undefined column" and PostgREST "column not in schema cache": teams.extra_time_ms is not there yet.
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);
const MIGRATION_HINT = "Per-team time needs a database change first: run supabase/migrations/002_team_extra_time.sql in the Supabase SQL editor.";
const FS_MIGRATION_HINT = "Full-screen invigilation needs a database change first: run supabase/migrations/003_fullscreen.sql in the Supabase SQL editor.";
const COINS_MIGRATION_HINT = "Adding coins needs a database change first: run supabase/migrations/004_coins.sql in the Supabase SQL editor.";
const FS_RESET = { fs_violations: 0, fs_last_violation_at: null, fs_locked_at: null, fs_locked_remaining_ms: null };

const rowsOf = ({ data, error }) => {
  if (error) throw error;
  return data;
};

async function readEvent(db) {
  const [ev] = rowsOf(await db.from("event_state").select("*").eq("id", EVENT_ROW_ID));
  if (ev) return ev;
  const [created] = rowsOf(await db.from("event_state").insert({ id: EVENT_ROW_ID }).select("*"));
  return created;
}

// Every row of the per-team tables, for ALL teams. Paged (utils/fetchAll.js): a plain select stops at 1000 rows.
// "*" on teams: optional columns (extra_time_ms, fs_*, coins_adjust) may not exist before their migrations.
const allTeams = (db) => fetchAll(() => db.from("teams").select("*"), ["id"]);
const allSolves = (db) => fetchAll(() => db.from("team_solves").select("team_id, cp_id, points, solved_at"), ["team_id", "cp_id"]);
const allHints = (db) =>
  fetchAll(() => db.from("team_hints").select("team_id, cp_id, hint_id, cost, revealed_at"), ["team_id", "cp_id", "hint_id"]);
const allRelics = (db) => fetchAll(() => db.from("team_relics").select("team_id, relic_id, earned_at"), ["team_id", "relic_id"]);
const allWrong = (db) =>
  fetchAll(() => db.from("submissions").select("id, team_id, cp_id, submitted, created_at").eq("correct", false), ["id"]);

// rows grouped by team_id, so building one row per team does not scan every table once per team.
function byTeam(rows) {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.team_id)) m.set(r.team_id, []);
    m.get(r.team_id).push(r);
  }
  return m;
}

function readMinutes(body) {
  const minutes = Number(body?.minutes);
  if (!Number.isInteger(minutes) || minutes === 0 || Math.abs(minutes) > MAX_MINUTES) {
    throw new HttpError(400, `Enter a whole number of minutes between -${MAX_MINUTES} and ${MAX_MINUTES} (not 0).`);
  }
  return minutes;
}

// GET /api/admin/leaderboard   Final standings for the winners reveal. Teams never see other teams' scores or ranks.
export async function leaderboard(_req, res) {
  const db = requireDb();
  // Only the fields rankTeams returns leave this function (not password hashes).
  const [ev, teams, solves, hints] = await Promise.all([readEvent(db), allTeams(db), allSolves(db), allHints(db)]);
  res.json({ rows: rankTeams(teams, solves, hints, null, ev).map(({ isYou: _isYou, ...r }) => r) });
}

// GET /api/admin/overview
export async function overview(_req, res) {
  const db = requireDb();
  const [ev, teams, solves, hints, relics, misses] = await Promise.all([
    readEvent(db),
    allTeams(db),
    allSolves(db),
    allHints(db),
    allRelics(db),
    allWrong(db),
  ]);

  const now = Date.now();
  const groups = [solves, hints, relics, misses].map(byTeam);
  const of = (i, teamId) => groups[i].get(teamId) ?? [];
  const ranks = new Map(rankTeams(teams, solves, hints, null, ev).map((r) => [r.teamId, r.rank]));
  const rows = teams
    .map(({ password_hash: _passwordHash, ...t }) => {
      const state = new TeamState(t, of(0, t.id), of(1, t.id), of(2, t.id), of(3, t.id), teamClock(ev, t, now));
      state.event = ev;
      return state.adminRow(ranks.get(t.id));
    })
    .sort((a, b) => a.rank - b.rank);

  res.json({
    event: { ...clockView(ev, 0, now), storedStatus: ev.status },
    extraTimeSupported: teams.length === 0 || "extra_time_ms" in teams[0],
    fullscreen: {
      supported: (teams.length === 0 || fullscreenSupported(teams[0])) && "fullscreen_required" in ev,
      required: ev.fullscreen_required !== false,
      max: FS_MAX_VIOLATIONS,
    },
    coins: {
      supported: teams.length === 0 ? "coins_bonus" in ev : coinsSupported(ev, teams[0]),
      start: START_COINS,
      bonus: Number(ev.coins_bonus || 0),
      max: MAX_COIN_CHANGE,
    },
    checkpoints: CHECKPOINTS.map((cp) => ({ id: cp.id, act: cp.act, index: cp.index, title: cp.title, points: cp.points })),
    teams: rows,
  });
}

// POST /api/admin/event  { action }
// Transitions use the stored status, so a clock that has run out for most teams can still be paused or ended
// while one team is playing on extra time.
export async function eventAction(req, res) {
  const action = String(req.body?.action || "");
  const db = requireDb();
  const ev = await readEvent(db);
  const now = new Date();
  const sincePause = ev.status === "paused" && ev.paused_at ? Math.max(0, now - new Date(ev.paused_at)) : 0;
  const bad = (message) => new HttpError(409, message, { code: "BAD_STATE" });

  let patch;
  if (action === "start") {
    if (ev.status !== "idle" && ev.started_at) throw bad("The clock has already been started. Reset it first to start again.");
    patch = { status: "running", started_at: now.toISOString(), paused_at: null, total_paused_ms: 0 };
  } else if (action === "pause") {
    if (ev.status !== "running") throw bad("Only a running clock can be paused.");
    patch = { status: "paused", paused_at: now.toISOString() };
  } else if (action === "resume") {
    if (ev.status !== "paused") throw bad("The clock is not paused.");
    patch = { status: "running", paused_at: null, total_paused_ms: Number(ev.total_paused_ms || 0) + sincePause };
  } else if (action === "end") {
    if (ev.status !== "running" && ev.status !== "paused") throw bad("The clock is not running.");
    patch = { status: "ended", paused_at: null, total_paused_ms: Number(ev.total_paused_ms || 0) + sincePause };
  } else if (action === "reset") {
    // Back to "not started", with the default duration, no extra time and no full-screen violations or locks for
    // anyone. Team progress is untouched.
    patch = { status: "idle", started_at: null, paused_at: null, total_paused_ms: 0, duration_minutes: DEFAULT_DURATION_MINUTES };
    if ("coins_bonus" in ev) patch.coins_bonus = 0; // coins added by organisers go too (migration 004)
    const { error } = await db.from("teams").update({ extra_time_ms: 0 }).neq("extra_time_ms", 0);
    if (error && !MISSING_COLUMN.has(error.code)) throw error;
    // Added coins go too, but never below what a team has already spent (its coins left stay >= 0).
    const [teams, hints] = await Promise.all([allTeams(db), allHints(db)]);
    const hintsOf = byTeam(hints);
    for (const t of teams) {
      if (!("coins_adjust" in t)) break; // migration 004 not applied: nothing to reset
      const keep = resetAdjust(coinsSpent(hintsOf.get(t.id) ?? []));
      if (Number(t.coins_adjust || 0) !== keep) rowsOf(await db.from("teams").update({ coins_adjust: keep }).eq("id", t.id));
    }
    const fs = await db.from("teams").update(FS_RESET).or("fs_violations.neq.0,fs_locked_at.not.is.null");
    if (fs.error && !MISSING_COLUMN.has(fs.error.code)) throw fs.error;
  } else {
    throw new HttpError(400, "Unknown action. Use start, pause, resume, end or reset.");
  }

  rowsOf(await db.from("event_state").update(patch).eq("id", EVENT_ROW_ID));
  clearEventCache();
  await notifyChange("clock");
  res.json({ event: clockView({ ...ev, ...patch }) });
}

// POST /api/admin/event/extend  { minutes }   Changes the duration for every team (negative shortens it).
export async function extendEvent(req, res) {
  const minutes = readMinutes(req.body);
  const db = requireDb();
  const ev = await readEvent(db);
  const duration_minutes = Math.max(1, (ev.duration_minutes ?? DEFAULT_DURATION_MINUTES) + minutes);
  rowsOf(await db.from("event_state").update({ duration_minutes }).eq("id", EVENT_ROW_ID));
  clearEventCache();
  // A team locked out for leaving full screen has its time frozen; give it the same minutes there, or they would
  // be cancelled out when it is unlocked.
  const locked = await db.from("teams").select("id, fs_locked_remaining_ms").not("fs_locked_at", "is", null);
  if (locked.error && !MISSING_COLUMN.has(locked.error.code)) throw locked.error;
  for (const t of locked.data ?? []) {
    const fs_locked_remaining_ms = Math.max(0, Number(t.fs_locked_remaining_ms || 0) + minutes * 60_000);
    rowsOf(await db.from("teams").update({ fs_locked_remaining_ms }).eq("id", t.id));
  }
  await notifyChange("clock");
  res.json({ event: clockView({ ...ev, duration_minutes }) });
}

// POST /api/admin/teams/:teamId/time  { minutes }   Extra time for one team, on top of the global clock.
export async function addTeamTime(req, res) {
  const minutes = readMinutes(req.body);
  const db = requireDb();
  const [team] = rowsOf(await db.from("teams").select("*").eq("id", req.params.teamId));
  if (!team) throw new HttpError(404, "No such team.");
  if (!("extra_time_ms" in team)) throw new HttpError(409, MIGRATION_HINT, { code: "MIGRATION_NEEDED" });

  // While locked out for leaving full screen the team's time is frozen: change the frozen time instead.
  if (team.fs_locked_at) {
    const fs_locked_remaining_ms = Math.max(0, Number(team.fs_locked_remaining_ms || 0) + minutes * 60_000);
    rowsOf(await db.from("teams").update({ fs_locked_remaining_ms }).eq("id", team.id));
    await notifyChange("clock", team.id);
    return res.json({ teamId: team.id, extraTimeMs: Number(team.extra_time_ms || 0), frozenRemainingMs: fs_locked_remaining_ms });
  }
  const extra_time_ms = Number(team.extra_time_ms || 0) + minutes * 60_000;
  const { error } = await db.from("teams").update({ extra_time_ms }).eq("id", team.id);
  if (error && MISSING_COLUMN.has(error.code)) throw new HttpError(409, MIGRATION_HINT, { code: "MIGRATION_NEEDED" });
  if (error) throw error;
  await notifyChange("clock", team.id);
  res.json({ teamId: team.id, extraTimeMs: extra_time_ms });
}

function coinsOrThrow(body) {
  const coins = readCoins(body);
  if (coins == null) throw new HttpError(400, `Enter a whole number of coins between -${MAX_COIN_CHANGE} and ${MAX_COIN_CHANGE} (not 0).`);
  return coins;
}

// POST /api/admin/coins  { coins }   Adds coins for every team (negative removes). Removing is refused if it would
// leave any team with fewer coins than it has already spent on hints.
export async function addCoinsAll(req, res) {
  const coins = coinsOrThrow(req.body);
  const db = requireDb();
  const ev = await readEvent(db);
  if (!("coins_bonus" in ev)) throw new HttpError(409, COINS_MIGRATION_HINT, { code: "MIGRATION_NEEDED" });
  const coins_bonus = Number(ev.coins_bonus || 0) + coins;
  if (coins < 0) {
    const [teams, hints] = await Promise.all([allTeams(db), allHints(db)]);
    const hintsOf = byTeam(hints);
    const short = teams.filter((t) => wouldOverdraw({ coins_bonus }, t, hintsOf.get(t.id) ?? []));
    if (short.length) {
      throw new HttpError(409, `Can't remove ${-coins} coins: ${short.map((t) => t.name).join(", ")} would have fewer coins than they already spent.`, {
        code: "COINS_ALREADY_SPENT",
      });
    }
  }
  rowsOf(await db.from("event_state").update({ coins_bonus }).eq("id", EVENT_ROW_ID));
  clearEventCache();
  await notifyChange("progress");
  res.json({ bonus: coins_bonus, total: START_COINS + coins_bonus });
}

// POST /api/admin/teams/:teamId/coins  { coins }   Adds coins for one team (negative removes, but never below what
// the team has already spent on hints).
export async function addTeamCoins(req, res) {
  const coins = coinsOrThrow(req.body);
  const db = requireDb();
  const [[team], ev, hints] = await Promise.all([
    db.from("teams").select("*").eq("id", req.params.teamId).then(rowsOf),
    readEvent(db),
    db.from("team_hints").select("cost").eq("team_id", req.params.teamId).then(rowsOf),
  ]);
  if (!team) throw new HttpError(404, "No such team.");
  if (!coinsSupported(ev, team)) throw new HttpError(409, COINS_MIGRATION_HINT, { code: "MIGRATION_NEEDED" });
  const coins_adjust = Number(team.coins_adjust || 0) + coins;
  if (wouldOverdraw(ev, { coins_adjust }, hints)) {
    const now = coinsView(ev, team, hints);
    throw new HttpError(409, `Can't remove ${-coins} coins: ${team.name} has ${now.left} left (it already spent ${coinsSpent(hints)} of ${now.total}).`, {
      code: "COINS_ALREADY_SPENT",
    });
  }
  const after = coinsView(ev, { coins_adjust }, hints);
  rowsOf(await db.from("teams").update({ coins_adjust }).eq("id", team.id));
  await notifyChange("progress", team.id);
  res.json({ teamId: team.id, coins: after });
}

// POST /api/admin/teams/:teamId/attempts/ignore  { cpId }
// Ignores the team's most recent wrong answer on one checkpoint, giving that attempt back (like ignoring a
// full-screen violation). A checkpoint closed at 3/3 opens again at 2/3 with one attempt left; if the team has
// already moved on, it becomes their current gate again and later open gates wait until it is closed.
export async function ignoreAttempt(req, res) {
  const cp = checkpointById(String(req.body?.cpId || ""));
  if (!cp) throw new HttpError(404, "No such checkpoint.");
  const db = requireDb();
  const teamId = req.params.teamId;
  const [team] = rowsOf(await db.from("teams").select("id").eq("id", teamId));
  if (!team) throw new HttpError(404, "No such team.");

  const [solve] = rowsOf(await db.from("team_solves").select("cp_id").eq("team_id", teamId).eq("cp_id", cp.id));
  if (solve) throw new HttpError(409, "That team solved this checkpoint; there is no attempt to give back.", { code: "BAD_STATE" });

  const wrong = rowsOf(
    await db
      .from("submissions")
      .select("id, created_at")
      .eq("team_id", teamId)
      .eq("cp_id", cp.id)
      .eq("correct", false)
      .order("created_at", { ascending: false })
  );
  if (wrong.length === 0) throw new HttpError(409, "That team has no wrong answer on this checkpoint.", { code: "BAD_STATE" });
  rowsOf(await db.from("submissions").delete().eq("id", wrong[0].id));

  const used = Math.min(MAX_ATTEMPTS, wrong.length - 1);
  const reopened = wrong.length >= MAX_ATTEMPTS && wrong.length - 1 < MAX_ATTEMPTS;
  // The act is open again, so its relic goes back until the checkpoint is closed a second time.
  if (reopened && isLastOfAct(cp)) {
    const relic = relicOfAct(cp.act);
    if (relic) rowsOf(await db.from("team_relics").delete().eq("team_id", teamId).eq("relic_id", relic.id));
  }
  await notifyChange("progress", teamId);
  res.json({ ok: true, teamId, cpId: cp.id, used, max: MAX_ATTEMPTS, left: MAX_ATTEMPTS - used, reopened });
}

// POST /api/admin/teams/:teamId/fullscreen/forgive
// Ignores one full-screen violation. A locked team (at the limit) is unlocked and its timer resumes from the time
// it had when it was locked: the minutes spent locked do not count against it.
export async function forgiveViolation(req, res) {
  const db = requireDb();
  const [ev, teamRows] = await Promise.all([readEvent(db), db.from("teams").select("*").eq("id", req.params.teamId).then(rowsOf)]);
  const team = teamRows[0];
  if (!team) throw new HttpError(404, "No such team.");
  if (!fullscreenSupported(team)) throw new HttpError(409, FS_MIGRATION_HINT, { code: "MIGRATION_NEEDED" });

  const patch = forgivePatch(ev, team);
  if (!patch) throw new HttpError(409, "That team has no full-screen violations.", { code: "BAD_STATE" });
  // Only if nothing changed since we read it (a device may have reported another exit meanwhile).
  const updated = rowsOf(
    await db.from("teams").update(patch).eq("id", team.id).eq("fs_violations", Number(team.fs_violations || 0)).select("id")
  );
  if (!updated.length) throw new HttpError(409, "That team's violations just changed. Check the table and try again.", { code: "BAD_STATE" });
  await notifyChange("clock", team.id);
  res.json({ teamId: team.id, violations: patch.fs_violations, unlocked: !!team.fs_locked_at && patch.fs_locked_at === null });
}

// POST /api/admin/fullscreen  { required }   Switches full-screen invigilation on or off for every team.
// Turning it off stops new violations; teams that are already locked stay locked until forgiven.
export async function setFullscreenRule(req, res) {
  if (typeof req.body?.required !== "boolean") throw new HttpError(400, "Send { required: true | false }.");
  const db = requireDb();
  const ev = await readEvent(db);
  if (!("fullscreen_required" in ev)) throw new HttpError(409, FS_MIGRATION_HINT, { code: "MIGRATION_NEEDED" });
  rowsOf(await db.from("event_state").update({ fullscreen_required: req.body.required }).eq("id", EVENT_ROW_ID));
  clearEventCache();
  await notifyChange("clock");
  res.json({ required: req.body.required });
}
