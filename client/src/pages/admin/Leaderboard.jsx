import { useCallback, useEffect, useState } from "react";
import { adminLeaderboard } from "../../api/endpoints.js";
import Button from "../../components/ui/Button.jsx";
import Icon from "../../components/ui/Icon.jsx";
import PageStatus from "../../components/ui/PageStatus.jsx";

const REFRESH_MS = 10_000;

// Admin only (/admin/leaderboard): teams never see other teams' scores or ranks. Built to be put on the projector
// for the winners reveal. Live; refreshes every 10 s.
export default function Leaderboard() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    adminLeaderboard().then(
      (d) => {
        setRows(d.rows ?? []);
        setError(null);
      },
      (e) => setError(e)
    );
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <section aria-labelledby="board-heading" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-type text-xs tracking-[0.25em] text-gold-soft uppercase">OBSCURA / organisers only</p>
          <h1 id="board-heading" className="font-display text-4xl tracking-wide text-bone uppercase">
            Leaderboard
          </h1>
        </div>
        <Button to="/admin" size="sm" variant="ghost" caps={false}>
          Back to Projection Room
        </Button>
      </header>
      <p className="mt-2 font-type text-xs text-muted">
        Live, refreshed every 10 s. Ties go to the team whose last solve came first.
      </p>

      {!rows ? (
        <PageStatus loading={!error} error={error} />
      ) : (
        <div className="panel-dark mt-6 overflow-x-auto">
          <table className="w-full text-left">
            <caption className="sr-only">Team rankings by points</caption>
            <thead className="border-b border-line font-heading text-sm text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Rank
                </th>
                <th scope="col" className="px-4 py-3">
                  Team
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Solved
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {rows.map((r) => (
                <tr key={r.teamId}>
                  <td className="px-4 py-3 font-type text-gold">
                    <span className="inline-flex items-center gap-1.5">
                      {r.rank === 1 && <Icon name="trophy" className="size-4" />}#{r.rank}
                    </span>
                  </td>
                  <th scope="row" className="px-4 py-3 font-heading font-semibold text-bone">
                    {r.team}
                  </th>
                  <td className="px-4 py-3 text-right text-muted tabular-nums">{r.solved}</td>
                  <td className="px-4 py-3 text-right font-heading font-bold text-gold tabular-nums">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && error && <p className="mt-3 text-xs text-blood-bright">Refresh failed; showing the last standings.</p>}
    </section>
  );
}
