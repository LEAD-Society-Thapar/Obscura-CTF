// Instant updates: after anything that changes what teams see (the clock, extra time, a full-screen lock, a reopened
// checkpoint), the server sends a tiny "changed" message on a Supabase Realtime broadcast channel. Team screens
// (client/src/lib/live.js) are subscribed and refetch their clock or progress at once, instead of waiting for the
// next poll. The message carries no game data, only what kind of thing changed and, for one team's changes, its id.
//
// Two kinds of topic:
//   LIVE_TOPIC            changes for every team (clock start/pause/extend, coins for all). Every screen listens.
//   teamTopic(teamId)     changes for one team (a wrong answer, a full-screen exit, extra time for that team). Only that
//                         team's screens listen. Realtime counts (and rate-limits) every message per receiving screen,
//                         so sending one team's change to all screens would cost (number of screens) messages each time.
//
// Best effort: if Realtime is unreachable the action still succeeds and screens catch up on their next poll.
import { supabase } from "../config/supabase.js";

export const LIVE_TOPIC = "obscura-live";
export const LIVE_EVENT = "changed";
export const teamTopic = (teamId) => `${LIVE_TOPIC}:team:${teamId}`;

// kind: "clock" (refetch the clock) or "progress" (refetch everything). teamId: only that team needs to refetch.
export async function notifyChange(kind = "clock", teamId = null) {
  if (!supabase) return;
  const channel = supabase.channel(teamId ? teamTopic(teamId) : LIVE_TOPIC);
  try {
    // Usually ~200 ms; the first call from a freshly started server can take a few seconds (DNS + TLS).
    await channel.httpSend(LIVE_EVENT, { kind, teamId }, { timeout: 5_000 });
  } catch (e) {
    console.warn(`[live] broadcast failed (screens will catch up on their next poll): ${e.message}`);
  } finally {
    supabase.removeChannel(channel).catch(() => {});
  }
}
