import { useRelics } from "../hooks/useGameData.js";
import RelicCard from "../components/game/RelicCard.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";
import PaperCard from "../components/ui/PaperCard.jsx";

// Design 7: the five relics.
export default function Relics() {
  const { loading, error, relics, collected, total } = useRelics();

  return (
    <section aria-labelledby="relics-heading">
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
          <ul className="stagger mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {relics.map((r) => (
              <li key={r.id}>
                <RelicCard relic={r} />
              </li>
            ))}
          </ul>

          <PaperCard className="mx-auto mt-10 max-w-2xl -rotate-1" innerClassName="px-6 py-5 text-center">
            <p className="font-hand text-2xl leading-snug sm:text-3xl">
              Collect all {total} relics to unlock the final face-off and confront Mogambo.
            </p>
            <p className="mt-2 font-type text-sm text-blood">
              {collected}/{total} collected
            </p>
          </PaperCard>
        </>
      )}
    </section>
  );
}
