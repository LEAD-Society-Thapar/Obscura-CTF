import { Link, useParams } from "react-router-dom";
import { useAct } from "../hooks/useGameData.js";
import CheckpointRow from "../components/game/CheckpointRow.jsx";
import ArtSlot from "../components/ui/ArtSlot.jsx";
import Icon from "../components/ui/Icon.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";

// Design 3: one act's checkpoint list.
export default function ActChallenges() {
  const { actId } = useParams();
  const { loading, error, act } = useAct(actId);

  if (loading || error) return <PageStatus loading={loading} error={error} />;
  if (!act) {
    return (
      <div className="py-16">
        <p className="text-muted">No act {actId} in this archive.</p>
        <Link to="/map" className="mt-4 inline-block text-gold hover:underline">
          Back to the map
        </Link>
      </div>
    );
  }

  // Last letter in red, echoing the OBSCURA wordmark (design 3).
  const title = act.title.toUpperCase();

  return (
    <>
      <Link to="/map" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-bone">
        <Icon name="arrowLeft" className="size-4" /> Mission Map
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <section
          aria-labelledby="act-heading"
          className="relative min-h-64 overflow-hidden rounded-card border border-line lg:min-h-[30rem]"
        >
          <ArtSlot name={act.bannerSlot} fill icon={null} />
          <div className="absolute inset-0 bg-linear-to-b from-ink/90 via-ink/50 to-ink/85" />
          <div className="relative p-6">
            <p className="font-heading text-2xl font-bold tracking-wide text-bone uppercase">Act {act.id}</p>
            <h1 id="act-heading" className="font-display text-3xl leading-tight text-bone sm:text-4xl">
              {title.slice(0, -1)}
              <span className="text-blood-bright">{title.slice(-1)}</span>
            </h1>
            <p className="mt-4 max-w-xs leading-relaxed text-bone/90">{act.blurb}</p>
            {act.film && <p className="mt-2 max-w-xs font-type text-xs text-muted">Film: {act.film}</p>}
            <p className="mt-4 font-type text-sm text-gold">
              {act.solvedCount}/{act.total} solved
            </p>
          </div>
        </section>

        <section aria-label={`Act ${act.id} checkpoints`}>
          <ol className="stagger space-y-3">
            {act.checkpoints.map((cp) => (
              <li key={cp.id}>
                <CheckpointRow cp={cp} />
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
