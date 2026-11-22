import { useFinale, useTeam } from "../../hooks/useGameData.js";
import { formatDuration, formatPoints } from "../../lib/format.js";
import Button from "../ui/Button.jsx";
import Icon from "../ui/Icon.jsx";

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-card border bg-ink/60 px-4 py-3 ${tone === "gold" ? "border-gold-soft/40" : "border-blood/40"}`}>
      <dt className="font-type text-[10px] tracking-[0.25em] text-muted uppercase">{label}</dt>
      <dd className={`mt-1 font-heading text-2xl font-bold tabular-nums ${tone === "gold" ? "text-gold" : "text-bone"}`}>{value}</dd>
    </div>
  );
}

const LOOK = {
  victory: {
    eyebrow: "Mission complete",
    heading: "Victory",
    icon: "trophy",
    tone: "gold",
    box: "border-gold bg-[radial-gradient(ellipse_at_top,rgba(217,164,65,0.18),transparent_60%),linear-gradient(135deg,#2a0d0e,#121010)] shadow-glow-gold",
    badge: "bg-gold/15 text-gold ring-gold/60",
  },
  defeat: {
    eyebrow: "The final face-off is lost",
    heading: "Mogambo escaped",
    icon: "mask",
    tone: "blood",
    box: "border-blood/70 bg-[radial-gradient(ellipse_at_top,rgba(212,37,43,0.16),transparent_60%),linear-gradient(135deg,#1d0a0b,#121010)]",
    badge: "bg-blood-deep/60 text-blood-bright ring-blood/60",
  },
  timeUp: {
    eyebrow: "The hunt is over",
    heading: "Time's up",
    icon: "clock",
    tone: "blood",
    box: "border-blood/70 bg-[linear-gradient(135deg,#1d0a0b,#121010)]",
    badge: "bg-blood-deep/60 text-blood-bright ring-blood/60",
  },
};

// Shown once the hunt is over for this team (ChallengesHub, Relics): the final was solved, every attempt on it was
// used, or the clock ran out. Every outcome gets its score and a way to the final report.
// No rank: standings are revealed by the organisers at the end. Time taken is omitted when unknown.
export default function OutcomePanel({ className = "" }) {
  const { outcome, timeTakenMs } = useFinale();
  const { team } = useTeam();
  if (!outcome || !team) return null;
  const look = LOOK[outcome];

  return (
    <section aria-labelledby="outcome-heading" className={`relative overflow-hidden rounded-card border p-5 sm:p-6 ${look.box} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`grid size-12 shrink-0 place-items-center rounded-full ring-1 ${look.badge}`}>
            <Icon name={look.icon} className="size-6" />
          </span>
          <div>
            <p className={`font-type text-[10px] tracking-[0.3em] uppercase ${look.tone === "gold" ? "text-gold" : "text-blood-bright"}`}>
              {look.eyebrow}
            </p>
            <h2 id="outcome-heading" className="font-display text-3xl tracking-wide text-bone uppercase sm:text-4xl">
              {look.heading}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button to="/report" size="sm" caps={false}>
            View final report <Icon name="arrowRight" className="size-4" />
          </Button>
          {outcome === "victory" && (
            <Button to="/reel/final" variant="outline" size="sm" caps={false}>
              Replay the ending
            </Button>
          )}
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <Stat label="Final score" value={formatPoints(team.points)} tone={look.tone} />
        {timeTakenMs != null && <Stat label="Time taken" value={formatDuration(timeTakenMs)} tone={look.tone} />}
      </dl>
      <p className="mt-3 text-xs text-muted">Final standings are revealed by the organisers when the hunt ends.</p>
    </section>
  );
}
