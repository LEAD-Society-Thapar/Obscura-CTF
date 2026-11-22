import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useEventStatus, useFullscreen, useGameActions, useGate, useTeam } from "../hooks/useGameData.js";
import { formatCp, isFinalCp } from "../lib/format.js";
import EndingModal from "../components/game/EndingModal.jsx";
import FlagForm from "../components/game/FlagForm.jsx";
import HintPanel from "../components/game/HintPanel.jsx";
import ReelCardModal from "../components/game/ReelCardModal.jsx";
import ToolPanel from "../components/game/ToolPanel.jsx";
import ArtSlot from "../components/ui/ArtSlot.jsx";
import Button from "../components/ui/Button.jsx";
import CategoryTag from "../components/ui/CategoryTag.jsx";
import Icon from "../components/ui/Icon.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";
import PointsBadge from "../components/ui/PointsBadge.jsx";
import SafeMarkdown from "../components/ui/SafeMarkdown.jsx";

// Why flags are not accepted right now (null while the clock is running).
const CLOCK_NOTICE = {
  idle: "The hunt has not started yet. Flags open when the clock starts.",
  paused: "The clock is paused. Flags open again when it resumes.",
  ended: "Time is up. The hunt is over and flags are closed.",
};
const LOCKED_NOTICE = "Your team is locked out for leaving full screen. Flags open again if an organiser restores your access.";

function BackLink({ act, final = false }) {
  const [to, label] = final
    ? ["/relics", "Back to Relics"]
    : act
      ? [`/challenges/act/${act}`, `Back to Act ${act}`]
      : ["/challenges", "Back to Challenges"];
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-bone">
      <Icon name="arrowLeft" className="size-4" /> {label}
    </Link>
  );
}

// Shown instead of the challenge when the slug is unknown, the gate is still locked, or the hunt has not started.
function GateBlocked({ error }) {
  const code = error?.data?.code;
  const locked = code === "LOCKED";
  const notStarted = code === "EVENT_NOT_STARTED";
  const fsLocked = code === "FULLSCREEN_LOCKED";
  const final = !!error?.data?.final;
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-ink-raised text-muted ring-1 ring-line">
        <Icon name={notStarted ? "clock" : "lock"} className="size-8" />
      </span>
      <h1 className="mt-5 font-heading text-3xl font-bold text-bone">
        {notStarted
          ? "The hunt has not started"
          : fsLocked
            ? "Your team is locked out"
            : locked
            ? "This gate is still sealed"
            : code === "NOT_FOUND"
              ? "No gate here"
              : "The projector jammed"}
      </h1>
      <p className="mt-2 text-muted">
        {notStarted
          ? "Gates open the moment the clock starts. This page will open by itself."
          : fsLocked
            ? "Your team left full screen too many times. This page opens again by itself if an organiser restores your access."
            : locked && final
            ? "Collect all five relics to face Mogambo."
            : locked
              ? "Close the previous checkpoint first. Its Reel Card shows the way here."
              : code === "NOT_FOUND"
                ? "This gate doesn't exist, or it belongs to another team."
                : error?.message}
      </p>
      <div className="mt-6">
        <BackLink act={error?.data?.act} final={final} />
      </div>
    </div>
  );
}

