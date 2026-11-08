// Seed script. Run after supabase/schema.sql (and supabase/migrations/*).
//
//   npm run db:seed:flags              ONLY upserts the `checkpoints` table (flag hashes). Safe on the live DB:
//                                      no teams, no event clock, no resets.
//   npm run db:seed                    checkpoints + DEV test teams (team1..team3 / 1234). Leaves the clock alone.
//   npm run db:seed -- --start-clock   also (re)starts the event clock: running, from now.
//   npm run db:seed -- --reset         also wipes ALL team progress (solves, hints, relics, submissions).
//
// Flags come from server/private/flags.local.json (gitignored). Hashes are keyed with FLAG_PEPPER, which must
// be the SAME value the deployed API uses, or no flag will ever match.
import { fileURLToPath } from "node:url";
import { requireDb } from "../src/config/supabase.js";
import { env } from "../src/config/env.js";
import { CHECKPOINTS } from "../src/data/game.js";
import { buildCheckpointRows, FLAGS_FILE, loadFlagsFile } from "../src/utils/flagRows.js";
import { hashPassword } from "../src/utils/password.js";

const args = new Set(process.argv.slice(2));
const FLAGS_ONLY = args.has("--flags-only");
const RESET = args.has("--reset");
const START_CLOCK = args.has("--start-clock");

const DEV_FLAG = "OBSCURA{test}"; // used for every checkpoint ONLY when flags.local.json is missing
const TEAMS = [
  { name: "Team 1", team_code: "team1", password: "1234" },
  { name: "Team 2", team_code: "team2", password: "1234" },
  { name: "Team 3", team_code: "team3", password: "1234" },
];

if (FLAGS_ONLY && (RESET || START_CLOCK)) {
  console.error("--flags-only cannot be combined with --reset or --start-clock. Run them separately.");
  process.exit(1);
}
if (!env.flagPepperIsSet) {
  console.error("FLAG_PEPPER is not set. Hashes made with the dev fallback would not match the deployed API.");
  console.error("Set FLAG_PEPPER in the repo-root .env to the same value as on Vercel, then re-run.");
  process.exit(1);
}

const db = requireDb();
const check = ({ error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

// ---------- Flags ----------
const ids = CHECKPOINTS.map((cp) => cp.id); // 20 act checkpoints + "final" (already the last entry)
let flags = loadFlagsFile();
if (!flags) {
  const bar = "!".repeat(78);
  console.warn(`\n${bar}\n!! ${fileURLToPath(FLAGS_FILE)} NOT FOUND.`);
  console.warn(`!! Every checkpoint (including "final") will accept the DEV flag ${DEV_FLAG}.`);
  console.warn(`!! Do NOT do this on the live database.\n${bar}\n`);
  flags = Object.fromEntries(ids.map((id) => [id, { primary: DEV_FLAG, accept: [] }]));
} else {
  const extra = Object.keys(flags).filter((id) => !ids.includes(id));
  if (extra.length) console.warn(`flags.local.json has ids with no checkpoint in the content (ignored): ${extra.join(", ")}`);
}
const rows = buildCheckpointRows(ids, flags); // throws if any checkpoint has no answer

if (RESET) {
  for (const table of ["team_solves", "team_hints", "team_relics", "submissions"]) {
    check(await db.from(table).delete().not("team_id", "is", null), `reset ${table}`);
  }
  console.log("Cleared all team progress.");
}

check(await db.from("checkpoints").upsert(rows), "checkpoints");
const extraHashes = rows.reduce((n, r) => n + r.accepted_hashes.length, 0);
console.log(`Checkpoints: ${rows.length} rows upserted (${ids.join(", ")}), ${extraHashes} alternative answers.`);

if (FLAGS_ONLY) process.exit(0);

// ---------- DEV teams ----------
check(
  await db.from("teams").upsert(
    TEAMS.map(({ password, ...t }) => ({ ...t, password_hash: hashPassword(password) })),
    { onConflict: "team_code" }
  ),
  "teams"
);
console.log(`Teams: ${TEAMS.map((t) => `${t.team_code} / ${t.password}`).join(", ")}`);

// ---------- Event clock ----------
if (START_CLOCK) {
  check(
    await db.from("event_state").upsert({
      id: 1,
      status: "running",
      started_at: new Date().toISOString(),
      paused_at: null,
      total_paused_ms: 0,
    }),
    "event_state"
  );
  console.log("Event clock: running, started now.");
} else {
  console.log("Event clock: unchanged (pass --start-clock to restart it).");
}
