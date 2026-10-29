import crypto from "node:crypto";
import { env } from "../config/env.js";

// Per-team gate slug: derived from team ID + previous flag, so sharing a URL across teams is useless.
// Server-side only. Output is short, URL-safe and not guessable without GATE_SECRET.
export function deriveGateSlug(teamId, previousFlag = "") {
  return crypto
    .createHmac("sha256", env.gateSecret)
    .update(`${teamId}:${previousFlag}`)
    .digest("base64url")
    .slice(0, 16);
}

// Constant-time flag comparison. Flags are stored hashed in the DB, never plain.
export function hashFlag(flag) {
  return crypto.createHash("sha256").update(flag.trim()).digest("hex");
}

export function flagMatches(submitted, storedHash) {
  const a = Buffer.from(hashFlag(submitted), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
