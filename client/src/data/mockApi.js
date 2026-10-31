// Fake server used in mock mode. Function names and arguments mirror client/src/api/endpoints.js,
// and response shapes are the proposed API contract (see client/README.md).
// State is kept in sessionStorage so progress survives a reload; resetMock() (called on logout) clears it.
import { ApiError } from "../api/client.js";
import * as seed from "./mock.js";
import {
  MOCK_LATENCY_MS,
  MOCK_SUBMIT_INTERVAL_MS,
  MOCK_WRONG_LIMIT,
  MOCK_COOLDOWN_MS,
} from "../lib/config.js";

const STORE_KEY = "obscura_mock_db";

const fresh = () => ({
  event: { ...seed.event },
  team: { ...seed.team },
  stats: { ...seed.stats },
  acts: structuredClone(seed.acts),
  checkpoints: structuredClone(seed.checkpoints),
  relics: structuredClone(seed.relics),
  activity: structuredClone(seed.activity),
  lastSubmitAt: 0,
  wrongStreak: 0,
  cooldownUntil: 0,
});

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY)) || fresh();
  } catch {
    return fresh();
  }
}

function save() {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch {
    /* storage blocked: state just won't survive a reload */
  }
}

let db = load();
let nextActivityId = Math.max(1000, ...db.activity.map((e) => e.id + 1));

