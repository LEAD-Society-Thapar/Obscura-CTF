import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../api/endpoints.js";
import Button from "../../components/ui/Button.jsx";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await adminLogin(password);
      sessionStorage.setItem("sat_admin", "1");
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="mx-auto max-w-sm px-4 py-16">
      <div className="panel-dark p-6">
        <h1 className="font-heading text-2xl font-bold text-bone uppercase">Projection Room</h1>
        <p className="text-sm text-muted">Admin login</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label htmlFor="admin-password" className="sr-only">
            Admin password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoComplete="current-password"
            className="w-full rounded-card border border-line bg-ink/80 px-3 py-2 text-bone placeholder:text-muted/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-gold"
          />
          {error && (
            <p role="alert" className="text-sm text-blood-bright">
              {error}
            </p>
          )}
          <Button type="submit" size="sm">
            Enter
          </Button>
        </form>
      </div>
    </section>
  );
}
