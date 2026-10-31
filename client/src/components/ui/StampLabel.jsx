const TONES = {
  blood: "text-blood",
  ink: "text-parchment-ink",
  gold: "text-gold",
  bone: "text-bone",
};

// Rubber-stamp label ("CLUE UNLOCKED", "CONFIDENTIAL"). Rotate with className="[--stamp-rotate:6deg]".
export default function StampLabel({ children, tone = "blood", animate = false, className = "" }) {
  return (
    <span className={`stamp ${TONES[tone]} ${animate ? "motion-safe:animate-stamp-in" : ""} ${className}`}>
      {children}
    </span>
  );
}
