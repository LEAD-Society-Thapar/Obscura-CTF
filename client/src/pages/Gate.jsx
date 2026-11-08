import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useGameActions, useGate } from "../hooks/useGameData.js";
import { formatCp } from "../lib/format.js";
import FlagForm from "../components/game/FlagForm.jsx";
import HintPanel from "../components/game/HintPanel.jsx";
import ReelCardModal from "../components/game/ReelCardModal.jsx";
import ArtSlot from "../components/ui/ArtSlot.jsx";
import Button from "../components/ui/Button.jsx";
import CategoryTag from "../components/ui/CategoryTag.jsx";
import Icon from "../components/ui/Icon.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";
import PointsBadge from "../components/ui/PointsBadge.jsx";
import SafeMarkdown from "../components/ui/SafeMarkdown.jsx";

function BackLink({ act }) {
  return (
    <Link
      to={act ? `/challenges/act/${act}` : "/challenges"}
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-bone"
    >
      <Icon name="arrowLeft" className="size-4" /> {act ? `Back to Act ${act}` : "Back to Challenges"}
    </Link>
  );
}

// Shown instead of the challenge when the slug is unknown or the gate is still locked.
function GateBlocked({ error }) {
  const code = error?.data?.code;
  const locked = code === "LOCKED";
  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-ink-raised text-muted ring-1 ring-line">
        <Icon name="lock" className="size-8" />
      </span>
      <h1 className="mt-5 font-heading text-3xl font-bold text-bone">
        {locked ? "This gate is still sealed" : code === "NOT_FOUND" ? "No gate here" : "The projector jammed"}
      </h1>
      <p className="mt-2 text-muted">
        {locked
          ? "Solve the previous checkpoint first. Its Reel Card shows the way here."
          : code === "NOT_FOUND"
            ? "This gate doesn't exist, or it belongs to another team."
            : error?.message}
      </p>
      <div className="mt-6">
        <BackLink act={error?.data?.act} />
      </div>
    </div>
  );
}

// Design 4: challenge page at a per-team gate URL. Shows the Reel Card modal (design 5) after a solve.
export default function Gate() {
  const { slug } = useParams();
  const { loading, error, checkpoint: cp, reload } = useGate(slug);
  const { submitFlag, revealHint } = useGameActions();
  const [solve, setSolve] = useState(null); // submit result while the reel modal is open

  // Also covers moving to the next gate: don't show the previous checkpoint while the new one loads.
  if (loading && cp?.slug !== slug) return <PageStatus loading label="Opening the gate" />;
  if (error) return <GateBlocked error={error} />;

  const solved = cp.status === "solved";
  const paragraphs = cp.story.split("\n").filter(Boolean);

  const onSolved = (result) => {
    setSolve(result);
    reload();
  };

  const closeReel = () => setSolve(null);
  const nextAction = (next) =>
    next
      ? { to: `/gate/${next.slug}`, label: "Go to next checkpoint", onClick: closeReel }
      : { to: "/relics", label: "See your relics", onClick: closeReel };

  return (
    <article aria-labelledby="cp-title">
      <BackLink act={cp.act} />

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {/* min-w-0: lets wide code blocks/tables scroll inside their box instead of widening the page. */}
        <div className="min-w-0">
          <p className="font-type text-lg text-gold">{formatCp(cp)}</p>
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

          <div className="mt-6">
            <HintPanel hints={cp.hints} readOnly={solved} onReveal={(id) => revealHint(slug, id).then(reload)} />
          </div>
        </div>

        <figure className="mx-auto w-full max-w-56 sm:max-w-sm lg:max-w-none">
          <div className="relative rotate-1 overflow-hidden rounded-[3px] border-4 border-parchment/90 shadow-paper">
            <ArtSlot name={cp.posterSlot} alt={`Poster for ${cp.title}`} />
          </div>
        </figure>
      </div>

      <div className="mt-8">
        {solved ? (
          <div className="flex flex-col items-start gap-4 rounded-card border border-gold-soft/50 bg-ink-soft/90 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-bone">
              <strong className="font-heading text-gold">Already solved.</strong> Your team cracked this one.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button to={`/reel/${cp.id}`} variant="outline" size="sm" caps={false}>
                View Reel Card
              </Button>
              {cp.next && (
                <Button to={`/gate/${cp.next.slug}`} size="sm" caps={false}>
                  Next checkpoint <Icon name="arrowRight" className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <FlagForm onSubmit={(flag) => submitFlag(slug, flag)} onSolved={onSolved} onStale={reload} />
        )}
      </div>

      <ReelCardModal
        open={!!solve}
        onClose={closeReel}
        reel={solve?.reel}
        relic={solve?.relic}
        action={solve ? nextAction(solve.next) : null}
      />
    </article>
  );
}
