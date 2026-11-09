import { useFinale, useRelics } from "../hooks/useGameData.js";
import RelicCard from "../components/game/RelicCard.jsx";
import VictoryPanel from "../components/game/VictoryPanel.jsx";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";
import PaperCard from "../components/ui/PaperCard.jsx";
import "./Relics.css";

// Below the relics: locked -> progress note; unlocked -> CTA to the final gate. Hidden once finished
// (the Victory panel at the top takes over).
function CollectionProgress({ relics, tone = "paper" }) {
  const collected = relics.filter((relic) => relic.collected).length;
  const total = relics.length;

  return (
    <div className={`relic-collection-progress relic-collection-progress--${tone}`}>
      <p className="relic-collection-count" aria-live="polite">
        <span>{collected}/{total}</span> collected
      </p>
      <div
        className="relic-collection-meter"
        role="progressbar"
        aria-label={`${collected} of ${total} relics collected`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={collected}
      >
        {relics.map((relic) => (
          <span
            key={relic.id}
            className={relic.collected ? "relic-collection-segment is-collected" : "relic-collection-segment"}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function FaceOffPanel({ relics }) {
  const relicsTotal = relics.length;
  const { finalBoss, unlocked, finished } = useFinale();
  if (finished) return null;

  if (unlocked) {
    return (
      <section
        aria-labelledby="faceoff-heading"
        className="relics-faceoff-panel mx-auto mt-10 max-w-xl rounded-card px-5 py-6 text-center sm:px-8 sm:py-7"
      >
        <p className="relics-faceoff-eyebrow font-type text-xs tracking-[0.22em] uppercase">
          All {relicsTotal} relics collected
        </p>
        <CollectionProgress relics={relics} tone="dark" />
        <h2 id="faceoff-heading" className="relics-faceoff-heading mt-5 font-display text-3xl tracking-wide uppercase sm:text-4xl">
          {finalBoss?.title || "The Final Face-off"}
        </h2>
        <p className="relics-faceoff-narrative mt-2">Mogambo is waiting. There is no turning back.</p>
        <div className="mt-5 flex justify-center">
          <Button
            to={`/gate/${finalBoss.slug}`}
            variant="outline"
            size="md"
            className="relics-faceoff-action"
          >
            Face Mogambo <Icon name="arrowRight" className="size-4" />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <PaperCard className="mx-auto mt-10 max-w-2xl -rotate-1" innerClassName="px-6 py-4 text-center">
      <p className="relic-collection-message text-2xl leading-snug sm:text-3xl">
        Collect all {relicsTotal} relics to face Mogambo
      </p>
      <CollectionProgress relics={relics} />
    </PaperCard>
  );
}

// Design 7: the five relics.
export default function Relics() {
  const { loading, error, relics } = useRelics();

  return (
    <section className="relics-page" aria-labelledby="relics-heading">
      <VictoryPanel className="mb-8" />

      <header className="text-center">
        <h1 id="relics-heading" className="relics-page-heading text-4xl tracking-wide text-parchment uppercase sm:text-5xl">
          The Five Relics
        </h1>
        <p className="mt-2 text-muted">Fragments of the archive. Keys to the final face-off.</p>
      </header>

      {loading || error ? (
        <PageStatus loading={loading} error={error} />
      ) : (
        <>
          <ul className="relic-grid stagger mt-8 grid grid-cols-2 items-start gap-4 max-[360px]:grid-cols-1 lg:grid-cols-5">
            {relics.map((r) => (
              <li key={r.id}>
                <RelicCard relic={r} parchment />
              </li>
            ))}
          </ul>

          <FaceOffPanel relics={relics} />
        </>
      )}
    </section>
  );
}
