import { Link } from "react-router-dom";
import { useActivity, useActs, useFinale, useRelics, useTeam } from "../hooks/useGameData.js";
import { formatCp, formatPoints } from "../lib/format.js";
import ActivityFeed from "../components/game/ActivityFeed.jsx";
import RelicCard from "../components/game/RelicCard.jsx";
import TeamAvatar from "../components/game/TeamAvatar.jsx";
import VictoryPanel from "../components/game/VictoryPanel.jsx";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";
import ProgressBar from "../components/ui/ProgressBar.jsx";
import StatTile from "../components/ui/StatTile.jsx";
import "./ChallengesHub.css";

const STATUS_TEXT = { done: "Completed", current: "In progress", locked: "Locked" };

// "Your Journey" act tile (design 6).
function JourneyTile({ act }) {
  const current = act.status === "current";
  const locked = act.status === "locked";
  const complete = act.status === "done"; // withActStats() uses "done" | "current" | "locked"
  const pct = act.total ? (act.solvedCount / act.total) * 100 : 0;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2 text-left">
        <span className="journey-act-number">Act {String(act.id).padStart(2, "0")}</span>
        {complete && (
          <span className="journey-complete-mark" aria-label="Completed">
            <Icon name="check" className="size-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>
      <p className="journey-act-title">{act.title}</p>
      <div className="journey-act-progress">
        <span className="journey-act-count">
          {act.solvedCount}/{act.total}
          <span className="sr-only"> checkpoints solved{locked ? ", locked" : ""}</span>
        </span>
        <span className="journey-act-status">{STATUS_TEXT[act.status]}</span>
      </div>
      <span className="journey-progress-track" aria-hidden="true">
        <span className="journey-progress-value" style={{ width: `${pct}%` }} />
      </span>
    </>
  );

  const cls = `journey-act-card ${current ? "is-current" : complete ? "is-complete" : "is-locked"}`;

  if (locked) {
    return <div className={cls} data-status="locked" aria-disabled="true">{body}</div>;
  }
  return <Link to={`/challenges/act/${act.id}`} className={cls} data-status={act.status} aria-current={current ? "step" : undefined}>{body}</Link>;
}

// Design 6: team dashboard (the "Challenges" tab).
export default function ChallengesHub() {
  const { loading, error, team, stats } = useTeam();
  const { acts, currentAct } = useActs();
  const { relics, collected, total } = useRelics();
  const { activity } = useActivity();

  const { finalBoss, unlocked: finalOpen, finished } = useFinale();

  if (loading || error) return <PageStatus loading={loading} error={error} label="Loading your dossier" />;

  // Resume target: the current act checkpoint, or the final gate once every act is done.
  const resume = finished
    ? null
    : currentAct?.current
      ? { to: `/gate/${currentAct.current.slug}`, label: `Resume ${formatCp(currentAct.current)}: ${currentAct.current.title}` }
      : finalOpen
        ? { to: `/gate/${finalBoss.slug}`, label: `Face Mogambo: ${finalBoss.title}` }
        : null;

  return (
    <>
      <VictoryPanel className="mb-5" />
      <div className="team-dashboard space-y-5">
        <div className="dashboard-main-grid grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.65fr)]">
          <section
            aria-labelledby="team-heading"
            className="dashboard-dossier paper-texture torn-edge relative min-w-0 overflow-hidden p-5 shadow-[inset_0_0_0_1px_rgba(52,31,18,0.18),0_14px_24px_rgba(30,18,12,0.48)] sm:p-6"
            style={{ backgroundSize: "120% 120%", backgroundPosition: "center center" }}
          >
            <div className="absolute inset-[-8%] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_42%)]" aria-hidden="true" />
            <div className="relative">
              <div className="dashboard-dossier-header flex items-start justify-between gap-4">
                <div className="dashboard-dossier-identity flex min-w-0 items-center gap-3 sm:gap-4">
                  <TeamAvatar className="dashboard-dossier-avatar size-16 border border-[#b58a42]/50 sm:size-[4.5rem]" />
                  <div className="min-w-0">
                    <p className="dashboard-archive-label">Team dossier</p>
                    <h1 id="team-heading" className="dashboard-team-name">
                      {team.name}
                    </h1>
                    <p className="dashboard-team-score">{formatPoints(team.points)}</p>
                  </div>
                </div>
                <span className="dashboard-secret-stamp">Top Secret</span>
              </div>

              {currentAct && (
                <div className="dashboard-current-act mt-6 rounded-[18px] border border-[#5d4333]/55 bg-[#2b1d18]/10 p-4 sm:mt-7">
                  <p className="dashboard-archive-label">Current Act</p>
                  <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="dashboard-current-act-title">
                      Act {currentAct.id} — {currentAct.title}
                    </p>
                    <p className="dashboard-support text-sm text-[#352319]">
                      {currentAct.solvedCount}/{currentAct.total} Checkpoints
                    </p>
                  </div>
                  <ProgressBar
                    className="mt-3"
                    value={currentAct.solvedCount}
                    max={currentAct.total}
                    label={`Act ${currentAct.id} progress`}
                  />
                  {finished ? (
                    <p className="mt-4 flex w-full items-center gap-3 rounded-[12px] border border-[#b58a42] bg-[#24170F] px-4 py-3 font-heading text-sm font-bold text-[#d9a441]">
                      <Icon name="trophy" className="size-4" />
                      <span>Victory. Mogambo is defeated and the Archive is restored.</span>
                    </p>
                  ) : (
                    resume && (
                      <Link
                        to={resume.to}
                        className="dashboard-resume-button mt-4 flex w-full items-center justify-between gap-3 rounded-[10px] border border-[#5f2a26]/70 bg-[#6F211B]/90 px-4 py-3 text-sm font-bold text-[#f7efe6] xl:gap-2 xl:whitespace-nowrap"
                      >
                        <span className="min-w-0">{resume.label}</span>
                        <Icon name="arrowRight" className="size-4 shrink-0" />
                      </Link>
                    )
                  )}
                </div>
              )}

              <div className="dashboard-dossier-stats mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
                <StatTile icon="bulb" label="Hints Used" value={stats.hintsUsed} detail={`−${stats.hintPointsSpent} pts`} className="rounded-[12px]" />
                <StatTile icon="relic" label="Relics Collected" value={`${collected}/${total}`} className="rounded-[12px]" />
                <StatTile icon="flame" label="Current Streak" value={stats.streak} className="rounded-[12px]" />
              </div>
            </div>
          </section>

          <div className="min-w-0 space-y-5">
            <section aria-labelledby="journey-heading" className="dashboard-journey-section torn-edge min-w-0 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="journey-heading" className="dashboard-section-heading text-3xl text-[#24170F]">
                  Your Journey
                </h2>
                <span className="dashboard-archive-label">Archive</span>
              </div>
              <ol className="mt-5 grid grid-cols-2 gap-3 min-[540px]:grid-cols-3 xl:grid-cols-5">
                {acts.map((act) => (
                  <li key={act.id}>
                    <JourneyTile act={act} />
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="relics-heading" className="dashboard-relic-gallery torn-edge min-w-0 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="relics-heading" className="dashboard-section-heading text-3xl text-[#24170F]">
                  Relics
                </h2>
                <Link to="/relics" className="dashboard-view-all text-sm font-semibold text-[#6F211B] transition-colors hover:text-[#3a140d]">
                  View All →
                </Link>
              </div>
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {relics.map((r) => (
                  <li key={r.id} className="self-start">
                    <RelicCard relic={r} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <section aria-labelledby="activity-heading" className="dashboard-activity-section min-w-0 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="dashboard-archive-label">Field record</p>
              <h2 id="activity-heading" className="dashboard-section-heading mt-1 text-2xl text-[#24170F]">
                Recent Activity
              </h2>
            </div>
          </div>
          <div className="mt-3">
            <ActivityFeed items={activity} />
          </div>
        </section>
      </div>
    </>
  );
}
