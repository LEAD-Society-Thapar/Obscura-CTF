import { Link } from "react-router-dom";
import { useActivity, useActs, useRelics, useTeam } from "../hooks/useGameData.js";
import { formatCp, formatPoints } from "../lib/format.js";
import ActivityFeed from "../components/game/ActivityFeed.jsx";
import RelicCard from "../components/game/RelicCard.jsx";
import TeamAvatar from "../components/game/TeamAvatar.jsx";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import StatTile from "../components/ui/StatTile.jsx";

// "Your Journey" act tile (design 6).
function JourneyTile({ act }) {
  const current = act.status === "current";
  const locked = act.status === "locked";
  const pct = act.total ? (act.solvedCount / act.total) * 100 : 0;

  const body = (
    <>
      <span className="font-heading text-sm font-semibold text-muted">Act {act.id}</span>
      <span className="mt-1 block font-heading text-2xl font-bold text-bone">
        {act.solvedCount}/{act.total}
        <span className="sr-only"> checkpoints solved{locked ? ", locked" : ""}</span>
      </span>
      <span className="relative mt-3 block h-1 rounded-full bg-ink-raised" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 rounded-full bg-blood-bright" style={{ width: `${pct}%` }} />
        <span
          className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-parchment-dark"
          style={{ left: `${Math.max(pct, 4)}%` }}
        />
      </span>
    </>
  );

  const cls = `block rounded-card border px-3 py-4 text-center transition-colors ${
    current ? "border-blood-bright bg-blood-deep/40 shadow-glow-red" : "border-line bg-ink-soft/80 hover:border-gold-soft"
  } ${locked ? "opacity-70" : ""}`;

  if (locked) {
    return (
      <div className={cls} aria-disabled="true">
        {body}
      </div>
    );
  }
  return (
    <Link to={`/challenges/act/${act.id}`} className={cls} aria-current={current ? "step" : undefined}>
      {body}
    </Link>
  );
}

// Design 6: team dashboard (the "Challenges" tab).
export default function ChallengesHub() {
  const { loading, error, team, stats } = useTeam();
  const { acts, currentAct } = useActs();
  const { relics, collected, total } = useRelics();
  const { activity } = useActivity();

  if (loading || error) return <PageStatus loading={loading} error={error} label="Loading your dossier" />;

  const currentCp = currentAct?.current;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <section aria-labelledby="team-heading" className="panel-dark p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <TeamAvatar className="size-16" />
          <div>
            <h1 id="team-heading" className="font-heading text-3xl font-bold text-bone uppercase">
              {team.name}
            </h1>
            <p className="font-heading text-xl font-bold text-gold">{formatPoints(team.points)}</p>
          </div>
        </div>

        {currentAct && (
          <div className="mt-6">
            <p className="text-sm text-muted">Current Act</p>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4">
              <p className="font-heading text-lg font-semibold text-bone">
                Act {currentAct.id} &mdash; {currentAct.title}
              </p>
              <p className="text-sm text-muted">
                {currentAct.solvedCount}/{currentAct.total} Checkpoints
              </p>
            </div>
            <ProgressBar
              className="mt-2"
              value={currentAct.solvedCount}
              max={currentAct.total}
              label={`Act ${currentAct.id} progress`}
            />
            {currentCp && (
              <Button to={`/gate/${currentCp.slug}`} size="sm" caps={false} className="mt-4">
                Resume {formatCp(currentCp)}: {currentCp.title}
                <Icon name="arrowRight" className="size-4" />
              </Button>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatTile icon="bulb" label="Hints Used" value={`${stats.hintsUsed} (−${stats.hintPointsSpent} pts)`} />
          <StatTile icon="relic" label="Relics Collected" value={`${collected}/${total}`} />
          <StatTile icon="flame" label="Current Streak" value={stats.streak} />
        </div>

        <h2 className="mt-6 mb-2 font-heading text-lg font-bold text-bone">Recent Activity</h2>
        <ActivityFeed items={activity} />
      </section>

      <div className="space-y-6">
        <section aria-labelledby="journey-heading" className="panel-dark p-5 sm:p-6">
          <h2 id="journey-heading" className="font-heading text-2xl font-bold text-bone">
            Your Journey
          </h2>
          <ol className="stagger mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {acts.map((act) => (
              <li key={act.id}>
                <JourneyTile act={act} />
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="relics-heading" className="panel-dark p-5 sm:p-6">
          <div className="flex items-baseline justify-between">
            <h2 id="relics-heading" className="font-heading text-2xl font-bold text-bone">
              Relics
            </h2>
            <Link to="/relics" className="text-sm text-muted hover:text-bone">
              View all
            </Link>
          </div>
          <ul className="stagger mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {relics.map((r) => (
              <li key={r.id} className="[&>figure]:h-full">
                <RelicCard relic={r} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
