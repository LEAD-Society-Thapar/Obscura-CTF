// Builds a team's view of the game from the DB rows + static content in data/game.js.
// Response shapes follow the client's mock server (client/src/data/mockApi.js), which is the API contract.
//
// One attempt per checkpoint: a wrong submission closes the checkpoint ("failed", 0 points) and the next gate
// opens. There is no separate table for that: a checkpoint is failed when the team has a wrong row in
// `submissions` for it and no row in `team_solves`. An admin reopens it by deleting the wrong row.
import { requireDb } from "../config/supabase.js";
import { ACTS, CHECKPOINTS, FINAL_BOSS, RELICS } from "../data/game.js";
import { deriveGateSlug } from "../utils/gate.js";
import { HttpError } from "../utils/httpError.js";
import { EVENT_ROW_ID } from "./eventClock.js";
import { fullscreenView, teamClock } from "./fullscreen.js";

const rowsOf = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const isFinal = (cp) => cp?.id === FINAL_BOSS.id;
export const checkpointById = (id) => CHECKPOINTS.find((c) => c.id === id) || null;
export const checkpointAfter = (cp) => CHECKPOINTS[CHECKPOINTS.indexOf(cp) + 1] || null;
// Only act checkpoints can end an act. The final boss (act: null) never does, so it never awards a relic;
// 5.4 is last of act 5 because the next gate (final) has a different act.
export const isLastOfAct = (cp) => cp?.act != null && !isFinal(cp) && checkpointAfter(cp)?.act !== cp.act;
export const relicOfAct = (actId) =>
  actId == null ? null : RELICS.find((r) => r.id === ACTS.find((a) => a.id === actId)?.relicId) || null;

// True when every relic id appears in `relicIds`.
export const holdsAllRelics = (relicIds) => {
  const held = new Set(relicIds);
  return RELICS.every((r) => held.has(r.id));
};

// Relics a team has earned: one per act whose last checkpoint is closed (solved, or missed with a wrong answer).
export function earnedRelicIds(closedCpIds) {
  const closed = new Set(closedCpIds);
  return CHECKPOINTS.filter((cp) => isLastOfAct(cp) && closed.has(cp.id))
    .map((cp) => relicOfAct(cp.act)?.id)
    .filter(Boolean);
}

// Points are derived, never stored, so they can't drift: solves - hints + manual adjustment.
export function pointsOf(team, solves, hints) {
  const earned = solves.reduce((n, s) => n + s.points, 0);
  const spent = hints.reduce((n, h) => n + h.cost, 0);
  return earned - spent + (team.points_adjust || 0);
}

// Leaderboard rows, ranked: points (high first); on equal points the team whose most recent solve came earlier
// wins (no solves = last); then more solves first. Output shape: { teamId, team, points, solved, rank, isYou }.
export function rankTeams(teams, solves, hints, youId = null) {
  const lastSolveMs = (rows) =>
    rows.length ? Math.max(...rows.map((s) => new Date(s.solved_at).getTime())) : Number.POSITIVE_INFINITY;
  return teams
    .map((t) => {
      const s = solves.filter((x) => x.team_id === t.id);
      const h = hints.filter((x) => x.team_id === t.id);
      return { teamId: t.id, team: t.name, points: pointsOf(t, s, h), solved: s.length, last: lastSolveMs(s) };
    })
    .sort((a, b) => b.points - a.points || a.last - b.last || b.solved - a.solved)
    .map(({ last, ...r }, i) => ({ ...r, rank: i + 1, isYou: r.teamId === youId }));
}

export async function loadTeamState(teamId) {
  const db = requireDb();
  const [teams, solves, hints, relics, misses, events] = await Promise.all([
    // "*" so this keeps working before migration 002 (teams.extra_time_ms) has been applied.
    db.from("teams").select("*").eq("id", teamId),
    db.from("team_solves").select("cp_id, points, solved_at").eq("team_id", teamId),
    db.from("team_hints").select("cp_id, hint_id, cost, revealed_at").eq("team_id", teamId),
    db.from("team_relics").select("relic_id, earned_at").eq("team_id", teamId),
    db.from("submissions").select("cp_id, submitted, created_at").eq("team_id", teamId).eq("correct", false),
    db.from("event_state").select("*").eq("id", EVENT_ROW_ID),
  ]).then((results) => results.map(rowsOf));

  if (!teams[0]) throw new HttpError(401, "Team no longer exists, log in again");
  const { password_hash: _passwordHash, ...team } = teams[0];

  // A relic row is written when the act's last checkpoint closes. If that write was lost (the solve and the relic
  // are two separate inserts), put it back here so a team can never be locked out of the final by a failed request.
  const held = new Set(relics.map((r) => r.relic_id));
  const owed = earnedRelicIds([...solves, ...misses].map((r) => r.cp_id)).filter((id) => !held.has(id));
  if (owed.length) {
    rowsOf(
      await db
        .from("team_relics")
        .upsert(owed.map((relic_id) => ({ team_id: teamId, relic_id })), { onConflict: "team_id,relic_id", ignoreDuplicates: true })
    );
    const earned_at = new Date().toISOString();
    relics.push(...owed.map((relic_id) => ({ relic_id, earned_at })));
  }

  const state = new TeamState(team, solves, hints, relics, misses, teamClock(events[0], team));
  state.event = events[0] ?? null;
  return state;
}

