import { Routes, Route, Navigate } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout.jsx";
import GameLayout from "./components/layout/GameLayout.jsx";
import AutoLayout from "./components/layout/AutoLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AdminRoute from "./routes/AdminRoute.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import MissionMap from "./pages/MissionMap.jsx";
import ChallengesHub from "./pages/ChallengesHub.jsx";
import ActChallenges from "./pages/ActChallenges.jsx";
import Gate from "./pages/Gate.jsx";
import ReelCard from "./pages/ReelCard.jsx";
import Relics from "./pages/Relics.jsx";
import Rules from "./pages/Rules.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public shell */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Route>

      {/* Game shell when logged in, public shell otherwise */}
      <Route element={<AutoLayout />}>
        <Route path="/rules" element={<Rules />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Team (needs team login) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<GameLayout />}>
          <Route path="/map" element={<MissionMap />} />
          <Route path="/challenges" element={<ChallengesHub />} />
          <Route path="/challenges/act/:actId" element={<ActChallenges />} />
          {/* Per-team gate slug; server decides which slug is valid for this team. */}
          <Route path="/gate/:slug" element={<Gate />} />
          <Route path="/reel/:cpId" element={<ReelCard />} />
          <Route path="/relics" element={<Relics />} />
          <Route path="/inventory" element={<Navigate to="/relics" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
