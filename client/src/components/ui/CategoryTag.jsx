// Challenge category chip. Colours are the --color-tag-* tokens in index.css.
// Text and ring colour live in each entry (not the base classes) so two utilities never compete.
const PLAIN = "text-bone ring-white/10";
const COLORS = {
  web: `bg-tag-web ${PLAIN}`,
  crypto: `bg-tag-crypto ${PLAIN}`,
  misc: `bg-tag-misc ${PLAIN}`,
  stego: `bg-tag-stego ${PLAIN}`,
  meta: "bg-tag-meta text-gold ring-gold/70", // final boss
};

export default function CategoryTag({ category, className = "" }) {
  const color = COLORS[category?.toLowerCase()] || `bg-tag-default ${PLAIN}`;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-chip px-2.5 py-0.5 font-heading text-xs font-semibold tracking-wide ring-1 ring-inset ${color} ${className}`}
    >
      {category}
      <span className="sr-only"> category</span>
    </span>
  );
}
