// Admin API (routes/admin.routes.js). Everything here needs the admin cookie.
//   GET  /api/admin/overview                     the clock + one row per team
//   POST /api/admin/event           { action }   start | pause | resume | end | reset   (the clock for every team)
//   POST /api/admin/event/extend    { minutes }  add (or remove) time for every team
//   POST /api/admin/teams/:teamId/time   { minutes }  add (or remove) time for one team
//   POST /api/admin/teams/:teamId/reopen { cpId }     let a team answer a missed checkpoint again
//   POST /api/admin/teams/:teamId/fullscreen/forgive   ignore one full-screen violation (unlocks a locked team)
//   POST /api/admin/fullscreen      { required }       switch full-screen invigilation on or off for everyone
import { requireDb } from "../config/supabase.js";
import { CHECKPOINTS } from "../data/game.js";
import { clockView, DEFAULT_DURATION_MINUTES, EVENT_ROW_ID } from "../services/eventClock.js";
import { fullscreenSupported, FS_MAX_VIOLATIONS, forgivePatch, teamClock } from "../services/fullscreen.js";
import { notifyChange } from "../services/live.js";
import { checkpointById, isLastOfAct, rankTeams, relicOfAct, TeamState } from "../services/teamState.js";
import { HttpError } from "../utils/httpError.js";

const MAX_MINUTES = 180;
// Postgres "undefined column" and PostgREST "column not in schema cache": teams.extra_time_ms is not there yet.
const MISSING_COLUMN = new Set(["42703", "PGRST204"]);
const MIGRATION_HINT = "Per-team time needs a database change first: run supabase/migrations/002_team_extra_time.sql in the Supabase SQL editor.";
const FS_MIGRATION_HINT = "Full-screen invigilation needs a database change first: run supabase/migrations/003_fullscreen.sql in the Supabase SQL editor.";
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
  const [teams, solves, hints] = await Promise.all([
    db.from("teams").select("id, name, points_adjust"),
    db.from("team_solves").select("team_id, points, solved_at"),
    db.from("team_hints").select("team_id, cost"),
  ]).then((results) => results.map(rowsOf));
  res.json({ rows: rankTeams(teams, solves, hints).map(({ isYou: _isYou, ...r }) => r) });
}

// GET /api/admin/overview
export async function overview(_req, res) {
  const db = requireDb();
  const [ev, teams, solves, hints, relics, misses] = await Promise.all([
    readEvent(db),
    db.from("teams").select("*").then(rowsOf), // "*": extra_time_ms may not exist before migration 002
    db.from("team_solves").select("team_id, cp_id, points, solved_at").then(rowsOf),
    db.from("team_hints").select("team_id, cp_id, hint_id, cost, revealed_at").then(rowsOf),
    db.from("team_relics").select("team_id, relic_id, earned_at").then(rowsOf),
    db.from("submissions").select("team_id, cp_id, submitted, created_at").eq("correct", false).then(rowsOf),
  ]);

  const now = Date.now();
  const of = (rows, teamId) => rows.filter((r) => r.team_id === teamId);
  const ranks = new Map(rankTeams(teams, solves, hints).map((r) => [r.teamId, r.rank]));
  const rows = teams
    .map(({ password_hash: _passwordHash, ...t }) => {
      const state = new TeamState(t, of(solves, t.id), of(hints, t.id), of(relics, t.id), of(misses, t.id), teamClock(ev, t, now));
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
    const { error } = await db.from("teams").update({ extra_time_ms: 0 }).neq("extra_time_ms", 0);
    if (error && !MISSING_COLUMN.has(error.code)) throw error;
    const fs = await db.from("teams").update(FS_RESET).or("fs_violations.neq.0,fs_locked_at.not.is.null");
    if (fs.error && !MISSING_COLUMN.has(fs.error.code)) throw fs.error;
  } else {
    throw new HttpError(400, "Unknown action. Use start, pause, resume, end or reset.");
  }

  rowsOf(await db.from("event_state").update(patch).eq("id", EVENT_ROW_ID));
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

// POST /api/admin/teams/:teamId/reopen  { cpId }
// Clears the team's wrong attempt on one checkpoint so it becomes answerable again. If the team has already moved
// on, that checkpoint becomes their current gate again and later open gates wait until it is closed.
export async function reopenCheckpoint(req, res) {
  const cp = checkpointById(String(req.body?.cpId || ""));
  if (!cp) throw new HttpError(404, "No such checkpoint.");
  const db = requireDb();
  const teamId = req.params.teamId;
  const [team] = rowsOf(await db.from("teams").select("id").eq("id", teamId));
  if (!team) throw new HttpError(404, "No such team.");

  const [solve] = rowsOf(await db.from("team_solves").select("cp_id").eq("team_id", teamId).eq("cp_id", cp.id));
  if (solve) throw new HttpError(409, "That team solved this checkpoint; there is nothing to reopen.", { code: "BAD_STATE" });

  const removed = rowsOf(
    await db.from("submissions").delete().eq("team_id", teamId).eq("cp_id", cp.id).eq("correct", false).select("id")
  );
  if (removed.length === 0) throw new HttpError(409, "That team has no missed attempt on this checkpoint.", { code: "BAD_STATE" });

  // The act is open again, so its relic goes back until the checkpoint is closed a second time.
  if (isLastOfAct(cp)) {
    const relic = relicOfAct(cp.act);
    if (relic) rowsOf(await db.from("team_relics").delete().eq("team_id", teamId).eq("relic_id", relic.id));
  }
  await notifyChange("progress", teamId);
  res.json({ ok: true, teamId, cpId: cp.id });
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
  await notifyChange("clock");
  res.json({ required: req.body.required });
}
