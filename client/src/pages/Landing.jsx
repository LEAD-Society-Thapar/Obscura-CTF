import { useEffect, useState } from "react";
import { health } from "../api/endpoints.js";
import { useActTitles } from "../hooks/useGameData.js";
import ArtSlot from "../components/ui/ArtSlot.jsx";
import Logo from "../components/ui/Logo.jsx";
import PaperCard from "../components/ui/PaperCard.jsx";
import StampLabel from "../components/ui/StampLabel.jsx";
import TeamAccessCard from "../components/game/TeamAccessCard.jsx";

// Design 1: landing + team login.
export default function Landing() {
  const [status, setStatus] = useState("checking");
  const { acts } = useActTitles();

  useEffect(() => {
    health()
      .then(() => setStatus("online"))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <>
      <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-line/60">
        {/* Background collage (design 1). Placeholder until art arrives. */}
        <div className="absolute inset-0 opacity-60">
          <ArtSlot name="landing-hero" fill icon={null} />
        </div>
        <div className="absolute inset-0 bg-linear-to-r from-ink/30 via-transparent to-ink/70" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-20">
          <PaperCard innerClassName="relative px-6 pt-8 pb-10 sm:px-10">
            <p className="w-48 -rotate-6 font-hand text-xl leading-tight text-parchment-ink/85 uppercase sm:text-2xl">
              Some stories are real. Some lies live forever.
            </p>

            <h1 id="hero-heading" className="mt-4 text-center">
              <Logo tone="dark" className="block text-[3.25rem] sm:text-8xl" />
              <span className="mt-3 block font-heading text-lg font-bold tracking-[0.18em] text-parchment-ink uppercase sm:text-2xl">
                A Student Capture the Flag Event
              </span>
            </h1>
            <p className="mt-4 text-center font-hand text-3xl font-bold text-blood sm:text-4xl">
              <span className="underline decoration-blood/70 decoration-2 underline-offset-6">The Archive is broken.</span>
            </p>

            <div className="mt-10 flex flex-wrap items-end justify-between gap-6">
              <StampLabel tone="ink" className="text-sm [--stamp-rotate:-4deg]">
                Filmistan
                <br />
                Archives
              </StampLabel>
              <StampLabel className="text-lg [--stamp-rotate:-6deg] sm:text-xl">Confidential</StampLabel>
            </div>
          </PaperCard>

          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <TeamAccessCard />
            <p className="mt-4 text-center font-type text-xs text-muted" aria-live="polite">
              Archive server:{" "}
              <span className={status === "online" ? "text-gold" : "text-muted"}>
                {status === "checking" ? "checking..." : status}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section id="acts" aria-labelledby="acts-heading" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:px-6">
        <h2 id="acts-heading" className="text-center font-heading text-3xl font-bold tracking-wide uppercase">
          The Acts
        </h2>
        <p className="mt-1 text-center font-type text-sm text-muted uppercase">
          Five acts. Twenty checkpoints. One final face-off.
        </p>
        <ol className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {acts.map((act) => (
            <li key={act.id} className="panel-dark px-4 py-5 text-center">
              <span className="inline-block bg-blood px-3 py-0.5 font-heading text-sm font-bold tracking-wider uppercase">
                Act {act.id}
              </span>
              <span className="mt-3 block font-heading text-lg font-bold uppercase">{act.title}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
