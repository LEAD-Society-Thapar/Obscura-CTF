// Instant updates from the server (server/src/services/live.js). When the organisers start or pause the clock, add
// time, restore a team and so on, the server broadcasts a tiny "changed" message on Supabase Realtime; screens
// listening here refetch at once instead of waiting for the next poll.
//
// Needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (the publishable/anon key is made for browsers; every
// table has row-level security with no policies, so it cannot read any data). Without them, or if the connection
// drops, nothing breaks: screens just fall back to polling.
import { RealtimeClient } from "@supabase/realtime-js";

const TOPIC = "obscura-live"; // must match LIVE_TOPIC on the server
const EVENT = "changed";
const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let client = null;

export const liveAvailable = () => Boolean(URL && KEY);

// onChange({ kind: "clock" | "progress", teamId: string | null }). Also called once each time the connection is
// (re)established, so anything missed while offline is fetched. Returns an unsubscribe function.
export function subscribeToChanges(onChange) {
  if (!liveAvailable()) return () => {};
  try {
    client ??= new RealtimeClient(`${URL.replace(/^http/i, "ws").replace(/\/+$/, "")}/realtime/v1`, {
      params: { apikey: KEY },
    });
    const channel = client
      .channel(TOPIC)
      .on("broadcast", { event: EVENT }, (msg) => onChange(msg?.payload ?? {}))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onChange({ kind: "clock", teamId: null, reconnected: true });
      });
    return () => {
      client?.removeChannel(channel).catch(() => {});
    };
  } catch (e) {
    console.warn("[live] instant updates unavailable, using polling:", e.message);
    return () => {};
  }
}
