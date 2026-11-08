// Turns server/private/flags.local.json into `checkpoints` table rows. Used by scripts/seed.js and the tests.
// flags.local.json: { "<cpId>": { "primary": "OBSCURA{...}", "accept": ["...", ...] }, ... }
import { existsSync, readFileSync } from "node:fs";
import { hashFlag, normalizeAnswer } from "./gate.js";

export const FLAGS_FILE = new URL("../../private/flags.local.json", import.meta.url);

// Returns the parsed file, or null if it does not exist. Throws on malformed JSON.
export function loadFlagsFile(file = FLAGS_FILE) {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

// One row per id: the primary's hash goes in flag_hash, every distinct other accepted answer in accepted_hashes.
// Throws when an id has no entry, or an answer is empty after normalization.
export function buildCheckpointRows(ids, flags) {
  return ids.map((id) => {
    const entry = flags[id];
    if (!entry || typeof entry.primary !== "string") throw new Error(`flags: no "primary" answer for checkpoint ${id}`);
    const accept = entry.accept ?? [];
    if (!Array.isArray(accept) || !accept.every((a) => typeof a === "string")) {
      throw new Error(`flags: "accept" for checkpoint ${id} must be an array of strings`);
    }
    const hashes = [];
    for (const answer of [entry.primary, ...accept]) {
      if (!normalizeAnswer(answer)) throw new Error(`flags: checkpoint ${id} has an answer that is empty once normalized`);
      const h = hashFlag(id, answer);
      if (!hashes.includes(h)) hashes.push(h);
    }
    return { id, flag_hash: hashes[0], accepted_hashes: hashes.slice(1) };
  });
}
