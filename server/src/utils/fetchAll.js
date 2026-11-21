// Supabase (PostgREST) returns at most `max-rows` rows per request, 1000 by default, and says nothing when it cuts a
// result short. Any query that reads rows for EVERY team (leaderboard, admin overview, reset, coins) must page.
//
// Keyset paging on the table's unique key, so a row inserted or deleted while we page (a team solving right now)
// can never make a row appear twice or go missing, which OFFSET paging can.
//
//   const solves = await fetchAll(() => db.from("team_solves").select("team_id, cp_id, points"), ["team_id", "cp_id"]);
//
// `build` must return a fresh query each call (filters allowed, no order/range/limit). `keys` must be unique
// together and be selected.
export const PAGE_SIZE = 1000;

// PostgREST filter value, quoted so ids such as "1.1" or "final" can't be misread.
const lit = (v) => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// Rows strictly after `last` in (k1, k2, ...) order:  k1 > a  OR  (k1 = a AND k2 > b)  OR ...
export function afterFilter(keys, last) {
  return keys
    .map((k, i) => {
      const eqs = keys.slice(0, i).map((p) => `${p}.eq.${lit(last[p])}`);
      const gt = `${k}.gt.${lit(last[k])}`;
      return eqs.length ? `and(${[...eqs, gt].join(",")})` : gt;
    })
    .join(",");
}

export async function fetchAll(build, keys, pageSize = PAGE_SIZE) {
  const out = [];
  let last = null;
  for (;;) {
    let q = build();
    for (const k of keys) q = q.order(k, { ascending: true });
    if (last) q = q.or(afterFilter(keys, last));
    const { data, error } = await q.limit(pageSize);
    if (error) throw error;
    out.push(...data);
    if (data.length < pageSize) return out;
    last = data.at(-1);
  }
}
