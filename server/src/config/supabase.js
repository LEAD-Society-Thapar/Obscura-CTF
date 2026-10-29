import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Server-side client with the service-role key (bypasses RLS). Never expose it to the client.
export const supabase =
  env.supabaseUrl && env.supabaseServiceKey
    ? createClient(env.supabaseUrl, env.supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

if (!supabase) {
  console.warn("[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. DB routes will fail.");
}

export function requireDb() {
  if (!supabase) {
    const err = new Error("Database is not configured");
    err.status = 503;
    throw err;
  }
  return supabase;
}
