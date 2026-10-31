// Torn parchment container (designs 1, 5, 7). The outer element carries the shadow because
// the torn clip-path on the inner element would cut a normal box-shadow.
export default function PaperCard({ as: Tag = "div", torn = true, className = "", innerClassName = "p-6", children, ...rest }) {
  return (
    <Tag className={`drop-shadow-[0_14px_22px_rgba(0,0,0,0.55)] ${className}`} {...rest}>
      <div className={`paper-texture ${torn ? "torn-edge" : "rounded-card"} ${innerClassName}`}>{children}</div>
    </Tag>
  );
}
