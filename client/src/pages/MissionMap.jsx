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
      className={`paper-texture torn-edge w-56 bg-transparent px-4 py-3 font-hand text-xl leading-snug shadow-[inset_0_0_0_1px_rgba(61,38,24,0.12),0_10px_18px_rgba(0,0,0,0.18)] ${className}`}
      style={{ backgroundSize: "120% 120%", backgroundPosition: "center center" }}
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
      <div className="paper-texture torn-edge relative isolate px-4 pt-8 pb-6 sm:px-8 lg:px-10">
        <img
          src="/assets/mission-map/parchment/parchment.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover lg:block"
        />
        <div className="relative z-10">
          <header className="relative pb-12 text-center sm:pb-16">
            <h1 id="map-heading">
              <img
                src="/assets/mission-map/labels/The%20Journey_%20Five%20Acts,%20One%20Archive.webp"
                alt="The Journey. Five acts. Twenty checkpoints. One final face-off."
                className="mx-auto block h-auto w-full max-w-[760px] object-contain"
              />
            </h1>
            <p className="sr-only">
              {totalCheckpoints > 0 && `${totalCheckpoints} checkpoints in total.`}
            </p>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[520px] items-center justify-between px-1"
            >
              <img
                src="/assets/mission-map/labels/classified-stamp.png"
                alt=""
                className="h-10 w-[68px] -rotate-6 object-contain drop-shadow-md sm:h-14 sm:w-28 lg:h-14 lg:w-32"
              />
              <img
                src="/assets/mission-map/seals/seal-camera.png"
                alt=""
                className="size-8 rotate-3 object-contain drop-shadow-md sm:size-10 lg:size-12"
              />
              <img
                src="/assets/mission-map/seals/seal-star.png"
                alt=""
                className="size-8 -rotate-3 object-contain drop-shadow-md sm:size-10 lg:size-12"
              />
              <img
                src="/assets/mission-map/seals/seal-film-reel.png"
                alt=""
                className="size-8 rotate-6 object-contain drop-shadow-md sm:size-10 lg:size-12"
              />
              <img
                src="/assets/mission-map/labels/archive-label.png"
                alt=""
                className="h-9 w-[76px] rotate-2 object-contain drop-shadow-md sm:h-12 sm:w-28 lg:h-12 lg:w-32"
              />
            </div>
          </header>

          <Note className="mr-auto mt-6 rotate-1 text-2xl lg:static lg:w-56 lg:text-base xl:absolute xl:top-32 xl:left-0 xl:mt-0 xl:w-28 xl:text-lg">
            Every reel holds a secret. Every clue brings you closer to the Archive.
          </Note>

          <Note className="ml-auto mt-6 -rotate-2 text-2xl lg:absolute lg:top-6 lg:-right-4 lg:mt-0 lg:w-20 lg:text-base xl:w-36 xl:text-xl">
            Some places hide more than they show.
          </Note>

          {loading || error ? (
            <PageStatus loading={loading} error={error} label="Unrolling the map" />
          ) : (
            <div className="relative mt-8 lg:mt-[18px]">
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

              <ol className="stagger relative z-10 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-6">
                {acts.map((act, i) => (
                  <li key={act.id} className={PLACEMENT[i] || ""}>
                    <ActCard act={act} />
                  </li>
                ))}
                <li
                  aria-hidden="true"
                  className="hidden lg:col-start-6 lg:row-start-2 lg:flex lg:items-start lg:justify-end"
                >
                  <Note className="rotate-2 text-lg">
                    Find the clues. Collect the relics. Uncover the truth. Stop Mogambo.
                  </Note>
                </li>
              </ol>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[4.25rem] left-0 z-0 hidden size-40 lg:block"
              >
                <div className="relative size-full">
                  <img
                    src="/assets/mission-map/polaroids/polaroid-camera.png"
                    alt=""
                    className="absolute bottom-1 left-0 z-10 w-24 -rotate-6 object-contain drop-shadow-md"
                    loading="lazy"
                  />
                  <img
                    src="/assets/mission-map/polaroids/polaroid-architecture.png"
                    alt=""
                    className="absolute top-0 right-0 z-20 w-28 rotate-6 object-contain drop-shadow-md"
                    loading="lazy"
                  />
                  <img
                    src="/assets/mission-map/polaroids/polaroid-detective.png"
                    alt=""
                    className="absolute right-6 bottom-0 z-30 w-20 rotate-2 object-contain drop-shadow-md"
                    loading="lazy"
                  />
                </div>
              </div>
              <Note className="mx-auto mt-2 rotate-1 lg:hidden">
                Find the clues. Collect the relics. Uncover the truth. Stop Mogambo.
              </Note>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
