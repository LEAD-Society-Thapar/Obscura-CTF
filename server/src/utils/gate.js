import crypto from "node:crypto";
import { env } from "../config/env.js";

// Per-team gate slug: HMAC(GATE_SECRET, teamId + ":" + checkpoint id), so sharing a URL across teams is useless.
// Server-side only. Output is short, URL-safe and not guessable without GATE_SECRET.
export function deriveGateSlug(teamId, cpId = "") {
  return crypto
    .createHmac("sha256", env.gateSecret)
    .update(`${teamId}:${cpId}`)
    .digest("base64url")
    .slice(0, 16);
}

// Canonical form of an answer, used both when hashing stored flags and when checking submissions:
// NFC, trimmed, lowercased, ONE optional OBSCURA{...} wrapper removed, then every whitespace character removed.
// So "OBSCURA{ A B E F }", "abef" and "ABEF" are equal.
const WRAPPER = /^obscura\{([\s\S]*)\}$/;

export function normalizeAnswer(input) {
  let s = String(input ?? "").normalize("NFC").trim().toLowerCase();
  const m = WRAPPER.exec(s);
  if (m) s = m[1];
  return s.replace(/\s+/g, "");
}

// HMAC-SHA256(FLAG_PEPPER, "<cpId>:<normalized answer>"), hex. Binding the checkpoint id means the same
// answer hashes differently per checkpoint, and the pepper keeps the DB hashes useless on their own.
export function hashFlag(cpId, input) {
  return crypto.createHmac("sha256", env.flagPepper).update(`${cpId}:${normalizeAnswer(input)}`).digest("hex");
}

// True when the submission's hash equals any of the stored hashes (flag_hash + accepted_hashes).
// Every candidate is compared, so timing does not reveal which one matched.
export function flagMatches(cpId, submitted, storedHashes) {
  const a = Buffer.from(hashFlag(cpId, submitted), "hex");
  let ok = false;
  for (const h of storedHashes) {
    if (typeof h !== "string") continue;
    const b = Buffer.from(h, "hex");
    if (b.length === a.length && crypto.timingSafeEqual(a, b)) ok = true;
  }
  return ok;
}
