import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../api/endpoints.js";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";

const inputCls =
  "w-full rounded-card border border-line bg-ink/80 px-3 py-2 text-bone placeholder:text-muted/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Enter the admin username and password.");
      return;
    }
    setBusy(true);
    try {
      await adminLogin(username.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-sm px-4 py-16">
      <div className="panel-dark p-6">
        <h1 className="font-heading text-2xl font-bold text-bone uppercase">Projection Room</h1>
        <p className="text-sm text-muted">Organiser login</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-3" noValidate>
          <div>
            <label htmlFor="admin-username" className="mb-1 block font-heading text-sm font-semibold text-bone">
              Username
            </label>
            <input
              id="admin-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-1 block font-heading text-sm font-semibold text-bone">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className={inputCls}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-blood-bright">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Spinner />}
            {busy ? "Checking" : "Enter"}
          </Button>
        </form>
      </div>
    </section>
  );
}
