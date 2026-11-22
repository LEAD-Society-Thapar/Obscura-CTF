import { useFinale, useRelics, useTeam } from "../hooks/useGameData.js";
import { formatCp, formatDuration, formatPoints, isFinalCp } from "../lib/format.js";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";

const HEADLINE = {
  victory: { text: "Victory. Mogambo is defeated and the Archive is restored.", tone: "text-gold" },
  defeat: { text: "Mogambo escaped. Your team used every attempt on the final face-off.", tone: "text-blood-bright" },
  timeUp: { text: "Time ran out before the final face-off was won.", tone: "text-blood-bright" },
};

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Stat({ label, value, detail }) {
  return (
    <div className="rounded-card border border-line bg-ink/60 px-4 py-3">
      <dt className="font-type text-[10px] tracking-[0.25em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-heading text-2xl font-bold text-bone tabular-nums">{value}</dd>
      {detail && <dd className="mt-0.5 text-xs text-muted">{detail}</dd>}
    </div>
  );
}

// What happened on one checkpoint, in words.
function resultOf(c) {
  if (c.status === "solved") return c.wrongAnswers ? `Solved after ${plural(c.wrongAnswers, "wrong answer")}` : "Solved first try";
  if (c.status === "failed") return `Missed: ${plural(c.wrongAnswers, "wrong answer")}`;
  return "Not reached";
}

function ResultIcon({ status }) {
  if (status === "solved") return <Icon name="check" className="size-4 shrink-0 text-gold" />;
  if (status === "failed") return <Icon name="close" className="size-4 shrink-0 text-blood-bright" />;
  return <Icon name="lock" className="size-4 shrink-0 text-muted" />;
}

const cpLabel = (c) => (isFinalCp(c) ? "Final" : formatCp(c));

// The final report: the same for every team once its hunt is over (victory, final missed, or time up).
// Built from /progress `report` (server/src/services/teamState.js report()). Never shows answers.
export default function FinalReport() {
  const { loading, error, team, stats } = useTeam();
  const { outcome, report, timeTakenMs } = useFinale();
  const { collected, total } = useRelics();

  if (loading || error) return <PageStatus loading={loading} error={error} label="Compiling your final report" />;

  if (!outcome) {
    return (
      <section className="mx-auto max-w-xl rounded-card border border-line bg-ink-soft/90 p-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-bone">Your hunt is still on</h1>
        <p className="mt-2 text-muted">The final report opens once your team has faced Mogambo or the clock runs out.</p>
        <Button to="/challenges" size="sm" caps={false} className="mt-5">
          Back to your dossier
        </Button>
      </section>
    );
  }

  const rows = report?.checkpoints ?? [];
  const wrongRows = rows.filter((c) => c.wrongAnswers > 0 || c.status === "failed");
  const totalPoints = rows.reduce((n, c) => n + c.points, 0);
  const headline = HEADLINE[outcome];
  const faceOff = outcome === "victory" ? "Won" : outcome === "defeat" ? "Lost" : "Not won";

  return (
    <article aria-labelledby="report-heading" className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-card border border-gold-soft/40 bg-ink-soft/90 p-5 sm:p-6">
        <p className="font-type text-xs tracking-[0.3em] text-gold uppercase">Final report &middot; Case closed</p>
        <h1 id="report-heading" className="mt-1 font-display text-4xl tracking-wide break-words text-bone uppercase sm:text-5xl">
          {team.name}
        </h1>
        <p className={`mt-2 font-heading text-lg font-semibold ${headline.tone}`}>{headline.text}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total points" value={formatPoints(team.points)} detail={totalPoints ? `of ${totalPoints} possible` : null} />
          <Stat label="Time taken" value={timeTakenMs != null ? formatDuration(timeTakenMs) : "—"} />
          <Stat label="Solved" value={`${stats.solved}/${stats.totalCheckpoints}`} detail={`${plural(stats.missed, "checkpoint")} missed`} />
          <Stat label="Wrong answers" value={report ? report.wrongAnswers : "—"} />
          <Stat label="Hints used" value={stats.hintsUsed} detail={`${stats.coinsSpent} coins spent`} />
          <Stat label="Coins left" value={team.coins ? `${team.coins.left}/${team.coins.total}` : "—"} />
          <Stat label="Relics" value={`${collected}/${total}`} />
          <Stat label="Final face-off" value={faceOff} />
        </dl>
      </header>

      {report && (
        <section aria-labelledby="wrong-heading" className="rounded-card border border-line bg-ink-soft/90 p-5 sm:p-6">
          <h2 id="wrong-heading" className="font-heading text-xl font-bold text-bone">
            Questions answered incorrectly
          </h2>
          {wrongRows.length === 0 ? (
            <p className="mt-3 text-muted">None. Every answer your team submitted was right.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {wrongRows.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <ResultIcon status={c.status} />
                    <span className="font-type text-sm text-gold">{cpLabel(c)}</span>
                    <span className="truncate text-bone">{c.title}</span>
                  </span>
                  <span className={`text-sm ${c.status === "failed" ? "text-blood-bright" : "text-muted"}`}>
                    {resultOf(c)} &middot; {formatPoints(c.pointsEarned)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {report && (
        <section aria-labelledby="all-heading" className="rounded-card border border-line bg-ink-soft/90 p-5 sm:p-6">
          <h2 id="all-heading" className="font-heading text-xl font-bold text-bone">
            Every checkpoint
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="font-type text-[10px] tracking-[0.2em] text-muted uppercase">
                <tr>
                  <th className="py-2 pr-3 font-normal">Checkpoint</th>
                  <th className="py-2 pr-3 font-normal">Result</th>
                  <th className="py-2 pr-3 text-right font-normal">Points</th>
                  <th className="py-2 pr-3 text-right font-normal">Wrong</th>
                  <th className="py-2 text-right font-normal">Hints</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3">
                      <span className="font-type text-gold">{cpLabel(c)}</span> <span className="text-bone">{c.title}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-1.5 text-bone/90">
                        <ResultIcon status={c.status} /> {resultOf(c)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-bone tabular-nums">
                      {c.pointsEarned}/{c.points}
                    </td>
                    <td className="py-2 pr-3 text-right text-bone tabular-nums">{c.wrongAnswers}</td>
                    <td className="py-2 text-right text-bone tabular-nums">{c.hintsUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Button to="/challenges" size="md" caps={false}>
          Back to your dossier
        </Button>
        {outcome === "victory" && (
          <Button to="/reel/final" variant="outline" size="md" caps={false}>
            Replay the ending
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">Final standings are revealed by the organisers when the hunt ends.</p>
    </article>
  );
}