// Design 4: challenge page at a per-team gate URL. Shows the Reel Card modal (design 5) once the checkpoint
// closes: after a solve, or (marked as missed) after the team's last wrong answer.
export default function Gate() {
  const { slug } = useParams();
  const { loading, error, checkpoint: cp, reload } = useGate(slug);
  const { submitFlag, revealHint } = useGameActions();
  const { team } = useTeam(); // coins left, for the hint panel
  const clockStatus = useEventStatus();
  const fullscreen = useFullscreen();
  const [result, setResult] = useState(null); // submit result while a modal is open

  // The page was refused because the hunt had not started: open it as soon as the clock runs.
  const waitingForStart = error?.data?.code === "EVENT_NOT_STARTED";
  useEffect(() => {
    if (waitingForStart && clockStatus && clockStatus !== "idle") reload();
  }, [waitingForStart, clockStatus, reload]);

  // Refused because the team was locked out for leaving full screen: reopen once an organiser restores it.
  const waitingForUnlock = error?.data?.code === "FULLSCREEN_LOCKED";
  const fsLocked = !!fullscreen?.locked;
  useEffect(() => {
    if (waitingForUnlock && fullscreen && !fsLocked) reload();
  }, [waitingForUnlock, fullscreen, fsLocked, reload]);

  // Also covers moving to the next gate: don't show the previous checkpoint while the new one loads.
  if (loading && cp?.slug !== slug) return <PageStatus loading label="Opening the gate" />;
  if (error) return <GateBlocked error={error} />;

  const solved = cp.status === "solved";
  const missed = cp.status === "failed";
  const final = isFinalCp(cp);
  const paragraphs = cp.story.split("\n").filter(Boolean);
  const clockNotice = fsLocked && clockStatus !== "ended" ? LOCKED_NOTICE : (CLOCK_NOTICE[clockStatus] ?? null);

  const onClosed = (res) => {
    setResult(res);
    reload();
  };

  const closeModal = () => setResult(null);
  const nextAction = (next) =>
    next && isFinalCp(next)
      ? { to: `/gate/${next.slug}`, label: "Face Mogambo", onClick: closeModal }
      : next
        ? { to: `/gate/${next.slug}`, label: "Go to next checkpoint", onClick: closeModal }
        : { to: "/relics", label: "See your relics", onClick: closeModal };

  return (
    <article aria-labelledby="cp-title">
      <BackLink act={cp.act} final={final} />

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {/* min-w-0: lets wide code blocks/tables scroll inside their box instead of widening the page. */}
        <div className="min-w-0">
          <p className={`font-type text-lg ${final ? "text-blood-bright" : "text-gold"}`}>{final ? "Final Gate" : formatCp(cp)}</p>
          <h1 id="cp-title" className="font-heading text-4xl font-bold text-bone sm:text-5xl">
            {cp.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CategoryTag category={cp.category} className="text-sm" />
            <PointsBadge points={cp.points} variant="tag" />
            {solved && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-gold/15 px-2.5 py-0.5 font-heading text-sm font-semibold text-gold">
                <Icon name="check" className="size-4" /> Solved
              </span>
            )}
            {missed && (
              <span className="inline-flex items-center gap-1 rounded-chip bg-blood-deep/60 px-2.5 py-0.5 font-heading text-sm font-semibold text-blood-bright">
                <Icon name="close" className="size-4" /> Missed
              </span>
            )}
          </div>

          <div className="mt-5 space-y-1 text-lg leading-relaxed text-bone/90">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {cp.body && (
            <section aria-label="Challenge" className="mt-6 rounded-card border border-line bg-ink-soft/80 p-4 text-base leading-relaxed sm:p-5 sm:text-lg">
              <SafeMarkdown>{cp.body}</SafeMarkdown>
            </section>
          )}

          {cp.downloads.length > 0 && (
            <section aria-labelledby="pack-heading" className="mt-6">
              <h2 id="pack-heading" className="font-heading text-sm font-bold tracking-wider text-muted uppercase">
                Data pack
              </h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {cp.downloads.map((d) => (
                  <li key={d.label}>
                    <a
                      href={d.href}
                      download
                      className="inline-flex items-center gap-2 rounded-chip border border-line bg-ink-soft px-3 py-1.5 font-mono text-sm text-bone hover:border-gold-soft"
                    >
                      <Icon name="download" className="size-4 text-gold" />
                      {d.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ToolPanel tools={cp.tools} />

          <div className="mt-6">
            <HintPanel
              hints={cp.hints}
              readOnly={solved || missed || !!clockNotice}
              onReveal={(id) => revealHint(slug, id).then(reload)}
              coinsLeft={team?.coins?.left ?? null}
            />
          </div>
        </div>

        <figure className="mx-auto w-full max-w-56 sm:max-w-sm lg:max-w-none">
          <div className="relative rotate-1 overflow-hidden rounded-[3px] border-4 border-parchment/90 shadow-paper">
            <ArtSlot name={cp.posterSlot} alt={`Poster for ${cp.title}`} />
          </div>
        </figure>
      </div>

      <div className="mt-8">
        {solved || missed ? (
          <div
            className={`flex flex-col items-start gap-4 rounded-card border bg-ink-soft/90 p-4 sm:flex-row sm:items-center sm:justify-between ${
              solved ? "border-gold-soft/50" : "border-blood/60"
            }`}
          >
            {solved ? (
              <p className="text-bone">
                <strong className="font-heading text-gold">Already solved.</strong> Your team cracked this one.
              </p>
            ) : (
              <p className="text-bone">
                <strong className="font-heading text-blood-bright">Missed.</strong>{" "}
                {final
                  ? "Your team used all its attempts without the right answer. Mogambo slips away, and the final face-off is closed."
                  : "Your team used all its attempts without the right answer, so this checkpoint is closed with 0 points."}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {cp.reel && (
                <Button to={`/reel/${cp.id}`} variant="outline" size="sm" caps={false}>
                  View Reel Card
                </Button>
              )}
              {cp.next && (
                <Button to={`/gate/${cp.next.slug}`} size="sm" caps={false}>
                  {isFinalCp(cp.next) ? "Face Mogambo" : "Next checkpoint"} <Icon name="arrowRight" className="size-4" />
                </Button>
              )}
              {final && (
                <Button to="/report" size="sm" caps={false}>
                  View final report <Icon name="arrowRight" className="size-4" />
                </Button>
              )}
              {final && (
                <Button to="/challenges" variant="outline" size="sm" caps={false}>
                  {solved ? "See your victory" : "Back to your dossier"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <FlagForm
            onSubmit={(flag) => submitFlag(slug, flag)}
            onSolved={onClosed}
            onMissed={onClosed}
            onWrong={reload}
            onStale={reload}
            attempts={cp.attempts ?? null}
            disabledReason={clockNotice}
          />
        )}
      </div>

      {/* After a solve, or after a miss on any checkpoint but the final (a missed final has no reel to show). */}
      <ReelCardModal
        open={!!result?.reel && !result.finished}
        onClose={closeModal}
        reel={result?.reel}
        relic={result?.relic}
        missed={!!result?.missed}
        action={result && !result.finished ? nextAction(result.next) : null}
      />
      {/* The final closed: solved (victory) or every attempt used (defeat). */}
      <EndingModal
        open={!!result?.finished || !!result?.finalMissed}
        variant={result?.finished ? "victory" : "defeat"}
        onClose={closeModal}
        title={result?.endingTitle}
        ending={result?.ending}
      />
    </article>
  );
}
