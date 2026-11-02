// DEV seed: test teams, flag hashes for every checkpoint in data/game.js, and a fresh 90-minute clock.
// Run after supabase/schema.sql:   npm run db:seed            (from the repo root or server/)
//                                  npm run db:seed -- --reset (also wipes all team progress)
// Safe to re-run. Replace the test teams and DEV_FLAG with real values before the event.
import { requireDb } from "../src/config/supabase.js";
import { CHECKPOINTS } from "../src/data/game.js";
import { hashFlag } from "../src/utils/gate.js";
import { hashPassword } from "../src/utils/password.js";

const DEV_FLAG = "OBSCURA{test}"; // accepted at every checkpoint
const TEAMS = [
  { name: "Team 1", team_code: "team1", password: "1234" },
  { name: "Team 2", team_code: "team2", password: "1234" },
  { name: "Team 3", team_code: "team3", password: "1234" },
];

const db = requireDb();
const check = ({ error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

if (process.argv.includes("--reset")) {
  for (const table of ["team_solves", "team_hints", "team_relics", "submissions"]) {
    check(await db.from(table).delete().not("team_id", "is", null), `reset ${table}`);
  }
  console.log("Cleared all team progress.");
}

check(
  await db.from("checkpoints").upsert(CHECKPOINTS.map((cp) => ({ id: cp.id, flag_hash: hashFlag(DEV_FLAG) }))),
  "checkpoints"
);
console.log(`Checkpoints: ${CHECKPOINTS.length} (flag for all: ${DEV_FLAG})`);

check(
  await db.from("teams").upsert(
    TEAMS.map(({ password, ...t }) => ({ ...t, password_hash: hashPassword(password) })),
    { onConflict: "team_code" }
  ),
  "teams"
);
console.log(`Teams: ${TEAMS.map((t) => `${t.team_code} / ${t.password}`).join(", ")}`);

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
console.log("Event clock: running, 90 minutes from now.");
