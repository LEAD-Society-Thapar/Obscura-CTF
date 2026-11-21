// The single event_state row (the clock, the full-screen rule, the all-teams coin bonus) is needed by every team
// request. Reading it from the database every time made it the busiest query of all: hundreds of screens poll the
// clock. It is cached here for EVENT_CACHE_MS per server instance, and concurrent requests share one read.
//
// Staleness is bounded and allowed for:
//   - the admin actions that change the row clear the cache on their own instance (clearEventCache);
//   - another instance can serve the old row for at most EVENT_CACHE_MS, so after a "changed" message the client
//     waits longer than that before refetching (client/src/context/GameDataContext.jsx, LIVE_MIN_DELAY_MS);
//   - the end of the hunt is computed from started_at + duration, so time running out is never late.
// Team-specific state (extra time, full-screen lock, answers) is never cached.
import { requireDb } from "../config/supabase.js";
import { EVENT_ROW_ID } from "./eventClock.js";

export const EVENT_CACHE_MS = 1000;

let cached = null; // { at, promise }

export function readEventState() {
  const now = Date.now();
  if (cached && now - cached.at < EVENT_CACHE_MS) return cached.promise;
  const promise = requireDb()
    .from("event_state")
    .select("*")
    .eq("id", EVENT_ROW_ID)
    .then(({ data, error }) => {
      if (error) throw error;
      return data[0] ?? null;
    });
  const entry = { at: now, promise };
  cached = entry;
  promise.catch(() => {
    if (cached === entry) cached = null; // never cache a failure
  });
  return promise;
}

export function clearEventCache() {
  cached = null;
}
