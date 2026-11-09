import { useRules } from "../hooks/useGameData.js";
import RuleItem from "../components/game/RuleItem.jsx";
import PageStatus from "../components/ui/PageStatus.jsx";
import "./Rules.css";

// Design 8: rulebook. Public page; shows the game navbar when a team is logged in.
const CORRECTED_RULE_BODIES = {
  3: "- Submit answers in the format `OBSCURA{answer}`. You may also submit the bare answer without the wrapper.\n- Answers are case-insensitive, and spaces are ignored.\n- Read challenge instructions carefully and follow the requested format, including underscores or other specified separators.\n- Incorrect submissions do not incur a score penalty or submission limit. You may retry until you find the correct answer.",
  5: "- Each checkpoint provides two optional hints. Hints are unlocked sequentially.\n- Hint 1: 20% deduction from that checkpoint's maximum points.\n- Hint 2: Additional 40% deduction.\n- Using both hints: 60% cumulative deduction.\n- Use hints strategically. Sometimes figuring things out yourself is worth more than the shortcut.",
};

export default function Rules() {
  const { loading, error, rules } = useRules();
  const sections = rules.reduce((groups, rule) => {
    const title = rule.section || "Competition Rules";
    let group = groups.at(-1);
    if (!group || group.title !== title) {
      group = { title, rules: [] };
      groups.push(group);
    }
    group.rules.push(rule);
    return groups;
  }, []);

  return (
    <section aria-labelledby="rules-heading" className="rulebook mx-auto w-full max-w-3xl px-4 py-8 sm:px-0">
      <div className="rulebook-document panel-dark overflow-hidden p-6 sm:p-10">
        <header className="border-b border-gold/25 pb-6">
          <p className="rulebook-file rulebook-mono text-gold-soft uppercase">OBSCURA ARCHIVE / FIELD RULES</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
            <h1 id="rules-heading" className="rulebook-serif text-4xl tracking-wide text-bone uppercase sm:text-5xl">
              Rulebook
            </h1>
            <span className="rulebook-file rulebook-mono text-muted uppercase">CLASSIFICATION: TEAM BRIEF</span>
          </div>
          <p className="rulebook-serif mt-4 text-lg leading-relaxed text-bone/90 sm:text-xl">
            Welcome, Agents. The Archive has been stolen. Mogambo is <em>khush</em>, and your mission is to recover the
            five relics, uncover the hidden truth, and stop him before the picture ends.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Read the following rules carefully before starting your hunt.
          </p>
        </header>
        {loading || error ? (
          <PageStatus loading={loading} error={error} />
        ) : (
          <div className="mt-7 space-y-8 sm:mt-8">
            {sections.map((section, index) => (
              <section key={section.title} aria-label={section.title} className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/35 pb-2">
                  <h2 className="rulebook-section-heading text-xl tracking-wide text-gold uppercase sm:text-2xl">
                    {section.title}
                  </h2>
                  <div className="flex items-center gap-3">
                    {section.title.startsWith("III.") && (
                      <span className="rulebook-warning-stamp" aria-label="Fair play warning">
                        FAIR PLAY
                      </span>
                    )}
                    <span className="rulebook-file rulebook-mono text-muted uppercase">
                      FILE {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <ol className="stagger divide-y divide-line/60">
                  {section.rules.map((rule) => (
                    <RuleItem
                      key={rule.id}
                      n={rule.id}
                      icon={rule.icon}
                      title={rule.title}
                      body={CORRECTED_RULE_BODIES[rule.id] || rule.body}
                    />
                  ))}
                </ol>
              </section>
            ))}
            <section
              aria-labelledby="mission-heading"
              className="border-y border-gold/30 px-2 py-6 text-center sm:px-6 sm:py-8"
            >
              <p className="rulebook-file rulebook-mono text-gold-soft uppercase">END OF FIELD RULES / MISSION ORDER</p>
              <h2 id="mission-heading" className="rulebook-serif mt-3 text-2xl tracking-wide text-gold uppercase">
                Your Mission
              </h2>
              <p className="rulebook-serif mt-4 text-lg leading-relaxed text-bone sm:text-xl">
                Five Acts. Twenty Checkpoints. Five Relics. One Final Face-off.
              </p>
              <p className="rulebook-serif mt-2 text-lg font-bold text-blood-bright sm:text-xl">
                Recover the Archive. Defeat Mogambo.
              </p>
              <p className="rulebook-serif mt-5 text-xl text-gold sm:text-2xl">MOGAMBO DUKHI HUA!</p>
              <p className="rulebook-serif mt-2 text-lg italic text-muted">Picture abhi baaki hai, mere dost.</p>
              <p className="rulebook-file rulebook-mono mt-5 text-muted uppercase">OBSCURA / ARCHIVE COPY / 01</p>
            </section>
          </div>
        )}
      </div>
    </section>
  );
}
