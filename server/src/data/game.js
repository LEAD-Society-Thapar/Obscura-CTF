// Static game content served by the API, loaded from ./content/challenges.json.
// NO flags here: flag hashes live in the `checkpoints` table (written by scripts/seed.js from
// server/private/flags.local.json, which is gitignored).
//
// Content strings are passed through exactly as written in the JSON: never trim, normalize or re-type
// them (CP 2.4 relies on Cyrillic look-alike letters, CP 1.1 shows HTML that must stay literal text).
// Art slot names are derived from ids; see client/src/lib/artSlots.js for the slot registry.
import content from "./content/challenges.json" with { type: "json" };

function fail(message) {
  throw new Error(`[content] challenges.json: ${message}`);
}

const toHint = (h) => ({ id: h.id, cost: h.cost, teaser: h.teaser, text: h.text });

// Same shape the API has always used, plus `body` (markdown-subset challenge text).
function toCheckpoint(cp, { act = cp.act, index = cp.index, slotKey = `${cp.act}-${cp.index}` } = {}) {
  return {
    id: cp.id,
    act,
    index,
    title: cp.title,
    category: cp.category,
    points: cp.points,
    story: cp.story,
    body: cp.body,
    posterSlot: `cp-${slotKey}-poster`,
    downloads: cp.downloads ?? [],
    hints: cp.hints.map(toHint),
    reel: {
      quote: cp.reel.quote,
      clue: cp.reel.clue,
      frameSlot: `reel-${slotKey}`,
    },
  };
}

export const STORY = content.story;

export const ACTS = content.acts.map((a) => ({
  id: a.id,
  title: a.title,
  film: a.film,
  blurb: a.blurb,
  coverSlot: `act-${a.id}-cover`,
  bannerSlot: `act-${a.id}-banner`,
  relicId: a.relicId,
}));

// The last checkpoint of an act grants that act's relic.
export const RELICS = content.relics.map((r) => ({
  id: r.id,
  name: r.name,
  act: r.act,
  slot: `relic-${r.id}`,
  inscription: r.inscription,
  lore: r.lore,
}));

// The final face-off. act: null keeps it out of every act (map, per-act counts, relic awards).
// It is only reachable once the team holds every relic (see TeamState in services/teamState.js).
export const FINAL_BOSS = toCheckpoint(content.finalBoss, { act: null, index: null, slotKey: "final" });

// The 20 act checkpoints, in unlock order.
export const ACT_CHECKPOINTS = content.checkpoints.map((cp) => toCheckpoint(cp));

// Order in this array = unlock order: the 20 act checkpoints, then the final face-off as the 21st gate.
// Each id needs a row in the `checkpoints` table (npm run db:seed:flags).
export const CHECKPOINTS = [...ACT_CHECKPOINTS, FINAL_BOSS];

export const RULES = content.rules;

// ---------- Load-time sanity checks (fail fast on a broken content file) ----------
{
  const actIds = new Set(ACTS.map((a) => a.id));
  const relicIds = new Set(RELICS.map((r) => r.id));
  const seen = new Set();
  let prev = null;

  if (FINAL_BOSS.id !== "final") fail(`finalBoss.id must be "final"`);
  if (CHECKPOINTS.at(-1) !== FINAL_BOSS) fail("the final boss must be the last gate");
  for (const cp of CHECKPOINTS) {
    if (typeof cp.id !== "string" || !cp.id) fail("a checkpoint has no string id");
    if (seen.has(cp.id)) fail(`duplicate checkpoint id ${cp.id}`);
    seen.add(cp.id);
    if (!Number.isInteger(cp.points)) fail(`${cp.id}: points must be an integer`);
    if (typeof cp.story !== "string" || typeof cp.body !== "string") fail(`${cp.id}: story and body must be strings`);
    if (!cp.hints.every((h, i) => h.id === i + 1 && Number.isInteger(h.cost))) {
      fail(`${cp.id}: hints must have ids 1..n in order and integer costs`);
    }
  }
  for (const cp of ACT_CHECKPOINTS) {
    if (!actIds.has(cp.act)) fail(`${cp.id}: unknown act ${cp.act}`);
    if (cp.id !== `${cp.act}.${cp.index}`) fail(`${cp.id}: id must be "<act>.<index>"`);
    if (prev && (cp.act < prev.act || (cp.act === prev.act && cp.index !== prev.index + 1))) {
      fail(`${cp.id}: checkpoints must be listed in unlock order`);
    }
    prev = cp;
  }
  for (const a of ACTS) {
    if (!relicIds.has(a.relicId)) fail(`act ${a.id}: unknown relicId ${a.relicId}`);
    if (!ACT_CHECKPOINTS.some((c) => c.act === a.id)) fail(`act ${a.id} has no checkpoints`);
  }
}
