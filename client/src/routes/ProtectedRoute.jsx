import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const { team, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="p-6 text-neutral-400">Loading...</p>;
  if (!team) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
