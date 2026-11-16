import { HttpError } from "../utils/httpError.js";

// Flag submissions: at most one per 10 s per team.
// A team gets a single attempt per checkpoint (see services/teamState.js), so there is no wrong-streak cooldown
// any more; this gap only stops two team-mates from firing answers at the same gate at the same moment.
// In-memory: per server instance. The one-attempt rule itself is enforced from the database, not from here.
// Error code matches client/src/components/game/FlagForm.jsx: TOO_FAST with retryAfter (seconds).
const MIN_GAP_MS = 10_000;

const lastAttemptAt = new Map(); // teamId -> ms

export function submitLimiter(req, _res, next) {
  const id = req.team?.id;
  if (!id) return next(new HttpError(401, "Not logged in"));

  const now = Date.now();
  const since = now - (lastAttemptAt.get(id) ?? 0);
  if (since < MIN_GAP_MS) {
    const retryAfter = Math.ceil((MIN_GAP_MS - since) / 1000);
    return next(new HttpError(429, "Easy, hero. One flag at a time.", { code: "TOO_FAST", retryAfter }));
  }

  lastAttemptAt.set(id, now);
  req.attemptStamp = now;
  next();
}

// Gives the slot back when a submission was refused before its flag was checked (clock not running, gate locked,
// already closed...), so a refusal never costs the team a 10 s wait. Only undoes this request's own mark.
export function releaseAttempt(req) {
  const id = req.team?.id;
  if (id && req.attemptStamp && lastAttemptAt.get(id) === req.attemptStamp) lastAttemptAt.delete(id);
}

// Failed logins per client address, for the admin login only. Team logins are not limited this way because a
// whole lab usually shares one public IP. In-memory, per server instance.
const MAX_FAILURES = 8;
const WINDOW_MS = 5 * 60_000;
const failures = new Map(); // ip -> { count, resetAt }

export function loginGuard(ip) {
  const now = Date.now();
  const f = failures.get(ip);
  if (f && now < f.resetAt && f.count >= MAX_FAILURES) {
    const retryAfter = Math.ceil((f.resetAt - now) / 1000);
    throw new HttpError(429, "Too many failed logins. Try again in a few minutes.", { code: "TOO_MANY_LOGINS", retryAfter });
  }
  return {
    fail() {
      const cur = failures.get(ip);
      if (!cur || now >= cur.resetAt) failures.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      else cur.count += 1;
    },
    ok() {
      failures.delete(ip);
    },
  };
}
