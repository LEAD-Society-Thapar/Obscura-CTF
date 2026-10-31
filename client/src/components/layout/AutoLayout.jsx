import { useAuth } from "../../context/AuthContext.jsx";
import GameLayout from "./GameLayout.jsx";
import PublicLayout from "./PublicLayout.jsx";

// Pages reachable both before and during the game (/rules, /leaderboard, 404):
// game navbar when a team is logged in (design 8), public navbar otherwise.
export default function AutoLayout() {
  const { team } = useAuth();
  return team ? <GameLayout /> : <PublicLayout />;
}
