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
  const complete = act.status === "solved";
  const pct = act.total ? (act.solvedCount / act.total) * 100 : 0;

  const body = (
    <>
      <div className="mb-2 flex items-center justify-between text-left">
        <span className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-[#352319]">Act {act.id}</span>
        {complete && <span className="text-sm text-[#43552D]">✓</span>}
      </div>
      <div className="text-left">
        <span className="block font-heading text-2xl font-bold text-[#24170F]">
          {act.solvedCount}/{act.total}
          <span className="sr-only"> checkpoints solved{locked ? ", locked" : ""}</span>
        </span>
      </div>
      <span className="relative mt-3 block h-2 overflow-hidden rounded-full bg-[#352319]/30" aria-hidden="true">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${complete ? "bg-[#43552D]" : current ? "bg-[#6F211B]" : "bg-[#6b5145]"}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </>
  );

  const cls = `block min-h-[118px] rounded-[16px] border px-3 py-4 text-center transition-all duration-200 ${
    current
      ? "border-[#6F211B] bg-[#6f211b]/10 shadow-[0_0_0_1px_rgba(111,33,27,0.2),0_12px_22px_rgba(111,33,27,0.12)]"
      : complete
        ? "border-[#43552D]/70 bg-[#43552d]/10"
        : "border-[#5d4333]/70 bg-[#2f2018]/5 hover:border-[#b58a42]"
  } ${locked ? "opacity-80" : ""}`;

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
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(310px,0.9fr)_minmax(0,1.65fr)]">
      <section
        aria-labelledby="team-heading"
        className="paper-texture torn-edge relative overflow-hidden p-5 shadow-[inset_0_0_0_1px_rgba(52,31,18,0.18),0_14px_24px_rgba(30,18,12,0.62)] sm:p-6"
        style={{ backgroundSize: "120% 120%", backgroundPosition: "center center" }}
      >
        <div className="absolute inset-[-8%] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_42%)]" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <TeamAvatar className="size-16 border border-[#b58a42]/40" />
              <div>
                <p className="font-type text-[10px] uppercase tracking-[0.36em] text-[#6F211B]">Team dossier</p>
                <h1 id="team-heading" className="mt-1 font-heading text-3xl font-bold uppercase tracking-[0.08em] text-[#24170F]">
                  {team.name}
                </h1>
                <p className="mt-1 font-heading text-xl font-bold text-[#6F211B]">{formatPoints(team.points)}</p>
              </div>
            </div>
            <span className="border border-[#6F211B]/70 bg-[#291b16]/20 px-2 py-1 font-type text-[10px] tracking-[0.2em] text-[#6F211B] uppercase rotate-[-8deg]">
              Top Secret
            </span>
          </div>

          {currentAct && (
            <div className="mt-8 rounded-[18px] border border-[#5d4333]/60 bg-[#2b1d18]/10 p-4">
              <p className="font-type text-[10px] uppercase tracking-[0.28em] text-[#6F211B]">Current Act</p>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4">
                <p className="font-heading text-lg font-semibold text-[#24170F]">
                  Act {currentAct.id} — {currentAct.title}
                </p>
                <p className="text-sm text-[#352319]">
                  {currentAct.solvedCount}/{currentAct.total} Checkpoints
                </p>
              </div>
              <ProgressBar
                className="mt-3"
                value={currentAct.solvedCount}
                max={currentAct.total}
                label={`Act ${currentAct.id} progress`}
              />
              {currentCp && (
                <Link
                  to={`/gate/${currentCp.slug}`}
                  className="mt-4 flex w-full items-center justify-between gap-3 rounded-[12px] border border-[#5f2a26]/70 bg-[#6F211B]/90 px-4 py-3 font-heading text-sm font-bold text-[#f7efe6] shadow-[0_8px_18px_rgba(111,33,27,0.22)] transition-transform hover:-translate-y-0.5"
                >
                  <span>Resume {formatCp(currentCp)}: {currentCp.title}</span>
                  <Icon name="arrowRight" className="size-4" />
                </Link>
              )}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatTile icon="bulb" label="Hints Used" value={`${stats.hintsUsed} (−${stats.hintPointsSpent} pts)`} className="rounded-[14px] border-[#5d4333]/60 bg-[#2f2018]/10" />
            <StatTile icon="relic" label="Relics Collected" value={`${collected}/${total}`} className="rounded-[14px] border-[#5d4333]/60 bg-[#2f2018]/10" />
            <StatTile icon="flame" label="Current Streak" value={stats.streak} className="rounded-[14px] border-[#5d4333]/60 bg-[#2f2018]/10" />
          </div>

          <div className="mt-6 rounded-[18px] border border-[#5d4333]/60 bg-[#2f2018]/8 p-4">
            <h2 className="font-heading text-xl font-bold text-[#24170F]">Recent Activity</h2>
            <div className="mt-3">
              <ActivityFeed items={activity} />
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <section aria-labelledby="journey-heading" className="paper-texture torn-edge p-5 shadow-[inset_0_0_0_1px_rgba(52,31,18,0.18),0_14px_24px_rgba(30,18,12,0.62)] sm:p-6" style={{ backgroundSize: "120% 120%", backgroundPosition: "center center" }}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="journey-heading" className="font-heading text-3xl font-bold tracking-[0.04em] text-[#24170F]">
              Your Journey
            </h2>
            <span className="font-type text-[10px] uppercase tracking-[0.26em] text-[#6F211B]">Archive</span>
          </div>
          <ol className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {acts.map((act) => (
              <li key={act.id}>
                <JourneyTile act={act} />
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="relics-heading" className="paper-texture torn-edge p-5 shadow-[inset_0_0_0_1px_rgba(52,31,18,0.18),0_14px_24px_rgba(30,18,12,0.62)] sm:p-6" style={{ backgroundSize: "120% 120%", backgroundPosition: "center center" }}>
          <div className="flex items-center justify-between">
            <h2 id="relics-heading" className="font-heading text-3xl font-bold tracking-[0.04em] text-[#24170F]">
              Relics
            </h2>
            <Link to="/relics" className="font-heading text-sm font-semibold text-[#6F211B] transition-colors hover:text-[#3a140d]">
              View All →
            </Link>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
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
