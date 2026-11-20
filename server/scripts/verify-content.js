// Validates server/src/data/content/challenges.json against server/private/flags.local.json. No DB needed.
//   npm run verify:content
// Prints PASS/FAIL per check and exits 1 on any failure. Never prints an answer.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CONTENT_FILE = new URL("../src/data/content/challenges.json", import.meta.url);
const FLAGS_FILE = new URL("../private/flags.local.json", import.meta.url);

// 5 acts x 3 checkpoints, then the final face-off.
const ACT_COUNT = 5;
const PER_ACT = 3;
const CHECKPOINT_COUNT = ACT_COUNT * PER_ACT;
// Points rise with the act (the final is worth the most); hints are paid in coins at the same price everywhere.
const POINTS_BY_ACT = { 1: 20, 2: 40, 3: 70, 4: 100, 5: 120 };
const FINAL_POINTS = 150;
const HINT_COINS = [10, 15];
const EXPECTED_TOTAL_POINTS = PER_ACT * Object.values(POINTS_BY_ACT).reduce((n, x) => n + x, 0) + FINAL_POINTS;
// The relic inscriptions' first letters spell the final answer. The expected word is read from the flags file
// (never written here: this script is committed).
const relicAcrosticTarget = (flags) => {
  const p = flags?.final?.primary;
  if (typeof p !== "string") return null;
  const m = /^obscura\{([\s\S]*)\}$/i.exec(p.trim());
  return (m ? m[1] : p).replace(/\s+/g, "").toUpperCase();
};

const results = [];
const check = (name, fn) => {
  try {
    const problems = fn() || [];
    results.push({ name, ok: problems.length === 0, problems });
  } catch (e) {
    results.push({ name, ok: false, problems: [`threw: ${e.message}`] });
  }
};

const contentText = readFileSync(CONTENT_FILE, "utf8");
const content = JSON.parse(contentText);
const flags = existsSync(FLAGS_FILE) ? JSON.parse(readFileSync(FLAGS_FILE, "utf8")) : null;
const allCps = [...(content.checkpoints ?? []), content.finalBoss].filter(Boolean);

check(`structure: ${ACT_COUNT} acts, ${ACT_COUNT} relics, ${PER_ACT} checkpoints per act + finalBoss`, () => {
  const p = [];
  if (content.acts?.length !== ACT_COUNT) p.push(`acts: ${content.acts?.length}`);
  if (content.relics?.length !== ACT_COUNT) p.push(`relics: ${content.relics?.length}`);
  if (content.checkpoints?.length !== CHECKPOINT_COUNT) p.push(`checkpoints: ${content.checkpoints?.length}`);
  for (const a of content.acts ?? []) {
    const n = (content.checkpoints ?? []).filter((c) => c.act === a.id).length;
    if (n !== PER_ACT) p.push(`act ${a.id}: ${n} checkpoints`);
  }
  if (!content.finalBoss) p.push("finalBoss missing");
  else if (content.finalBoss.id !== "final") p.push(`finalBoss.id is "${content.finalBoss.id}", expected "final"`);
  const ids = allCps.map((c) => c.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) p.push(`duplicate ids: ${dupes.join(", ")}`);
  return p;
});

check(`hints: exactly 2 per checkpoint costing ${HINT_COINS.join(" and ")} coins, every hint has a teaser and text`, () => {
  const p = [];
  for (const cp of allCps) {
    const h = cp.hints ?? [];
    if (h.length !== 2) {
      p.push(`${cp.id}: ${h.length} hints`);
      continue;
    }
    if (h[0].cost !== HINT_COINS[0] || h[1].cost !== HINT_COINS[1]) p.push(`${cp.id}: hint costs ${h[0].cost}/${h[1].cost}`);
    h.forEach((x, i) => {
      if (typeof x.teaser !== "string" || !x.teaser.trim()) p.push(`${cp.id}: hint ${i + 1} has no teaser`);
      if (typeof x.text !== "string" || !x.text.trim()) p.push(`${cp.id}: hint ${i + 1} has no text`);
    });
  }
  return p;
});

check(`flags.local.json: exactly the same ${CHECKPOINT_COUNT + 1} ids, each with a non-empty primary`, () => {
  if (!flags) return [`${fileURLToPath(FLAGS_FILE)} not found`];
  const p = [];
  const want = new Set(allCps.map((c) => c.id));
  const have = new Set(Object.keys(flags));
  const missing = [...want].filter((id) => !have.has(id));
  const extra = [...have].filter((id) => !want.has(id));
  if (want.size !== CHECKPOINT_COUNT + 1) p.push(`content has ${want.size} ids, expected ${CHECKPOINT_COUNT + 1}`);
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

check("CP 1.1 body still shows its HTML as literal text", () => {
  const cp = content.checkpoints?.find((c) => c.id === "1.1");
  if (!cp) return ["CP 1.1 not found"];
  return cp.body.includes("<") ? [] : ["no HTML found in CP 1.1"];
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

check(`points: ${Object.values(POINTS_BY_ACT).join("/")} by act, final ${FINAL_POINTS}, ${EXPECTED_TOTAL_POINTS} in total`, () => {
  const want = (c) => (c.id === "final" ? FINAL_POINTS : POINTS_BY_ACT[c.act]);
  const p = allCps.filter((c) => c.points !== want(c)).map((c) => `${c.id}: ${c.points} points, expected ${want(c)}`);
  const total = allCps.reduce((n, c) => n + c.points, 0);
  if (total !== EXPECTED_TOTAL_POINTS) p.push(`total is ${total}`);
  return p;
});

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
  for (const p of r.problems) console.log(`        - ${p}`);
  if (!r.ok) failed++;
}
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
