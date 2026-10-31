import ArtSlot from "../ui/ArtSlot.jsx";

// Round team portrait with a gold ring (navbar chip, dashboard card).
export default function TeamAvatar({ slot = "team-avatar", className = "size-9" }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full ring-2 ring-gold-soft ${className}`}>
      <ArtSlot name={slot} fill compact icon="user" />
    </span>
  );
}
