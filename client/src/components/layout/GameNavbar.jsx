import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useFinale } from "../../hooks/useGameData.js";
import Logo from "../ui/Logo.jsx";
import Icon from "../ui/Icon.jsx";

const tabs = [
  { to: "/map", label: "Map" },
  // Challenges stays active on act lists and gate pages too.
  { to: "/challenges", label: "Challenges", match: ["/challenges", "/gate", "/reel"] },
  { to: "/relics", label: "Relics" },
  { to: "/rules", label: "Rules" },
];

function Tabs({ className }) {
  const { pathname } = useLocation();
  const { unlocked } = useFinale(); // final face-off open and not yet solved
  return (
    <ul className={className}>
      {tabs.map((t) => {
        const active = t.match ? t.match.some((p) => pathname.startsWith(p)) : pathname === t.to;
        const pulse = unlocked && t.to === "/relics";
        return (
          <li key={t.to} className="shrink-0">
            <Link
              to={t.to}
              aria-current={active ? "page" : undefined}
              className={`relative block px-3 py-2 font-heading text-sm font-semibold tracking-wide transition-colors ${
                active
                  ? "text-bone after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:bg-blood-bright"
                  : pulse
                    ? "text-blood-bright hover:text-bone"
                    : "text-muted hover:text-bone"
              }`}
            >
              {t.label}
              {pulse && (
                <>
                  <span aria-hidden="true" className="absolute top-1.5 right-0.5 flex size-2">
                    <span className="absolute inline-flex size-full rounded-full bg-blood-bright opacity-75 motion-safe:animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-blood-bright" />
                  </span>
                  <span className="sr-only"> (final face-off unlocked)</span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Design 2-8 navbar: logo, tabs, countdown chip, team chip.
// `chips` is rendered on the right (CountdownChip + TeamChip, passed in by GameLayout).
export default function GameNavbar({ chips }) {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-[#b58a42]/60 bg-[#0b0908]/95 shadow-[inset_0_-1px_0_rgba(181,138,66,0.35)] backdrop-blur-sm">
      <nav aria-label="Game" className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <Link to="/map" aria-label="OBSCURA mission map">
              <Logo className="text-lg sm:text-2xl" />
            </Link>
            <Tabs className="hidden items-center gap-1 md:flex" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {chips}
            <button
              type="button"
              onClick={logout}
              className="rounded-chip p-2 text-muted transition-colors hover:text-bone"
              title="Log out"
            >
              <Icon name="logout" />
              <span className="sr-only">Log out</span>
            </button>
          </div>
        </div>
        {/* Mobile: tabs move to a scrollable row under the logo. */}
        <Tabs className="-mx-4 flex overflow-x-auto px-2 pb-1 md:hidden" />
      </nav>
    </header>
  );
}
