import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { adminMe } from "../api/endpoints.js";
import PageStatus from "../components/ui/PageStatus.jsx";

// Asks the server whether the admin cookie is valid before showing anything. The cookie is httpOnly, so the
// browser cannot check it by itself; every admin API route checks it again.
export default function AdminRoute() {
  const [state, setState] = useState("checking"); // checking | ok | no

  useEffect(() => {
    let alive = true;
    adminMe().then(
      () => alive && setState("ok"),
      () => alive && setState("no")
    );
    return () => {
      alive = false;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="mx-auto max-w-sm px-4">
        <PageStatus loading label="Checking admin access" />
      </div>
    );
  }
  if (state === "no") return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
