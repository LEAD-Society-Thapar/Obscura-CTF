import { EVENT_NAME } from "../../lib/config.js";

// Wordmark: "OBSCUR" + a blood-red final letter, as in every design.
// tone="light" for dark backgrounds (navbars), tone="dark" for parchment (landing hero).
export default function Logo({ tone = "light", className = "text-xl" }) {
  const head = EVENT_NAME.slice(0, -1);
  const tail = EVENT_NAME.slice(-1);
  return (
    <span className={`font-display tracking-wide leading-none ${className}`}>
      <span className={tone === "light" ? "text-bone" : "text-parchment-ink"}>{head}</span>
      <span className="text-blood-bright">{tail}</span>
    </span>
  );
}
