// Creates (or updates) the event teams. Safe to re-run: it never touches progress, flags or the event clock.
//
//   npm run db:teams                          create/update TEST-LEAD-1..3 and participant-1..20
//   npm run db:teams -- --remove-dev-teams    also delete the dev teams team1..team3 AND all their progress
//   npm run db:teams -- --rotate              give every team a new password
//
// Passwords are generated once and kept in server/private/teams.local.json (+ teams.local.csv for printing).
// That folder is gitignored. A re-run reuses the saved passwords unless --rotate is passed.
// Team ID (what a team types on the login screen) = team_code. It is case-sensitive.
import crypto from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { requireDb } from "../src/config/supabase.js";
import { hashPassword } from "../src/utils/password.js";

const args = new Set(process.argv.slice(2));
const REMOVE_DEV = args.has("--remove-dev-teams");
const ROTATE = args.has("--rotate");

const DEV_TEAM_CODES = ["team1", "team2", "team3"];
const TEAM_CODES = [
  ...[1, 2, 3].map((n) => `TEST-LEAD-${n}`),
  ...Array.from({ length: 20 }, (_, i) => `participant-${i + 1}`),
];

const PRIVATE_DIR = new URL("../private/", import.meta.url);
const JSON_FILE = new URL("teams.local.json", PRIVATE_DIR);
const CSV_FILE = new URL("teams.local.csv", PRIVATE_DIR);

// No look-alike characters (0/O, 1/l/I), so a password survives being read off a printed slip.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const newPassword = () => Array.from({ length: 10 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join("");

const db = requireDb();
const check = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
};

if (REMOVE_DEV) {
  const gone = check(await db.from("teams").delete().in("team_code", DEV_TEAM_CODES).select("team_code"), "remove dev teams");
  console.log(`Removed dev teams (and their progress): ${gone.map((t) => t.team_code).join(", ") || "none found"}`);
}

const saved = !ROTATE && existsSync(JSON_FILE) ? JSON.parse(readFileSync(JSON_FILE, "utf8")) : {};
const passwords = Object.fromEntries(TEAM_CODES.map((code) => [code, saved[code] || newPassword()]));

check(
  await db.from("teams").upsert(
    TEAM_CODES.map((code) => ({ name: code, team_code: code, password_hash: hashPassword(passwords[code]) })),
    { onConflict: "team_code" }
  ),
  "teams"
);

mkdirSync(PRIVATE_DIR, { recursive: true });
writeFileSync(JSON_FILE, `${JSON.stringify(passwords, null, 2)}\n`);
writeFileSync(CSV_FILE, `team_id,password\n${TEAM_CODES.map((code) => `${code},${passwords[code]}`).join("\n")}\n`);

const all = check(await db.from("teams").select("team_code").order("team_code"), "list teams");
console.log(`Upserted ${TEAM_CODES.length} teams: ${TEAM_CODES[0]} .. ${TEAM_CODES[2]}, ${TEAM_CODES[3]} .. ${TEAM_CODES.at(-1)}`);
console.log(`Teams now in the database (${all.length}): ${all.map((t) => t.team_code).join(", ")}`);
console.log(`Passwords saved to ${fileURLToPath(JSON_FILE)} and ${fileURLToPath(CSV_FILE)} (gitignored).`);
