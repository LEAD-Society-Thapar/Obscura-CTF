import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [teamCode, setTeamCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(teamCode.trim());
      navigate(location.state?.from?.pathname || "/map", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-sm">
      <h1 className="text-2xl font-semibold">Team login</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          value={teamCode}
          onChange={(e) => setTeamCode(e.target.value)}
          placeholder="Team code"
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          autoFocus
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={busy || !teamCode.trim()}
          className="px-4 py-2 rounded-md bg-neutral-100 text-neutral-900 text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Checking..." : "Enter"}
        </button>
      </form>
    </section>
  );
}
