// Game API. Each handler maps to one route in routes/game.routes.js.
// Response shapes follow the client's mock server (client/src/data/mockApi.js).
import { requireDb } from "../config/supabase.js";
import { ACTS, RULES } from "../data/game.js";
import { flagMatches, normalizeAnswer } from "../utils/gate.js";
import { releaseAttempt } from "../middleware/submitLimiter.js";
import { HttpError } from "../utils/httpError.js";
import { assertRunning, assertStarted } from "../services/eventClock.js";
import { readEventState } from "../services/eventState.js";
import { fullscreenSupported, fullscreenView, teamClock, violationPatch } from "../services/fullscreen.js";
import { notifyChange } from "../services/live.js";
import {
  checkpointAfter,
  checkpointById,
  holdsAllRelics,
  isFinal,
  isLastOfAct,
  loadTeamState,
  MAX_ATTEMPTS,
  relicOfAct,
} from "../services/teamState.js";

const UNIQUE_VIOLATION = "23505";

const rowsOf = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Resolves a gate slug to an open checkpoint for this team, or throws NOT_FOUND / LOCKED.
export function openGate(state, slug) {
  const cp = state.bySlug(slug);
  if (!cp) throw new HttpError(404, "No gate here.", { code: "NOT_FOUND" });
  // Defence in depth for the final face-off: refuse without every relic, independent of the status map.
  if (isFinal(cp) && !state.hasAllRelics && !state.isClosed(cp)) {
    throw new HttpError(403, "Collect every relic to face Mogambo.", { code: "LOCKED", act: null, final: true });
  }
  if (state.status.get(cp.id) === "locked") {
    throw new HttpError(403, "This gate is still sealed.", { code: "LOCKED", act: cp.act, final: isFinal(cp) });
  }
  return cp;
}

// This team's clock + full-screen state, the shape of GET /api/game/state.
const clockPayload = (ev, team) => {
  const { password_hash: _passwordHash, ...safe } = team ?? {};
  return { ...teamClock(ev, team ? safe : null), fullscreen: fullscreenView(ev, team) };
};

// GET /api/game/state   This team's clock: the global clock plus any extra time the admin gave the team, frozen
// while the team is locked out for leaving full screen. Clients count down from remainingMs (not endsAt), so a
// wrong device clock does not matter. `fullscreen` tells every device whether to demand full screen.
export async function getEventState(req, res) {
  const db = requireDb();
  const [event, teams] = await Promise.all([
    readEventState(), // cached for a second: every screen polls this
    db.from("teams").select("*").eq("id", req.team.id).then(rowsOf), // "*": works before migrations 002 and 003
  ]);
  res.json(clockPayload(event, teams[0]));
}

// Flag hashes per checkpoint. They only change when an organiser re-runs `npm run db:seed:flags`, and every
// submission needs them, so each server instance keeps them for FLAG_CACHE_MS (a re-seed applies within that).
const FLAG_CACHE_MS = 15_000;
const flagCache = new Map(); // cpId -> { at, promise }
function flagRow(db, cpId) {
  const hit = flagCache.get(cpId);
  if (hit && Date.now() - hit.at < FLAG_CACHE_MS) return hit.promise;
  // select("*") so this keeps working if migration 001 (accepted_hashes) has not been applied yet.
  const promise = db
    .from("checkpoints")
    .select("*")
    .eq("id", cpId)
    .then(rowsOf)
    .then((rows) => rows[0] ?? null);
  const entry = { at: Date.now(), promise };
  flagCache.set(cpId, entry);
  promise.then(
    (row) => !row && flagCache.get(cpId) === entry && flagCache.delete(cpId), // a missing row is not cached
    () => flagCache.get(cpId) === entry && flagCache.delete(cpId)
  );
  return promise;
}

