import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import Button from "../ui/Button.jsx";
import PaperCard from "../ui/PaperCard.jsx";
import Spinner from "../ui/Spinner.jsx";

const inputCls =
  "mt-1 w-full rounded-[3px] border border-parchment-ink/30 bg-[#f7efdc]/85 px-3 py-2 text-parchment-ink placeholder:text-parchment-ink/55 focus:border-blood focus:outline-none focus-visible:outline-2 focus-visible:outline-blood";

// "Team Access" login card (design 1). Used on the landing page and /login.
export default function TeamAccessCard({ className = "" }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [teamId, setTeamId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!teamId.trim() || !password) {
      setError("Enter your Team ID and password.");
      return;
    }
    setBusy(true);
    try {
      await login(teamId.trim(), password);
      navigate(location.state?.from?.pathname || "/map", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <PaperCard as="section" aria-labelledby="team-access-heading" className={className} innerClassName="px-6 py-8 sm:px-8">
      <h2
        id="team-access-heading"
        className="text-center font-heading text-3xl font-bold tracking-wide text-parchment-ink uppercase"
      >
        Team Access
      </h2>
      <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
        <div>
          <label htmlFor="team-id" className="block font-heading text-sm font-bold">
            Team ID
          </label>
          <input
            id="team-id"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            placeholder="Enter your team ID"
            autoComplete="username"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="team-password" className="block font-heading text-sm font-bold">
            Password
          </label>
          <input
            id="team-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            className={inputCls}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-blood">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Spinner />}
          {busy ? "Opening the archive" : "Enter the Archive"}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-parchment-ink/80">Access granted only to registered teams.</p>
    </PaperCard>
  );
}
