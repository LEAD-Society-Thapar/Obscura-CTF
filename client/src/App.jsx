import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AdminRoute from "./routes/AdminRoute.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import FilmistanMap from "./pages/FilmistanMap.jsx";
import Checkpoint from "./pages/Checkpoint.jsx";
import ReelCard from "./pages/ReelCard.jsx";
import Inventory from "./pages/Inventory.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/leaderboard" element={<Leaderboard />} />

        {/* Team (needs team login) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/map" element={<FilmistanMap />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reel/:cpNumber" element={<ReelCard />} />
          {/* Per-team gate slug; server decides which slug is valid for this team. */}
          <Route path="/gate/:slug" element={<Checkpoint />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