export class TeamState {
  // misses: this team's wrong rows from `submissions` ({ cp_id, submitted, created_at }).
  // clock:  teamClock() for this team (frozen while locked out for leaving full screen), or null in unit tests.
  constructor(team, solves, hints, relics, misses = [], clock = null) {
    this.team = team;
    this.solves = solves;
    this.hints = hints;
    this.relics = relics;
    this.clock = clock;
    this.event = null; // the event_state row, set by loadTeamState and the admin overview

    const solved = new Set(solves.map((s) => s.cp_id));
    // Latest wrong row per checkpoint, ignoring checkpoints that were solved (a solve always wins).
    this.misses = [];
    for (const m of [...misses].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))) {
      if (solved.has(m.cp_id)) continue;
      const i = this.misses.findIndex((x) => x.cp_id === m.cp_id);
      if (i >= 0) this.misses[i] = m;
      else this.misses.push(m);
    }
    const failed = new Set(this.misses.map((m) => m.cp_id));

    // Strict order: closed checkpoints (solved or failed) stay closed, the first open one is current, the rest locked.
    let currentFound = false;
    this.status = new Map();
    for (const cp of CHECKPOINTS) {
      if (solved.has(cp.id)) {
        this.status.set(cp.id, "solved");
      } else if (failed.has(cp.id)) {
        this.status.set(cp.id, "failed");
      } else if (!currentFound) {
        this.status.set(cp.id, "current");
        currentFound = true;
      } else {
        this.status.set(cp.id, "locked");
      }
    }

    // Defence in depth: the final gate stays locked without every relic, whatever the order logic says
    // (e.g. an admin-inserted solve row). A closed final stays closed.
    this.hasAllRelics = holdsAllRelics(relics.map((r) => r.relic_id));
    if (this.status.get(FINAL_BOSS.id) === "current" && !this.hasAllRelics) {
      this.status.set(FINAL_BOSS.id, "locked");
    }
  }

  get finalSolve() {
    return this.solves.find((s) => s.cp_id === FINAL_BOSS.id) || null;
  }

  get finalMissed() {
    return this.status.get(FINAL_BOSS.id) === "failed";
  }

  get points() {
    return pointsOf(this.team, this.solves, this.hints);
  }

  // The final is closed (solved or missed): nothing left to answer, so full screen is no longer enforced.
  get done() {
    return this.isClosed(FINAL_BOSS);
  }

  // Solved or failed: either way the checkpoint takes no more answers.
  isClosed(cp) {
    const s = this.status.get(cp.id);
    return s === "solved" || s === "failed";
  }

  // The Reel Card carries the story forward (and often the answer), so it is shown once a checkpoint is closed.
  // Exception: a missed final. Its reel is the victory ending, which that team did not earn.
  canSeeReel(cp) {
    const s = this.status.get(cp.id);
    return s === "solved" || (s === "failed" && !isFinal(cp));
  }

  slugOf(cp) {
    return deriveGateSlug(this.team.id, cp.id);
  }

  bySlug(slug) {
    return CHECKPOINTS.find((cp) => this.slugOf(cp) === slug) || null;
  }

  // Locked checkpoints have no slug yet (a slug is only revealed once a gate opens).
  summary(cp) {
    const status = this.status.get(cp.id);
    return {
      id: cp.id,
      act: cp.act,
      index: cp.index,
      title: cp.title,
      category: cp.category,
      points: cp.points,
      status,
      slug: status === "locked" ? null : this.slugOf(cp),
    };
  }

  reelOf(cp) {
    return { cpId: cp.id, act: cp.act, index: cp.index, title: cp.title, ...cp.reel };
  }

  nextOf(cp) {
    const n = checkpointAfter(cp);
    return n && this.status.get(n.id) !== "locked" ? { id: n.id, act: n.act, index: n.index, slug: this.slugOf(n) } : null;
  }

  // Hint text is only sent once revealed.
  detail(cp) {
    const revealed = new Set(this.hints.filter((h) => h.cp_id === cp.id).map((h) => h.hint_id));
    return {
      ...this.summary(cp),
      story: cp.story,
      body: cp.body,
      posterSlot: cp.posterSlot,
      downloads: cp.downloads,
      tools: cp.tools,
      hints: cp.hints.map((h) => ({
        id: h.id,
        cost: h.cost,
        teaser: h.teaser,
        revealed: revealed.has(h.id),
        text: revealed.has(h.id) ? h.text : null,
      })),
      reel: this.canSeeReel(cp) ? this.reelOf(cp) : null,
      next: this.isClosed(cp) ? this.nextOf(cp) : null,
    };
  }

  // Inscription and lore are only revealed for relics this team has collected.
  relicList() {
    const earned = new Set(this.relics.map((r) => r.relic_id));
    return RELICS.map((r) => {
      const collected = earned.has(r.id);
      return {
        ...r,
        collected,
        inscription: collected ? r.inscription : null,
        lore: collected ? r.lore : null,
      };
    });
  }

  // Newest first, built from solves + misses + hints + relics (no separate log table).
  activity() {
    const entries = [
      ...this.solves.map((s) => ({ id: `solve-${s.cp_id}`, type: "solve", cpId: s.cp_id, delta: s.points, at: s.solved_at })),
      ...this.misses.map((m) => ({ id: `miss-${m.cp_id}`, type: "miss", cpId: m.cp_id, delta: 0, at: m.created_at })),
      ...this.hints.map((h) => ({ id: `hint-${h.cp_id}-${h.hint_id}`, type: "hint", cpId: h.cp_id, delta: -h.cost, at: h.revealed_at })),
      ...this.relics.map((r) => ({ id: `relic-${r.relic_id}`, type: "relic", relicId: r.relic_id, delta: 0, at: r.earned_at })),
    ];
    return entries.sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  // Solves in a row since the last hint or miss.
  streak(activity) {
    let n = 0;
    for (const e of activity) {
      if (e.type === "hint" || e.type === "miss") break;
      if (e.type === "solve") n += 1;
    }
    return n;
  }

  progress() {
    const activity = this.activity();
    const relics = this.relicList();
    const finalSummary = this.summary(FINAL_BOSS);
    const finalSolve = this.finalSolve;
    return {
      team: { id: this.team.id, name: this.team.name, avatarSlot: "team-avatar", points: this.points },
      stats: {
        hintsUsed: this.hints.length,
        hintPointsSpent: this.hints.reduce((n, h) => n + h.cost, 0),
        streak: this.streak(activity),
        solved: this.solves.length, // includes the final face-off
        missed: this.misses.length,
        totalCheckpoints: CHECKPOINTS.length, // 21
      },
      // Acts list only act checkpoints (c.act === a.id), so the final face-off never shows on the map or in counts.
      acts: ACTS.map((a) => ({
        ...a,
        checkpoints: CHECKPOINTS.filter((c) => c.act === a.id).map((c) => this.summary(c)),
      })),
      finalBoss: {
        id: finalSummary.id,
        title: finalSummary.title,
        category: finalSummary.category,
        points: finalSummary.points,
        status: finalSummary.status,
        slug: finalSummary.slug, // null while locked
      },
      relicsCollected: relics.filter((r) => r.collected).length,
      relicsTotal: relics.length,
      finished: !!finalSolve,
      finishedAt: finalSolve?.solved_at ?? null,
      finalMissed: this.finalMissed,
      relics,
      activity: activity.map((e) => ({
        ...e,
        cp: checkpointById(e.cpId) ? this.summary(checkpointById(e.cpId)) : null,
        relic: e.relicId ? relics.find((r) => r.id === e.relicId) || null : null,
      })),
    };
  }

  // One row of the admin overview. Unlike everything above, this is organiser-only: it includes what the team
  // typed on a missed checkpoint so a dispute can be judged before reopening it.
  adminRow(rank = null) {
    const current = CHECKPOINTS.find((cp) => this.status.get(cp.id) === "current") || null;
    const times = [
      ...this.solves.map((s) => s.solved_at),
      ...this.misses.map((m) => m.created_at),
      ...this.hints.map((h) => h.revealed_at),
    ].map((t) => new Date(t).getTime());
    return {
      id: this.team.id,
      code: this.team.team_code ?? this.team.name,
      name: this.team.name,
      rank,
      points: this.points,
      solved: this.solves.length,
      missed: this.misses.length,
      hintsUsed: this.hints.length,
      hintPointsSpent: this.hints.reduce((n, h) => n + h.cost, 0),
      relics: this.relics.length,
      current: current ? { id: current.id, title: current.title } : null,
      finished: !!this.finalSolve,
      finalMissed: this.finalMissed,
      lastActivityAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
      clock: this.clock
        ? { status: this.clock.status, remainingMs: this.clock.remainingMs, extraTimeMs: this.clock.extraTimeMs }
        : null,
      fullscreen: {
        ...fullscreenView(this.event, this.team),
        lastViolationAt: this.team.fs_last_violation_at ?? null,
        frozenRemainingMs: this.team.fs_locked_at ? Number(this.team.fs_locked_remaining_ms ?? 0) : null,
      },
      checkpoints: CHECKPOINTS.map((cp) => ({ id: cp.id, status: this.status.get(cp.id) })),
      misses: this.misses.map((m) => ({ cpId: m.cp_id, submitted: m.submitted, at: m.created_at })),
    };
  }
}