// POST /api/game/fullscreen/violation   A device of this team left full screen while the clock was running.
// Counted at most once per FS_DUPLICATE_MS; the third one locks the team (services/fullscreen.js).
// The update only applies if nobody else changed the counter meanwhile, so two devices reporting at the same
// moment are both counted, never lost.
export async function reportViolation(req, res) {
  const db = requireDb();
  for (let attempt = 0; attempt < 4; attempt++) {
    const state = await loadTeamState(req.team.id);
    const team = state.team;
    if (!fullscreenSupported(team)) return res.json({ counted: false, ...clockPayload(state.event, team) });

    const patch = violationPatch(state.event, team, { finished: state.done });
    if (!patch) return res.json({ counted: false, ...clockPayload(state.event, team) });

    const updated = rowsOf(
      await db
        .from("teams")
        .update(patch)
        .eq("id", team.id)
        .eq("fs_violations", Number(team.fs_violations || 0))
        .is("fs_locked_at", null)
        .select("*")
    );
    if (updated.length) {
      await notifyChange("clock", team.id);
      return res.json({ counted: true, ...clockPayload(state.event, updated[0]) });
    }
  }
  throw new HttpError(409, "Could not record that, try again.", { code: "BUSY" });
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
  assertStarted(state.clock); // no challenge text before the hunt starts
  res.json({ checkpoint: state.detail(cp) });
}

// POST /api/game/gate/:slug/submit  { flag }   (rate limited by submitLimiter)
// MAX_ATTEMPTS per checkpoint. A wrong answer uses one; the last one closes the checkpoint with 0 points and opens
// the next gate. The act's relic is still granted when its last checkpoint closes, so every team can reach the final.
export async function submitFlag(req, res) {
  const db = requireDb();
  const teamId = req.team.id;
  let state;
  let cp;
  // Any refusal before the flag is checked gives the 10 s submit slot back (see releaseAttempt).
  try {
    if (!normalizeAnswer(req.body?.flag)) throw new HttpError(400, "Enter a flag first.");
    state = await loadTeamState(teamId);
    cp = openGate(state, req.params.slug);
    if (state.status.get(cp.id) === "solved") {
      throw new HttpError(409, "Your team already solved this checkpoint.", { code: "ALREADY_SOLVED" });
    }
    if (state.status.get(cp.id) === "failed") {
      throw new HttpError(409, `Your team has used all ${MAX_ATTEMPTS} attempts on this checkpoint.`, { code: "ALREADY_ATTEMPTED" });
    }
    assertRunning(state.clock);
  } catch (e) {
    releaseAttempt(req);
    throw e;
  }
  const flag = String(req.body.flag);

  const row = await flagRow(db, cp.id);
  if (!row) throw new Error(`Checkpoint ${cp.id} has no flag in the DB. Run npm run db:seed:flags.`);

  const correct = flagMatches(cp.id, flag, [row.flag_hash, ...(row.accepted_hashes ?? [])]);
  // Never store a correct answer in plain text. A wrong one is kept: wrong rows count the attempts used (the last
  // one marks the checkpoint as missed), and they let an organiser judge a dispute before giving an attempt back.
  const submitted = correct ? "[correct]" : flag.trim().slice(0, 200);
  rowsOf(await db.from("submissions").insert({ team_id: teamId, cp_id: cp.id, submitted, correct }));

  if (correct) {
    // The primary key (team_id, cp_id) stops a double award if two requests race.
    const { error } = await db.from("team_solves").insert({ team_id: teamId, cp_id: cp.id, points: cp.points });
    if (error?.code === UNIQUE_VIOLATION) {
      throw new HttpError(409, "Your team already solved this checkpoint.", { code: "ALREADY_SOLVED" });
    }
    if (error) throw error;
  }

  // A wrong answer with attempts left keeps the gate open: nothing else changes.
  const used = correct ? state.attemptsOf(cp).used : state.attemptsOf(cp).used + 1;
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - used);
  if (!correct && attemptsLeft > 0) {
    await notifyChange("progress", teamId);
    return res.json({
      correct: false,
      missed: false,
      attemptsLeft,
      maxAttempts: MAX_ATTEMPTS,
      pointsAwarded: 0,
      reel: null,
      next: null,
      relic: null,
      finished: false,
      finalMissed: false,
      ending: null,
      endingTitle: null,
    });
  }

  // Closed (solved, or every attempt used): the last checkpoint of an act hands over the act's relic.
  const relic = isLastOfAct(cp) ? relicOfAct(cp.act) : null;
  if (relic) {
    rowsOf(
      await db
        .from("team_relics")
        .upsert({ team_id: teamId, relic_id: relic.id }, { onConflict: "team_id,relic_id", ignoreDuplicates: true })
    );
  }

  // Only point at the final gate if the team now holds every relic (including one awarded just now);
  // otherwise the client sends them to the Relics page.
  let next = checkpointAfter(cp);
  if (isFinal(next) && !holdsAllRelics([...state.relics.map((r) => r.relic_id), ...(relic ? [relic.id] : [])])) {
    next = null;
  }
  const final = isFinal(cp);
  res.json({
    correct,
    missed: !correct,
    attemptsLeft: correct ? null : 0,
    maxAttempts: MAX_ATTEMPTS,
    pointsAwarded: correct ? cp.points : 0,
    // A missed final does not get its reel: that reel is the victory ending.
    reel: correct || !final ? state.reelOf(cp) : null,
    next: next ? { id: next.id, act: next.act, index: next.index, slug: state.slugOf(next) } : null,
    relic: relic ? { ...relic, collected: true } : null,
    finished: final && correct,
    finalMissed: final && !correct,
    // Sent only after the final solve. The title comes from the server (not the client bundle) because it
    // matches an accepted answer for the final checkpoint.
    ending: final && correct ? cp.reel.clue : null,
    endingTitle: final && correct ? cp.reel.quote || null : null,
  });
}

