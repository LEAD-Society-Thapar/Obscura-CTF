import { formatPoints } from "../../lib/format.js";

// variant="text": gold "100 pts" (design 3 rows). variant="tag": boxed chip (design 4 header).
export default function PointsBadge({ points, variant = "text", className = "" }) {
  if (variant === "tag") {
    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-chip border border-line bg-ink-raised px-3 py-0.5 font-heading text-sm font-semibold text-bone ${className}`}
      >
        {formatPoints(points)}
      </span>
    );
  }
  return (
    <span className={`shrink-0 font-heading font-semibold whitespace-nowrap text-gold ${className}`}>
      {formatPoints(points)}
    </span>
  );
}