// Back to the initial state from mock.js (fresh countdown too).
export function resetMock() {
  db = fresh();
  try {
    sessionStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}

const wait = (ms = MOCK_LATENCY_MS) => new Promise((r) => setTimeout(r, ms));
const fail = (status, code, message, extra = {}) => {
  throw new ApiError(message, status, { error: message, code, ...extra });
};

const bySlug = (slug) => db.checkpoints.find((c) => c.slug === slug);
const byId = (id) => db.checkpoints.find((c) => c.id === id);
const after = (cp) => db.checkpoints[db.checkpoints.indexOf(cp) + 1] || null;

// Locked checkpoints have no slug yet (the server only issues a slug once a gate opens).
const summary = (cp) => ({
  id: cp.id,
  act: cp.act,
  index: cp.index,
  title: cp.title,
  category: cp.category,
  points: cp.points,
  status: cp.status,
  slug: cp.status === "locked" ? null : cp.slug,
});

const reelOf = (cp) => ({ cpId: cp.id, act: cp.act, index: cp.index, title: cp.title, ...cp.reel });
const nextOf = (cp) => {
  const n = after(cp);
  return n && n.status !== "locked" ? { id: n.id, act: n.act, index: n.index, slug: n.slug } : null;
};

// Hint text is only sent once revealed.
const detail = (cp) => ({
  ...summary(cp),
  story: cp.story,
  posterSlot: cp.posterSlot,
  downloads: cp.downloads,
  hints: cp.hints.map((h) => ({
    id: h.id,
    cost: h.cost,
    teaser: h.teaser,
    revealed: !!h.revealed,
    text: h.revealed ? h.text : null,
  })),
  reel: cp.status === "solved" ? reelOf(cp) : null,
  next: cp.status === "solved" ? nextOf(cp) : null,
});

const log = (entry) => db.activity.unshift({ id: nextActivityId++, at: new Date().toISOString(), ...entry });

// ---------- Endpoints ----------

export async function getEventState() {
  await wait(150);
  return { ...db.event };
}

export async function getProgress() {
  await wait(250);
  return {
    team: { ...db.team },
    stats: { ...db.stats },
    acts: db.acts.map((a) => ({
      ...a,
      checkpoints: db.checkpoints.filter((c) => c.act === a.id).map(summary),
    })),
    relics: db.relics.map((r) => ({ ...r })),
    activity: db.activity.map((e) => ({
      ...e,
      cp: e.cpId ? summary(byId(e.cpId)) : null,
      relic: e.relicId ? db.relics.find((r) => r.id === e.relicId) : null,
    })),
  };
}

export async function getCheckpoint(slug) {
  await wait();
  const cp = bySlug(slug);
  if (!cp) fail(404, "NOT_FOUND", "No gate here.");
  if (cp.status === "locked") fail(403, "LOCKED", "This gate is still sealed.", { act: cp.act });
  return { checkpoint: detail(cp) };
}

export async function submitFlag(slug, flag) {
  await wait();
  const cp = bySlug(slug);
  if (!cp) fail(404, "NOT_FOUND", "No gate here.");
  if (cp.status === "locked") fail(403, "LOCKED", "This gate is still sealed.");
  if (cp.status === "solved") fail(409, "ALREADY_SOLVED", "Your team already solved this checkpoint.");

  const now = Date.now();
  if (db.cooldownUntil > now) {
    fail(429, "COOLDOWN", "Too many wrong flags. Cool down.", {
      retryAfter: Math.ceil((db.cooldownUntil - now) / 1000),
    });
  }
  if (now - db.lastSubmitAt < MOCK_SUBMIT_INTERVAL_MS) {
    fail(429, "TOO_FAST", "Easy, hero. One flag at a time.", {
      retryAfter: Math.ceil((MOCK_SUBMIT_INTERVAL_MS - (now - db.lastSubmitAt)) / 1000),
    });
  }
  db.lastSubmitAt = now;

  // Mock rule: anything ending in "}" is correct. Real validation is server-side only.
  if (!String(flag).trim().endsWith("}")) {
    db.wrongStreak += 1;
    if (db.wrongStreak >= MOCK_WRONG_LIMIT) {
      db.wrongStreak = 0;
      db.cooldownUntil = now + MOCK_COOLDOWN_MS;
      save();
      return { correct: false, retryAfter: Math.ceil(MOCK_COOLDOWN_MS / 1000) };
    }
    save();
    return { correct: false, attemptsLeft: MOCK_WRONG_LIMIT - db.wrongStreak };
  }

  db.wrongStreak = 0;
  cp.status = "solved";
  db.team.points += cp.points;
  db.stats.streak += 1;
  log({ type: "solve", cpId: cp.id, delta: cp.points });

  const next = after(cp);
  if (next) next.status = "current";

  // Last checkpoint of an act grants the act's relic.
  let relic = null;
  if (!next || next.act !== cp.act) {
    const act = db.acts.find((a) => a.id === cp.act);
    relic = db.relics.find((r) => r.id === act?.relicId) || null;
    if (relic && !relic.collected) {
      relic.collected = true;
      log({ type: "relic", relicId: relic.id, delta: 0 });
    }
  }

  save();
  return {
    correct: true,
    pointsAwarded: cp.points,
    reel: reelOf(cp),
    next: nextOf(cp),
    relic: relic ? { ...relic } : null,
  };
}

// Mirrors endpoints.useHint(slug, level). Hints must be revealed in order.
export async function useHint(slug, level) {
  await wait();
  const cp = bySlug(slug);
  if (!cp) fail(404, "NOT_FOUND", "No gate here.");
  if (cp.status !== "current") fail(409, "NOT_ACTIVE", "Hints are only available on your current gate.");
  const hint = cp.hints.find((h) => h.id === level);
  if (!hint) fail(404, "NOT_FOUND", "No such hint.");
  if (cp.hints.some((h) => h.id < level && !h.revealed)) fail(400, "OUT_OF_ORDER", "Reveal the earlier hint first.");

  if (!hint.revealed) {
    hint.revealed = true;
    db.team.points -= hint.cost;
    db.stats.hintsUsed += 1;
    db.stats.hintPointsSpent += hint.cost;
    log({ type: "hint", cpId: cp.id, delta: -hint.cost });
    save();
  }
  return { hint: { id: hint.id, cost: hint.cost, text: hint.text }, points: db.team.points };
}

// Mock-only convenience: any checkpoint's reel can be previewed (the real server should only
// return reels for checkpoints this team has solved).
export async function getReel(cpId) {
  await wait(300);
  const cp = byId(cpId);
  if (!cp) fail(404, "NOT_FOUND", "No reel with that number.");
  return { reel: reelOf(cp), next: nextOf(cp) };
}

// Public act list (titles only) for the landing page.
export async function getActs() {
  await wait(100);
  return { acts: db.acts.map(({ id, title }) => ({ id, title })) };
}

export async function getRules() {
  await wait(100);
  return { rules: seed.rules };
}

export async function getLeaderboard() {
  await wait(300);
  const solved = db.checkpoints.filter((c) => c.status === "solved").length;
  const rows = [...seed.leaderboard, { teamId: db.team.id, team: db.team.name, points: db.team.points, solved }]
    .sort((a, b) => b.points - a.points)
    .map((r, i) => ({ ...r, rank: i + 1, isYou: r.teamId === db.team.id }));
  return { rows, frozen: false };
}
