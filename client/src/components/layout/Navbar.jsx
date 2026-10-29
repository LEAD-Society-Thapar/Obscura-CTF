import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-md text-sm ${
    isActive ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
  }`;

export default function Navbar() {
  const { team, logout } = useAuth();

  return (
    <header className="border-b border-neutral-800">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold">
          SAT CTF
        </Link>
        <div className="flex items-center gap-1">
          <NavLink to="/leaderboard" className={linkClass}>
            Leaderboard
          </NavLink>
          {team ? (
            <>
              <NavLink to="/map" className={linkClass}>
                Map
              </NavLink>
              <NavLink to="/inventory" className={linkClass}>
                Inventory
              </NavLink>
              <button onClick={logout} className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white">
                Logout ({team.name})
              </button>
            </>
          ) : (
            <NavLink to="/login" className={linkClass}>
              Team login
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  );
}
