// Builds a team's view of the game from the DB rows + static content in data/game.js.
// Response shapes follow the client's mock server (client/src/data/mockApi.js), which is the API contract.
import { requireDb } from "../config/supabase.js";
import { ACTS, CHECKPOINTS, RELICS } from "../data/game.js";
import { deriveGateSlug } from "../utils/gate.js";
import { HttpError } from "../utils/httpError.js";

const rowsOf = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export const checkpointById = (id) => CHECKPOINTS.find((c) => c.id === id) || null;
export const checkpointAfter = (cp) => CHECKPOINTS[CHECKPOINTS.indexOf(cp) + 1] || null;
export const isLastOfAct = (cp) => checkpointAfter(cp)?.act !== cp.act;
export const relicOfAct = (actId) => RELICS.find((r) => r.id === ACTS.find((a) => a.id === actId)?.relicId) || null;

// Points are derived, never stored, so they can't drift: solves - hints + manual adjustment.
export function pointsOf(team, solves, hints) {
  const earned = solves.reduce((n, s) => n + s.points, 0);
  const spent = hints.reduce((n, h) => n + h.cost, 0);
  return earned - spent + (team.points_adjust || 0);
}

export async function loadTeamState(teamId) {
  const db = requireDb();
  const [teams, solves, hints, relics] = await Promise.all([
    db.from("teams").select("id, name, points_adjust").eq("id", teamId),
    db.from("team_solves").select("cp_id, points, solved_at").eq("team_id", teamId),
    db.from("team_hints").select("cp_id, hint_id, cost, revealed_at").eq("team_id", teamId),
    db.from("team_relics").select("relic_id, earned_at").eq("team_id", teamId),
  ]).then((results) => results.map(rowsOf));

  const team = teams[0];
  if (!team) throw new HttpError(401, "Team no longer exists, log in again");
  return new TeamState(team, solves, hints, relics);
}

export class TeamState {
  constructor(team, solves, hints, relics) {
    this.team = team;
    this.solves = solves;
    this.hints = hints;
    this.relics = relics;

    // Strict order: everything before the first unsolved checkpoint is solved, it is current, the rest locked.
    const solved = new Set(solves.map((s) => s.cp_id));
    let currentFound = false;
    this.status = new Map();
    for (const cp of CHECKPOINTS) {
      if (solved.has(cp.id)) {
        this.status.set(cp.id, "solved");
      } else if (!currentFound) {
        this.status.set(cp.id, "current");
        currentFound = true;
      } else {
        this.status.set(cp.id, "locked");
      }
    }
  }

  get points() {
    return pointsOf(this.team, this.solves, this.hints);
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
    const solved = this.status.get(cp.id) === "solved";
    return {
      ...this.summary(cp),
      story: cp.story,
      posterSlot: cp.posterSlot,
      downloads: cp.downloads,
      hints: cp.hints.map((h) => ({
        id: h.id,
        cost: h.cost,
        teaser: h.teaser,
        revealed: revealed.has(h.id),
        text: revealed.has(h.id) ? h.text : null,
      })),
      reel: solved ? this.reelOf(cp) : null,
      next: solved ? this.nextOf(cp) : null,
    };
  }

  relicList() {
    const earned = new Set(this.relics.map((r) => r.relic_id));
    return RELICS.map((r) => ({ ...r, collected: earned.has(r.id) }));
  }

  // Newest first, built from solves + hints + relics (no separate log table).
  activity() {
    const entries = [
      ...this.solves.map((s) => ({ id: `solve-${s.cp_id}`, type: "solve", cpId: s.cp_id, delta: s.points, at: s.solved_at })),
      ...this.hints.map((h) => ({ id: `hint-${h.cp_id}-${h.hint_id}`, type: "hint", cpId: h.cp_id, delta: -h.cost, at: h.revealed_at })),
      ...this.relics.map((r) => ({ id: `relic-${r.relic_id}`, type: "relic", relicId: r.relic_id, delta: 0, at: r.earned_at })),
    ];
    return entries.sort((a, b) => new Date(b.at) - new Date(a.at));
  }

  // Solves in a row since the last hint.
  streak(activity) {
    let n = 0;
    for (const e of activity) {
      if (e.type === "hint") break;
      if (e.type === "solve") n += 1;
    }
    return n;
  }

  progress() {
    const activity = this.activity();
    const relics = this.relicList();
    return {
      team: { id: this.team.id, name: this.team.name, avatarSlot: "team-avatar", points: this.points },
      stats: {
        hintsUsed: this.hints.length,
        hintPointsSpent: this.hints.reduce((n, h) => n + h.cost, 0),
        streak: this.streak(activity),
      },
      acts: ACTS.map((a) => ({
        ...a,
        checkpoints: CHECKPOINTS.filter((c) => c.act === a.id).map((c) => this.summary(c)),
      })),
      relics,
      activity: activity.map((e) => ({
        ...e,
        cp: checkpointById(e.cpId) ? this.summary(checkpointById(e.cpId)) : null,
        relic: e.relicId ? relics.find((r) => r.id === e.relicId) || null : null,
      })),
    };
  }
}
