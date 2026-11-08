import { useFinale, useLeaderboard, useTeam } from "../../hooks/useGameData.js";
import { formatDuration, formatPoints } from "../../lib/format.js";
import Button from "../ui/Button.jsx";
import Icon from "../ui/Icon.jsx";

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-gold-soft/40 bg-ink/60 px-4 py-3">
      <dt className="font-type text-[10px] tracking-[0.25em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-heading text-2xl font-bold text-gold tabular-nums">{value}</dd>
    </div>
  );
}

// Shown once the team has solved the final face-off (ChallengesHub, Relics).
// Rank and time taken are omitted when the leaderboard or event start time is unavailable.
export default function VictoryPanel({ className = "", showReelLink = true }) {
  const { finished, timeTakenMs } = useFinale();
  const { team } = useTeam();
  const board = useLeaderboard();
  if (!finished || !team) return null;

  const mine = board.rows.find((r) => r.isYou);
  const rank = mine ? `#${mine.rank} of ${board.rows.length}` : null;

  return (
    <section
      aria-labelledby="victory-heading"
      className={`relative overflow-hidden rounded-card border border-gold bg-[radial-gradient(ellipse_at_top,rgba(217,164,65,0.18),transparent_60%),linear-gradient(135deg,#2a0d0e,#121010)] p-5 shadow-glow-gold sm:p-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold/15 text-gold ring-1 ring-gold/60">
            <Icon name="trophy" className="size-6" />
          </span>
          <div>
            <p className="font-type text-[10px] tracking-[0.3em] text-gold uppercase">Mission complete</p>
            <h2 id="victory-heading" className="font-display text-3xl tracking-wide text-bone uppercase sm:text-4xl">
              Victory
            </h2>
          </div>
        </div>
        {showReelLink && (
          <Button to="/reel/final" variant="outline" size="sm" caps={false}>
            Replay the ending
          </Button>
        )}
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Final score" value={formatPoints(team.points)} />
        {rank && <Stat label="Leaderboard rank" value={rank} />}
        {timeTakenMs != null && <Stat label="Time taken" value={formatDuration(timeTakenMs)} />}
      </dl>
      {board.frozen && rank && (
        <p className="mt-3 text-xs text-muted">The leaderboard is frozen; your final rank is revealed at the end.</p>
      )}
    </section>
  );
}
