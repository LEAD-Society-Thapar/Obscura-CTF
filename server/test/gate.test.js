// Flag engine tests: node --test (from server/) or npm test (from the repo root).
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.FLAG_PEPPER ??= "test-pepper";
const { normalizeAnswer, hashFlag, flagMatches } = await import("../src/utils/gate.js");
const { buildCheckpointRows, loadFlagsFile } = await import("../src/utils/flagRows.js");

test("normalizeAnswer: wrapper, case and whitespace", () => {
  const same = ["OBSCURA{ A B E F }", "abef", "ABEF", "obscura{abef}", "  ObScUrA{AbEf}  ", "a b\te\nf", "OBSCURA{abef}\n"];
  for (const s of same) assert.equal(normalizeAnswer(s), "abef", JSON.stringify(s));
});

test("normalizeAnswer: punctuation is kept", () => {
  assert.equal(normalizeAnswer("87%"), "87%");
  assert.equal(normalizeAnswer("OBSCURA{87%}"), "87%");
  assert.equal(normalizeAnswer(".87"), ".87");
  assert.notEqual(normalizeAnswer(".87"), normalizeAnswer("87"));
  assert.notEqual(normalizeAnswer("87%"), normalizeAnswer("87"));
});

test("normalizeAnswer: multi-word answers", () => {
  assert.equal(normalizeAnswer("mogambo dukhi hua"), "mogambodukhihua");
  assert.equal(normalizeAnswer("OBSCURA{Mogambo Dukhi Hua}"), "mogambodukhihua");
  assert.equal(normalizeAnswer("MOGAMBO   DUKHI HUA"), "mogambodukhihua"); // non-breaking space
});

test("normalizeAnswer: wrong or partial wrappers are not stripped", () => {
  assert.equal(normalizeAnswer("SAT{abef}"), "sat{abef}");
  assert.equal(normalizeAnswer("OBSCURA(abef)"), "obscura(abef)");
  assert.equal(normalizeAnswer("OBSCURA{abef"), "obscura{abef");
  assert.equal(normalizeAnswer("abef}"), "abef}");
  assert.equal(normalizeAnswer("xOBSCURA{abef}"), "xobscura{abef}");
  assert.equal(normalizeAnswer("OBSCURA{{abef}}"), "{abef}"); // only ONE wrapper is removed
  assert.equal(normalizeAnswer("OBSCURA{}"), "");
});

test("normalizeAnswer: NFC, and Cyrillic look-alikes stay distinct from Latin", () => {
  assert.equal(normalizeAnswer("café"), normalizeAnswer("café")); // e + combining acute == é
  assert.notEqual(normalizeAnswer("аbef"), normalizeAnswer("abef")); // Cyrillic а vs Latin a
});

test("normalizeAnswer: non-string input", () => {
  assert.equal(normalizeAnswer(undefined), "");
  assert.equal(normalizeAnswer(null), "");
  assert.equal(normalizeAnswer(42), "42");
});

test("hashFlag: keyed per checkpoint, equal for equivalent answers", () => {
  assert.match(hashFlag("1.1", "x"), /^[0-9a-f]{64}$/);
  assert.equal(hashFlag("1.1", "OBSCURA{ A B E F }"), hashFlag("1.1", "abef"));
  assert.notEqual(hashFlag("1.1", "abef"), hashFlag("1.2", "abef"));
});

test("flagMatches: primary or any accepted hash, nothing else", () => {
  const stored = [hashFlag("2.1", "OBSCURA{one}"), hashFlag("2.1", "two"), hashFlag("2.1", "three")];
  assert.ok(flagMatches("2.1", "ONE", stored));
  assert.ok(flagMatches("2.1", "OBSCURA{ two }", stored));
  assert.ok(flagMatches("2.1", "three", stored));
  assert.ok(!flagMatches("2.1", "four", stored));
  assert.ok(!flagMatches("2.2", "one", stored)); // same answer, wrong checkpoint
  assert.ok(!flagMatches("2.1", "one", [])); // no hashes stored
  assert.ok(!flagMatches("2.1", "one", [null, "", "zz", undefined])); // junk in the column
});

test("buildCheckpointRows: primary first, de-duplicated accepts, errors on gaps", () => {
  const [row] = buildCheckpointRows(["3.1"], { "3.1": { primary: "OBSCURA{Alpha}", accept: ["alpha", "beta"] } });
  assert.equal(row.flag_hash, hashFlag("3.1", "alpha"));
  assert.deepEqual(row.accepted_hashes, [hashFlag("3.1", "beta")]); // "alpha" == primary once normalized
  assert.throws(() => buildCheckpointRows(["3.2"], {}), /no "primary"/);
  assert.throws(() => buildCheckpointRows(["3.3"], { "3.3": { primary: "OBSCURA{ }" } }), /empty/);
});

const flags = loadFlagsFile();

test("flags.local.json: every answer verifies at its own checkpoint and nowhere else", { skip: !flags && "server/private/flags.local.json not present" }, () => {
  const ids = Object.keys(flags);
  const rows = new Map(buildCheckpointRows(ids, flags).map((r) => [r.id, [r.flag_hash, ...r.accepted_hashes]]));
  let checked = 0;
  for (const id of ids) {
    const answers = [flags[id].primary, ...(flags[id].accept ?? [])];
    for (const a of answers) {
      assert.ok(flagMatches(id, a, rows.get(id)), `${id}: an accepted answer does not verify`);
      checked++;
    }
    for (const other of ids) {
      if (other === id) continue;
      assert.ok(!flagMatches(id, flags[other].primary, rows.get(id)), `${id}: the primary answer of ${other} verifies here`);
    }
  }
  assert.ok(checked >= ids.length);
});
