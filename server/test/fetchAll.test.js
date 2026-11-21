import { test } from "node:test";
import assert from "node:assert/strict";
import { afterFilter, fetchAll } from "../src/utils/fetchAll.js";

test("afterFilter builds a keyset condition over composite keys", () => {
  assert.equal(afterFilter(["id"], { id: 41 }), 'id.gt."41"');
  assert.equal(
    afterFilter(["team_id", "cp_id"], { team_id: "t1", cp_id: "1.1" }),
    'team_id.gt."t1",and(team_id.eq."t1",cp_id.gt."1.1")'
  );
  assert.equal(
    afterFilter(["a", "b", "c"], { a: 1, b: "x", c: 3 }),
    'a.gt."1",and(a.eq."1",b.gt."x"),and(a.eq."1",b.eq."x",c.gt."3")'
  );
});

// A tiny fake of the supabase query builder over an in-memory table, honouring order / or / limit.
function fakeTable(rows, cap) {
  return () => {
    const q = { orders: [], after: null, n: cap };
    const api = {
      order(k) {
        q.orders.push(k);
        return api;
      },
      or(filter) {
        q.after = filter;
        return api;
      },
      limit(n) {
        q.n = Math.min(n, cap); // the server-side max-rows cap
        return Promise.resolve({ data: run(), error: null });
      },
    };
    const cmp = (a, b) => {
      for (const k of q.orders) if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1;
      return 0;
    };
    const run = () => {
      let out = [...rows].sort(cmp);
      if (q.after) {
        const last = Object.fromEntries(q.orders.map((k) => [k, String(q.after.match(new RegExp(`${k}\\.(?:gt|eq)\\."([^"]*)"`))[1])]));
        out = out.filter((r) => cmp(r, Object.fromEntries(q.orders.map((k) => [k, typeof r[k] === "number" ? Number(last[k]) : last[k]]))) > 0);
      }
      return out.slice(0, q.n);
    };
    return api;
  };
}

test("fetchAll returns every row past the 1000-row cap, each exactly once", async () => {
  const rows = [];
  for (let t = 0; t < 300; t++) for (const cp of ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "3.1", "final"]) rows.push({ team_id: `t${String(t).padStart(3, "0")}`, cp_id: cp });
  assert.equal(rows.length, 2400);
  const got = await fetchAll(fakeTable(rows, 1000), ["team_id", "cp_id"]);
  assert.equal(got.length, 2400);
  assert.equal(new Set(got.map((r) => `${r.team_id}|${r.cp_id}`)).size, 2400);
});

test("fetchAll with fewer rows than a page makes one request", async () => {
  let calls = 0;
  const table = fakeTable([{ id: 1 }, { id: 2 }], 1000);
  const got = await fetchAll(() => {
    calls += 1;
    return table();
  }, ["id"]);
  assert.deepEqual(got, [{ id: 1 }, { id: 2 }]);
  assert.equal(calls, 1);
});