// POST /api/game/gate/:slug/hint  { level }   Hints are revealed in order, each paid for once, in coins.
// A team cannot reveal a hint it cannot afford. Overspending by racing two requests is not possible: the only
// hint a team can reveal at any moment is the next one on its single current gate, and team_hints' primary key
// (team, checkpoint, hint) lets that row be inserted (and charged) only once.
export async function useHint(req, res) {
  const level = Number(req.body?.level);
  const state = await loadTeamState(req.team.id);
  const cp = openGate(state, req.params.slug);
  if (state.status.get(cp.id) !== "current") {
    throw new HttpError(409, "Hints are only available on your current gate.", { code: "NOT_ACTIVE" });
  }
  assertRunning(state.clock);

  const hint = cp.hints.find((h) => h.id === level);
  if (!hint) throw new HttpError(404, "No such hint.", { code: "NOT_FOUND" });
  const revealed = new Set(state.hints.filter((h) => h.cp_id === cp.id).map((h) => h.hint_id));
  if (cp.hints.some((h) => h.id < level && !revealed.has(h.id))) {
    throw new HttpError(400, "Reveal the earlier hint first.", { code: "OUT_OF_ORDER" });
  }

  if (!revealed.has(hint.id)) {
    const { left } = state.coins;
    if (left < hint.cost) {
      throw new HttpError(409, `Not enough coins: this hint costs ${hint.cost} and your team has ${Math.max(0, left)}.`, {
        code: "NOT_ENOUGH_COINS",
        cost: hint.cost,
        coinsLeft: Math.max(0, left),
      });
    }
    const row = { team_id: req.team.id, cp_id: cp.id, hint_id: hint.id, cost: hint.cost };
    const { error } = await requireDb().from("team_hints").insert(row);
    if (error && error.code !== UNIQUE_VIOLATION) throw error;
    if (!error) state.hints.push(row);
  }
  res.json({ hint: { id: hint.id, cost: hint.cost, text: hint.text }, points: state.points, coins: state.coins });
}

// GET /api/game/reel/:cpId   Only for checkpoints this team has closed (solved, or missed; never a missed final).
export async function getReel(req, res) {
  const state = await loadTeamState(req.team.id);
  const cp = checkpointById(req.params.cpId);
  if (!cp) throw new HttpError(404, "No reel with that number.", { code: "NOT_FOUND" });
  if (!state.canSeeReel(cp)) {
    throw new HttpError(403, "Solve this checkpoint to see its Reel Card.", { code: "LOCKED", act: cp.act });
  }
  res.json({ reel: state.reelOf(cp), next: state.nextOf(cp), missed: state.status.get(cp.id) === "failed" });
}

// GET /api/game/inventory
export async function getInventory(req, res) {
  const state = await loadTeamState(req.team.id);
  res.json({ relics: state.relicList() });
}

// GET /api/game/acts   Public: titles only, for the landing page.
export function getActs(_req, res) {
  res.json({ acts: ACTS.map(({ id, title }) => ({ id, title })) });
}

// GET /api/game/rules   Public.
export function getRules(_req, res) {
  res.json({ rules: RULES });
}
