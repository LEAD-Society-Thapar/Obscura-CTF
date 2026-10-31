import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Logo from "../ui/Logo.jsx";

// Design 1 navbar. The mockup's second link ("History"?) is unreadable, so it is left out.
const links = [
  { to: "/", label: "Home", end: true },
  { to: "/#acts", label: "Acts" },
  { to: "/rules", label: "Rules" },
];

const linkClass = ({ isActive }) =>
  `px-1.5 sm:px-3 py-1.5 font-heading text-sm sm:text-base font-semibold tracking-wide transition-colors ${
    isActive ? "text-bone" : "text-muted hover:text-bone"
  }`;

export default function PublicNavbar() {
  const { team } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-ink/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/" aria-label="OBSCURA home">
          <Logo className="text-lg sm:text-xl" />
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          {links.map((l) =>
            l.to.includes("#") ? (
              <a key={l.to} href={l.to} className={linkClass({ isActive: false })}>
                {l.label}
              </a>
            ) : (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            )
          )}
          <Link
            to={team ? "/map" : "/login"}
            className="ml-1 whitespace-nowrap rounded-chip border border-blood-bright/60 bg-blood px-2.5 py-1.5 font-heading text-sm font-semibold tracking-wide text-bone shadow-[0_0_18px_-6px_var(--color-blood-bright)] transition-colors hover:bg-blood-bright sm:px-4"
          >
            {team ? "Enter Game" : "Team Login"}
          </Link>
        </div>
      </nav>
    </header>
  );
}
