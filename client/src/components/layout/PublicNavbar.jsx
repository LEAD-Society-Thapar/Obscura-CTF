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
  `px-0.5 py-1.5 font-heading text-xs font-semibold tracking-wide transition-colors sm:px-3 sm:text-base ${
    isActive ? "text-bone" : "text-muted hover:text-bone"
  }`;

export default function PublicNavbar() {
  const { team } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-ink/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-20 max-w-6xl flex-col justify-center gap-1 px-3 sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-6">
        <div className="flex min-w-0 items-center">
          <Link
            to="/"
            aria-label="LEAD home"
            className="lead-logo-crop shrink-0"
          >
            <img
              src="/assets/lead-logo-white.png"
              alt="LEAD"
              className="lead-logo-crop__image"
              draggable="false"
            />
          </Link>
          <span aria-hidden="true" className="mx-3 h-7 w-px shrink-0 bg-bone/25 sm:mx-4" />
          <Link to="/" aria-label="OBSCURA home">
            <Logo className="text-[1.5rem] whitespace-nowrap sm:text-[1.5rem]" />
          </Link>
        </div>
        <div className="flex w-full items-center justify-end gap-0.5 sm:w-auto sm:justify-normal sm:gap-3">
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
