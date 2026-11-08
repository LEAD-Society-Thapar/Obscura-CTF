import { useFinale, useRelics } from "../hooks/useGameData.js";
import RelicCard from "../components/game/RelicCard.jsx";
import VictoryPanel from "../components/game/VictoryPanel.jsx";
import Button from "../components/ui/Button.jsx";
import Icon from "../components/ui/Icon.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";
import PaperCard from "../components/ui/PaperCard.jsx";

// Below the relics: locked -> progress note; unlocked -> CTA to the final gate. Hidden once finished
// (the Victory panel at the top takes over).
function FaceOffPanel() {
  const { finalBoss, unlocked, finished, relicsCollected, relicsTotal } = useFinale();
  if (finished) return null;

  if (unlocked) {
    return (
      <section
        aria-labelledby="faceoff-heading"
        className="mx-auto mt-10 max-w-2xl rounded-card border border-blood-bright bg-blood-deep/60 px-6 py-8 text-center shadow-glow-red motion-safe:animate-pulse-glow"
      >
        <p className="font-type text-xs tracking-[0.3em] text-gold uppercase">All {relicsTotal} relics collected</p>
        <h2 id="faceoff-heading" className="mt-2 font-display text-4xl tracking-wide text-bone uppercase sm:text-5xl">
          {finalBoss?.title || "The Final Face-off"}
        </h2>
        <p className="mt-3 text-bone/90">Mogambo is waiting. There is no turning back.</p>
        <div className="mt-6 flex justify-center">
          <Button to={`/gate/${finalBoss.slug}`} size="lg">
            Face Mogambo <Icon name="arrowRight" className="size-5" />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <PaperCard className="mx-auto mt-10 max-w-2xl -rotate-1" innerClassName="px-6 py-5 text-center">
      <p className="font-hand text-2xl leading-snug sm:text-3xl">Collect all {relicsTotal} relics to face Mogambo</p>
      <p className="mt-2 font-type text-sm text-blood">
        {relicsCollected}/{relicsTotal} collected
      </p>
    </PaperCard>
  );
}

// Design 7: the five relics.
export default function Relics() {
  const { loading, error, relics } = useRelics();

  return (
    <section aria-labelledby="relics-heading">
      <VictoryPanel className="mb-8" />

      <header className="text-center">
        <h1 id="relics-heading" className="font-display text-4xl tracking-wide text-parchment uppercase sm:text-5xl">
          The Five Relics
        </h1>
        <p className="mt-2 text-muted">Fragments of the archive. Keys to the final face-off.</p>
      </header>

      {loading || error ? (
        <PageStatus loading={loading} error={error} />
      ) : (
        <>
          <ul className="stagger mt-8 grid grid-cols-2 items-start gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {relics.map((r) => (
              <li key={r.id}>
                <RelicCard relic={r} />
              </li>
            ))}
          </ul>

          <FaceOffPanel />
        </>
      )}
    </section>
  );
}
