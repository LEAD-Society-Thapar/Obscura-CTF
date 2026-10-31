import { useLeaderboard } from "../hooks/useGameData.js";
import Icon from "../components/ui/Icon.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";

// No design yet: simple themed table. Live scores; frozen for the last 20 minutes.
export default function Leaderboard() {
  const { loading, error, rows, frozen } = useLeaderboard();

  return (
    <section aria-labelledby="board-heading" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-0">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <h1 id="board-heading" className="font-display text-4xl tracking-wide text-bone uppercase">
          Leaderboard
        </h1>
        <p className="font-type text-xs text-muted">
          {frozen ? "Frozen: final scores revealed at the end." : "Live. Freezes for the last 20 minutes."}
        </p>
      </header>

      {loading || error ? (
        <PageStatus loading={loading} error={error} />
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
                <tr key={r.teamId} className={r.isYou ? "bg-blood-deep/40" : ""} aria-current={r.isYou || undefined}>
                  <td className="px-4 py-3 font-type text-gold">
                    <span className="inline-flex items-center gap-1.5">
                      {r.rank === 1 && <Icon name="trophy" className="size-4" />}#{r.rank}
                    </span>
                  </td>
                  <th scope="row" className="px-4 py-3 font-heading font-semibold text-bone">
                    {r.team}
                    {r.isYou && <span className="ml-2 text-xs font-normal text-blood-bright">(you)</span>}
                  </th>
                  <td className="px-4 py-3 text-right text-muted tabular-nums">{r.solved}</td>
                  <td className="px-4 py-3 text-right font-heading font-bold text-gold tabular-nums">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
