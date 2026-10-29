import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { health } from "../api/endpoints.js";

export default function Landing() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    health()
      .then((d) => setStatus(`server ok (${d.env})`))
      .catch(() => setStatus("server unreachable"));
  }, []);

  return (
    <section>
      <h1 className="text-3xl font-semibold">Mogambo ka Archive</h1>
      <p className="mt-2 text-neutral-400">
        Landing page: cutscene, countdown and team login go here.
      </p>
      <p className="mt-4 text-sm font-mono text-neutral-500">API status: {status}</p>
      <Link
        to="/login"
        className="inline-block mt-6 px-4 py-2 rounded-md bg-neutral-100 text-neutral-900 text-sm font-medium"
      >
        Team login
      </Link>
    </section>
  );
}
