import { Navigate, Outlet } from "react-router-dom";

// TODO: replace with a real check (e.g. GET /api/admin/me) once admin auth is built.
export default function AdminRoute() {
  const isAdmin = sessionStorage.getItem("sat_admin") === "1";
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}
