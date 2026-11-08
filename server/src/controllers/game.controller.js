// Game API. Each handler maps to one route in routes/game.routes.js.
// Response shapes follow the client's mock server (client/src/data/mockApi.js).
import { requireDb } from "../config/supabase.js";
import { ACTS, RULES } from "../data/game.js";
import { recordResult } from "../middleware/submitLimiter.js";
import { flagMatches, normalizeAnswer } from "../utils/gate.js";
import { HttpError } from "../utils/httpError.js";
import {
  checkpointAfter,
  checkpointById,
  isLastOfAct,
  loadTeamState,
  pointsOf,
  relicOfAct,
} from "../services/teamState.js";

const UNIQUE_VIOLATION = "23505";

const rowsOf = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Resolves a gate slug to an open checkpoint for this team, or throws NOT_FOUND / LOCKED.
function openGate(state, slug) {
  const cp = state.bySlug(slug);
  if (!cp) throw new HttpError(404, "No gate here.", { code: "NOT_FOUND" });
  if (state.status.get(cp.id) === "locked") {
    throw new HttpError(403, "This gate is still sealed.", { code: "LOCKED", act: cp.act });
  }
  return cp;
}

// GET /api/game/state
export async function getEventState(_req, res) {
  const [ev] = rowsOf(await requireDb().from("event_state").select("*").eq("id", 1));
  const durationMinutes = ev?.duration_minutes ?? 90;
  if (!ev?.started_at || ev.status === "idle") {
    return res.json({ status: ev?.status ?? "idle", endsAt: null, durationMinutes });
  }
  const pausedMs =
    Number(ev.total_paused_ms) + (ev.status === "paused" && ev.paused_at ? Date.now() - new Date(ev.paused_at) : 0);
  const endsAt = new Date(new Date(ev.started_at).getTime() + durationMinutes * 60_000 + pausedMs);
  res.json({ status: ev.status, endsAt: endsAt.toISOString(), durationMinutes });
}

// GET /api/game/progress
export async function getProgress(req, res) {
  const state = await loadTeamState(req.team.id);
  res.json(state.progress());
}

// GET /api/game/gate/:slug
export async function getCheckpoint(req, res) {
  const state = await loadTeamState(req.team.id);
  const cp = openGate(state, req.params.slug);
  res.json({ checkpoint: state.detail(cp) });
}

// POST /api/game/gate/:slug/submit  { flag }   (rate limited by submitLimiter)
export async function submitFlag(req, res) {
  const flag = String(req.body?.flag || "");
  if (!normalizeAnswer(flag)) throw new HttpError(400, "Enter a flag first.");

  const db = requireDb();
  const teamId = req.team.id;
  const state = await loadTeamState(teamId);
  const cp = openGate(state, req.params.slug);
  if (state.status.get(cp.id) === "solved") {
    throw new HttpError(409, "Your team already solved this checkpoint.", { code: "ALREADY_SOLVED" });
  }

  // select("*") so this keeps working if migration 001 (accepted_hashes) has not been applied yet.
  const [row] = rowsOf(await db.from("checkpoints").select("*").eq("id", cp.id));
  if (!row) throw new Error(`Checkpoint ${cp.id} has no flag in the DB. Run npm run db:seed:flags.`);

  const correct = flagMatches(cp.id, flag, [row.flag_hash, ...(row.accepted_hashes ?? [])]);
  // Never store a correct answer in plain text.
  const submitted = correct ? "[correct]" : flag.trim().slice(0, 200);
  rowsOf(await db.from("submissions").insert({ team_id: teamId, cp_id: cp.id, submitted, correct }));
  const limit = recordResult(teamId, correct);
  if (!correct) return res.json({ correct: false, ...limit });

  // The primary key (team_id, cp_id) stops a double award if two requests race.
  const { error } = await db.from("team_solves").insert({ team_id: teamId, cp_id: cp.id, points: cp.points });
  if (error?.code === UNIQUE_VIOLATION) {
    throw new HttpError(409, "Your team already solved this checkpoint.", { code: "ALREADY_SOLVED" });
  }
  if (error) throw error;

  const relic = isLastOfAct(cp) ? relicOfAct(cp.act) : null;
  if (relic) {
    rowsOf(
      await db
        .from("team_relics")
        .upsert({ team_id: teamId, relic_id: relic.id }, { onConflict: "team_id,relic_id", ignoreDuplicates: true })
    );
  }

  const next = checkpointAfter(cp);
  res.json({
    correct: true,
    pointsAwarded: cp.points,
    reel: state.reelOf(cp),
    next: next ? { id: next.id, act: next.act, index: next.index, slug: state.slugOf(next) } : null,
    relic: relic ? { ...relic, collected: true } : null,
  });
}

