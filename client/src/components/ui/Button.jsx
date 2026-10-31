import { Link } from "react-router-dom";

const VARIANTS = {
  primary:
    "border border-blood-bright/60 bg-blood text-bone shadow-[0_0_18px_-6px_var(--color-blood-bright)] not-disabled:hover:bg-blood-bright",
  outline: "border border-blood-bright/60 bg-blood-deep/50 text-bone not-disabled:hover:bg-blood/70",
  ghost: "text-muted hover:text-bone",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-6 py-3 text-lg",
};

// Renders a router <Link> when `to` is given, otherwise a <button>.
// caps=false for sentence-case buttons ("Submit Flag", "Reveal Hint").
export default function Button({ to, variant = "primary", size = "md", caps = true, className = "", children, ...rest }) {
  const cls = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-chip font-heading font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
    caps ? "uppercase tracking-wider" : "tracking-wide"
  } ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
