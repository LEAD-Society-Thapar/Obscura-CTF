import { Link } from "react-router-dom";
import { useTeam } from "../../hooks/useGameData.js";
import { formatPoints } from "../../lib/format.js";
import TeamAvatar from "./TeamAvatar.jsx";

// Navbar team chip: avatar, "Team 07", points. Links to the team dashboard.
export default function TeamChip() {
  const { team } = useTeam();

  if (!team) {
    return <div aria-hidden="true" className="h-11 w-14 animate-pulse rounded-chip bg-ink-raised sm:w-32" />;
  }

  return (
    <Link
      to="/challenges"
      aria-label={`${team.name}, ${team.points} points. Open team dashboard`}
      className="flex items-center gap-2 rounded-chip border border-line bg-ink-soft px-1.5 py-1 transition-colors hover:border-gold-soft sm:px-3"
    >
      <TeamAvatar className="size-8 sm:size-9" />
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-xs text-muted">{team.name}</span>
        <span className="font-heading font-bold text-gold">{formatPoints(team.points)}</span>
      </span>
      <span className="pr-1 font-heading text-sm font-bold text-gold sm:hidden">{team.points}</span>
    </Link>
  );
}
