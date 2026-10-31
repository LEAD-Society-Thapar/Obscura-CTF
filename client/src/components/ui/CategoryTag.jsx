// Challenge category chip. Colours are the --color-tag-* tokens in index.css.
const COLORS = {
  web: "bg-tag-web",
  crypto: "bg-tag-crypto",
  misc: "bg-tag-misc",
  stego: "bg-tag-stego",
};

export default function CategoryTag({ category, className = "" }) {
  const color = COLORS[category?.toLowerCase()] || "bg-tag-default";
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-chip px-2.5 py-0.5 font-heading text-xs font-semibold tracking-wide text-bone ring-1 ring-inset ring-white/10 ${color} ${className}`}
    >
      {category}
      <span className="sr-only"> category</span>
    </span>
  );
}
