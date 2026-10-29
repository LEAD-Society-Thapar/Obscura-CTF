import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../api/endpoints.js";

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
    <section className="max-w-sm">
      <h1 className="text-2xl font-semibold">Admin login</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="px-4 py-2 rounded-md bg-neutral-100 text-neutral-900 text-sm font-medium">Enter</button>
      </form>
    </section>
  );
}
