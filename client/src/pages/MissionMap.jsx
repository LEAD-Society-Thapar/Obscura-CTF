import { useActs } from "../hooks/useGameData.js";
import ActCard from "../components/game/ActCard.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";

// Desktop grid placement for up to 5 acts (design 2: three on top, two staggered below).
// Extra acts fall back to normal flow.
const PLACEMENT = [
  "lg:col-start-1 lg:col-span-2 lg:row-start-1 lg:mt-10",
  "lg:col-start-3 lg:col-span-2 lg:row-start-1",
  "lg:col-start-5 lg:col-span-2 lg:row-start-1 lg:mt-12",
  "lg:col-start-2 lg:col-span-2 lg:row-start-2",
  "lg:col-start-4 lg:col-span-2 lg:row-start-2 lg:mt-6",
];

function Note({ children, className = "" }) {
  return (
    <p
      className={`paper-texture w-56 rounded-[2px] px-4 py-3 font-hand text-xl leading-snug shadow-paper ${className}`}
    >
      {children}
    </p>
  );
}

// Design 2: "The Journey" mission map.
export default function MissionMap() {
  const { loading, error, acts, totalCheckpoints } = useActs();

  return (
    <section aria-labelledby="map-heading">
      <div className="paper-texture torn-edge relative px-4 pt-8 pb-6 sm:px-8 lg:px-10">
        <header className="text-center">
          <h1 id="map-heading" className="font-display text-4xl tracking-wide text-blood uppercase sm:text-5xl">
            The Journey
          </h1>
          <p className="mt-2 font-type text-sm tracking-wide uppercase sm:text-base">
            Five acts. Twenty checkpoints. One stolen archive.
            {totalCheckpoints > 0 && <span className="sr-only"> ({totalCheckpoints} checkpoints in total.)</span>}
          </p>
        </header>

        <Note className="mx-auto mt-6 -rotate-2 lg:absolute lg:top-6 lg:right-8 lg:mt-0">
          Some places hide more than they show.
        </Note>

        {loading || error ? (
          <PageStatus loading={loading} error={error} label="Unrolling the map" />
        ) : (
          <div className="relative mt-10">
            {/* Dotted red route (decorative), drawn behind the cards through their centres.
                Coordinates are % of the grid box; desktop only. Adjust if PLACEMENT changes. */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                className="dotted-route"
                vectorEffect="non-scaling-stroke"
                d="M16 24 C 28 12, 38 10, 50 17 C 62 10, 74 12, 84 25 C 88 52, 42 42, 33 66 C 44 80, 56 82, 67 70"
              />
            </svg>

            <ol className="stagger relative grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-6">
              {acts.map((act, i) => (
                <li key={act.id} className={PLACEMENT[i] || ""}>
                  <ActCard act={act} />
                </li>
              ))}
              <li aria-hidden="true" className="hidden lg:col-start-6 lg:row-start-2 lg:flex lg:items-start lg:justify-end">
                <Note className="rotate-2 text-lg">Find the clues. Collect the relics. Uncover the truth. Stop Mogambo.</Note>
              </li>
            </ol>
            <Note className="mx-auto mt-2 rotate-1 lg:hidden">
              Find the clues. Collect the relics. Uncover the truth. Stop Mogambo.
            </Note>
          </div>
        )}
      </div>
    </section>
  );
}
