// Wipes the progress of the named teams only: solves, hints, relics and submissions. Teams, passwords, flags and
// the event clock are not touched. Use it after test runs, e.g. to clean the TEST-LEAD teams before the event.
//
//   npm run db:clear-progress -- TEST-LEAD-1 TEST-LEAD-2 TEST-LEAD-3
//
// Team IDs must be given explicitly (there is no "all" option on purpose).
import { requireDb } from "../src/config/supabase.js";

const codes = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (codes.length === 0) {
  console.error("Name the teams to clear, e.g.  npm run db:clear-progress -- TEST-LEAD-1 TEST-LEAD-2");
  process.exit(2);
}

const db = requireDb();
const rowsOf = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const teams = rowsOf(await db.from("teams").select("id, team_code").in("team_code", codes));
const unknown = codes.filter((c) => !teams.some((t) => t.team_code === c));
if (unknown.length) {
  console.error(`No such team: ${unknown.join(", ")} (Team IDs are case-sensitive). Nothing was cleared.`);
  process.exit(1);
}

const ids = teams.map((t) => t.id);
for (const table of ["team_solves", "team_hints", "team_relics", "submissions"]) {
  const gone = rowsOf(await db.from(table).delete().in("team_id", ids).select("team_id"));
  console.log(`${table}: ${gone.length} rows deleted`);
}
console.log(`Cleared progress for ${codes.join(", ")}.`);
