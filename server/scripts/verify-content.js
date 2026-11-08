// Validates server/src/data/content/challenges.json against server/private/flags.local.json. No DB needed.
//   npm run verify:content
// Prints PASS/FAIL per check and exits 1 on any failure. Never prints an answer.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CONTENT_FILE = new URL("../src/data/content/challenges.json", import.meta.url);
const FLAGS_FILE = new URL("../private/flags.local.json", import.meta.url);

const EXPECTED_TOTAL_POINTS = 4500;
// The relic inscriptions' first letters spell the final answer. The expected word is read from the flags file
// (never written here: this script is committed).
const relicAcrosticTarget = (flags) => {
  const p = flags?.final?.primary;
  if (typeof p !== "string") return null;
  const m = /^obscura\{([\s\S]*)\}$/i.exec(p.trim());
  return (m ? m[1] : p).replace(/\s+/g, "").toUpperCase();
};
// CP 2.4's telegram: the Cyrillic look-alikes, in order (s, h, e, e, s, h, a).
const EXPECTED_24_NON_ASCII = [0x0455, 0x04bb, 0x0435, 0x0435, 0x0455, 0x04bb, 0x0430];

const results = [];
const check = (name, fn) => {
  try {
    const problems = fn() || [];
    results.push({ name, ok: problems.length === 0, problems });
  } catch (e) {
    results.push({ name, ok: false, problems: [`threw: ${e.message}`] });
  }
};
const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;

const contentText = readFileSync(CONTENT_FILE, "utf8");
const content = JSON.parse(contentText);
const flags = existsSync(FLAGS_FILE) ? JSON.parse(readFileSync(FLAGS_FILE, "utf8")) : null;
const allCps = [...(content.checkpoints ?? []), content.finalBoss].filter(Boolean);

check("structure: 5 acts, 5 relics, 20 checkpoints + finalBoss", () => {
  const p = [];
  if (content.acts?.length !== 5) p.push(`acts: ${content.acts?.length}`);
  if (content.relics?.length !== 5) p.push(`relics: ${content.relics?.length}`);
  if (content.checkpoints?.length !== 20) p.push(`checkpoints: ${content.checkpoints?.length}`);
  if (!content.finalBoss) p.push("finalBoss missing");
  else if (content.finalBoss.id !== "final") p.push(`finalBoss.id is "${content.finalBoss.id}", expected "final"`);
  const ids = allCps.map((c) => c.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) p.push(`duplicate ids: ${dupes.join(", ")}`);
  return p;
});

check("hints: exactly 2 per checkpoint, hint 2 cost = 2 x hint 1 cost, every hint has a teaser and text", () => {
  const p = [];
  for (const cp of allCps) {
    const h = cp.hints ?? [];
    if (h.length !== 2) {
      p.push(`${cp.id}: ${h.length} hints`);
      continue;
    }
    if (!(Number.isInteger(h[0].cost) && h[0].cost > 0)) p.push(`${cp.id}: hint 1 cost ${h[0].cost}`);
    if (h[1].cost !== 2 * h[0].cost) p.push(`${cp.id}: hint costs ${h[0].cost}/${h[1].cost}`);
    h.forEach((x, i) => {
      if (typeof x.teaser !== "string" || !x.teaser.trim()) p.push(`${cp.id}: hint ${i + 1} has no teaser`);
      if (typeof x.text !== "string" || !x.text.trim()) p.push(`${cp.id}: hint ${i + 1} has no text`);
    });
  }
  return p;
});

check("flags.local.json: exactly the same 21 ids, each with a non-empty primary", () => {
  if (!flags) return [`${fileURLToPath(FLAGS_FILE)} not found`];
  const p = [];
  const want = new Set(allCps.map((c) => c.id));
  const have = new Set(Object.keys(flags));
  const missing = [...want].filter((id) => !have.has(id));
  const extra = [...have].filter((id) => !want.has(id));
  if (want.size !== 21) p.push(`content has ${want.size} ids, expected 21`);
  if (missing.length) p.push(`missing in flags: ${missing.join(", ")}`);
  if (extra.length) p.push(`extra in flags: ${extra.join(", ")}`);
  for (const [id, v] of Object.entries(flags)) {
    if (typeof v?.primary !== "string" || !v.primary.trim()) p.push(`${id}: empty primary`);
    if (v?.accept != null && !(Array.isArray(v.accept) && v.accept.every((a) => typeof a === "string" && a.trim()))) {
      p.push(`${id}: accept must be an array of non-empty strings`);
    }
  }
  return p;
});

check("no primary flag string appears anywhere in challenges.json", () => {
  if (!flags) return ["flags file not found"];
  const hay = contentText.toLowerCase();
  // Only ids are reported, never the flag.
  return Object.entries(flags)
    .filter(([, v]) => typeof v?.primary === "string" && hay.includes(v.primary.trim().toLowerCase()))
    .map(([id]) => `${id}: its primary flag string appears in challenges.json`);
});

check('no "organiser"/"organizer" text in challenges.json', () => {
  const m = contentText.match(/organi[sz]er/gi);
  return m ? [`${m.length} occurrence(s)`] : [];
});

check("CP 2.4 body: exact Cyrillic look-alikes in order, and no code fence", () => {
  const cp = content.checkpoints?.find((c) => c.id === "2.4");
  if (!cp) return ["CP 2.4 not found"];
  const p = [];
  const got = [...cp.body].map((ch) => ch.codePointAt(0)).filter((n) => n > 0x7f);
  if (got.join() !== EXPECTED_24_NON_ASCII.join()) {
    p.push(`non-ASCII code points: [${got.map(hex).join(" ")}], expected [${EXPECTED_24_NON_ASCII.map(hex).join(" ")}]`);
  }
  if (/```|~~~/.test(cp.body)) p.push("body contains a code fence");
  return p;
});

check("relic inscriptions (act order): first letters spell the final answer", () => {
  const target = relicAcrosticTarget(flags);
  if (!target) return ["flags file or its \"final\" entry not found"];
  const relics = [...(content.relics ?? [])].sort((a, b) => a.act - b.act);
  const letters = relics.map((r) => String(r.inscription ?? "").trim().charAt(0).toUpperCase()).join("");
  // Report lengths and which positions differ, never the letters themselves.
  if (letters === target) return [];
  const diff = [...target].map((c, i) => (letters[i] === c ? null : i + 1)).filter(Boolean);
  return [`acrostic (${letters.length} letters) does not match the final answer (${target.length}); positions differing: ${diff.join(", ") || "-"}`];
});

check(`total points = ${EXPECTED_TOTAL_POINTS} (20 checkpoints + final)`, () => {
  const total = allCps.reduce((n, c) => n + c.points, 0);
  return total === EXPECTED_TOTAL_POINTS ? [] : [`total is ${total}`];
});

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
  for (const p of r.problems) console.log(`        - ${p}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
