import { ART_SOURCES, slotSpec } from "../../lib/artSlots.js";
import Icon from "./Icon.jsx";

// Placeholder tones (picked per slot name so neighbouring slots look different).
const TONES = [
  ["#6b1f16", "#1f100c"], // blood sepia
  ["#7a5a2e", "#24180f"], // old gold
  ["#3d2a22", "#110d0b"], // smoke
  ["#5b2a3a", "#170d12"], // dusk
];

function toneFor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = TONES[h % TONES.length];
  return [
    "radial-gradient(circle at 30% 25%, rgb(255 255 255 / 0.12), transparent 45%)",
    "radial-gradient(ellipse at center, transparent 50%, rgb(0 0 0 / 0.55) 100%)",
    "repeating-linear-gradient(0deg, rgb(255 255 255 / 0.025) 0 1px, transparent 1px 3px)",
    `linear-gradient(135deg, ${a}, ${b})`,
  ].join(", ");
}

/**
 * An illustration from the designs. Renders the real image when one is registered (src prop or
 * ART_SOURCES in lib/artSlots.js), otherwise a placeholder at the slot's aspect ratio.
 * Slot names and expected sizes are listed in lib/artSlots.js.
 *
 * fill:    cover the nearest positioned parent instead of sizing by aspect ratio
 * compact: hide the slot label (for tiny slots like avatars)
 * icon:    placeholder icon name, or null for slots that sit behind text
 * alt:     describe the image; omit for decorative art
 */
export default function ArtSlot({
  name,
  src,
  alt = "",
  fill = false,
  compact = false,
  icon = "film",
  fit = "cover",
  className = "",
}) {
  const spec = slotSpec(name);
  const image = src ?? ART_SOURCES[name];
  const sizing = fill ? "absolute inset-0 h-full w-full" : "relative w-full";
  const style = fill ? {} : { aspectRatio: `${spec.w} / ${spec.h}` };

  if (image) {
    return <img src={image} alt={alt} loading="lazy" className={`${sizing} object-${fit} ${className}`} style={style} />;
  }

  return (
    <div
      data-art-slot={name}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`${sizing} overflow-hidden ${className}`}
      style={{ ...style, backgroundImage: toneFor(name) }}
    >
      {icon && (
        <Icon
          name={icon}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-bone/20 ${compact ? "size-1/2" : "size-10"}`}
          strokeWidth={1.4}
        />
      )}
      {!compact && (
        <span className="absolute bottom-1.5 left-2 right-2 truncate font-type text-[10px] tracking-wide text-bone/50">
          {name} &middot; {spec.w}&times;{spec.h}
        </span>
      )}
    </div>
  );
}