// POST /api/game/gate/:slug/hint  { level }   Hints are revealed in order, each charged once.
export async function useHint(req, res) {
  const level = Number(req.body?.level);
  const state = await loadTeamState(req.team.id);
  const cp = openGate(state, req.params.slug);
  if (state.status.get(cp.id) !== "current") {
    throw new HttpError(409, "Hints are only available on your current gate.", { code: "NOT_ACTIVE" });
  }

  const hint = cp.hints.find((h) => h.id === level);
  if (!hint) throw new HttpError(404, "No such hint.", { code: "NOT_FOUND" });
  const revealed = new Set(state.hints.filter((h) => h.cp_id === cp.id).map((h) => h.hint_id));
  if (cp.hints.some((h) => h.id < level && !revealed.has(h.id))) {
    throw new HttpError(400, "Reveal the earlier hint first.", { code: "OUT_OF_ORDER" });
  }

  if (!revealed.has(hint.id)) {
    const row = { team_id: req.team.id, cp_id: cp.id, hint_id: hint.id, cost: hint.cost };
    const { error } = await requireDb().from("team_hints").insert(row);
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
    if (!error) state.hints.push(row);
  }
  res.json({ hint: { id: hint.id, cost: hint.cost, text: hint.text }, points: state.points });
}

// POST /api/game/gate/:slug/skip
export const skipCheckpoint = () => {
  throw new HttpError(501, "skipCheckpoint is not implemented yet"); // -40%, no flag/relic
};

// GET /api/game/reel/:cpId   Only for checkpoints this team has solved.
export async function getReel(req, res) {
  const state = await loadTeamState(req.team.id);
  const cp = checkpointById(req.params.cpId);
  if (!cp) throw new HttpError(404, "No reel with that number.", { code: "NOT_FOUND" });
  if (state.status.get(cp.id) !== "solved") {
    throw new HttpError(403, "Solve this checkpoint to see its Reel Card.", { code: "LOCKED", act: cp.act });
  }
  res.json({ reel: state.reelOf(cp), next: state.nextOf(cp) });
}

// GET /api/game/inventory
export async function getInventory(req, res) {
  const state = await loadTeamState(req.team.id);
  res.json({ relics: state.relicList() });
}

// GET /api/game/leaderboard   Public; isYou is set when a team is logged in.
// TODO: when frozen, serve the snapshot taken at freeze time instead of live points.
export async function getLeaderboard(req, res) {
  const db = requireDb();
  const [teams, solves, hints, events] = await Promise.all([
    db.from("teams").select("id, name, points_adjust"),
    db.from("team_solves").select("team_id, points"),
    db.from("team_hints").select("team_id, cost"),
    db.from("event_state").select("leaderboard_frozen").eq("id", 1),
  ]).then((results) => results.map(rowsOf));

  const rows = teams
    .map((t) => {
      const s = solves.filter((x) => x.team_id === t.id);
      const h = hints.filter((x) => x.team_id === t.id);
      return { teamId: t.id, team: t.name, points: pointsOf(t, s, h), solved: s.length };
    })
    .sort((a, b) => b.points - a.points || b.solved - a.solved)
    .map((r, i) => ({ ...r, rank: i + 1, isYou: r.teamId === req.team?.id }));

  res.json({ rows, frozen: !!events[0]?.leaderboard_frozen });
}

// GET /api/game/acts   Public: titles only, for the landing page.
export function getActs(_req, res) {
  res.json({ acts: ACTS.map(({ id, title }) => ({ id, title })) });
}

// GET /api/game/rules   Public.
export function getRules(_req, res) {
  res.json({ rules: RULES });
}
