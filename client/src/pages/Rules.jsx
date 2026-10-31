import { useRules } from "../hooks/useGameData.js";
import RuleItem from "../components/game/RuleItem.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";

// Design 8: rulebook. Public page; shows the game navbar when a team is logged in.
export default function Rules() {
  const { loading, error, rules } = useRules();

  return (
    <section aria-labelledby="rules-heading" className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-0">
      <div className="panel-dark p-6 sm:p-10">
        <h1 id="rules-heading" className="font-display text-4xl tracking-wide text-bone uppercase sm:text-5xl">
          Rulebook
        </h1>
        {loading || error ? (
          <PageStatus loading={loading} error={error} />
        ) : (
          <ol className="stagger mt-4 divide-y divide-line/60">
            {rules.map((r, i) => (
              <RuleItem key={r.id} n={i + 1} icon={r.icon} title={r.title} body={r.body} />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
