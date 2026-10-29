import { HttpError } from "../utils/httpError.js";

// Flag submission limits (from the plan):
//  - 1 attempt per 10 s per team
//  - 5 wrong attempts in a row -> 60 s cooldown
// In-memory: fine for a single server instance. Move to Supabase/Redis if you ever run >1 instance.
const MIN_GAP_MS = 10_000;
const MAX_WRONG_STREAK = 5;
const COOLDOWN_MS = 60_000;

const state = new Map(); // teamId -> { lastAttemptAt, wrongStreak, blockedUntil }

export function submitLimiter(req, _res, next) {
  const id = req.team?.id;
  if (!id) return next(new HttpError(401, "Not logged in"));

  const now = Date.now();
  const s = state.get(id) || { lastAttemptAt: 0, wrongStreak: 0, blockedUntil: 0 };

  if (now < s.blockedUntil) {
    const secs = Math.ceil((s.blockedUntil - now) / 1000);
    return next(new HttpError(429, `Cooldown active. Try again in ${secs}s`));
  }
  if (now - s.lastAttemptAt < MIN_GAP_MS) {
    const secs = Math.ceil((MIN_GAP_MS - (now - s.lastAttemptAt)) / 1000);
    return next(new HttpError(429, `Too fast. Wait ${secs}s between attempts`));
  }

  s.lastAttemptAt = now;
  state.set(id, s);
  next();
}

// Call from the submit controller after the flag is checked.
export function recordResult(teamId, correct) {
  const s = state.get(teamId) || { lastAttemptAt: Date.now(), wrongStreak: 0, blockedUntil: 0 };
  if (correct) {
    s.wrongStreak = 0;
  } else {
    s.wrongStreak += 1;
    if (s.wrongStreak >= MAX_WRONG_STREAK) {
      s.blockedUntil = Date.now() + COOLDOWN_MS;
      s.wrongStreak = 0;
    }
  }
  state.set(teamId, s);
}
