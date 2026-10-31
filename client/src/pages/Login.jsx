import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "../components/ui/Logo.jsx";
import TeamAccessCard from "../components/game/TeamAccessCard.jsx";

// Standalone Team Access page (same card as the landing page).
export default function Login() {
  const { team } = useAuth();
  if (team) return <Navigate to="/map" replace />;

  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-12 sm:py-20">
      <h1 className="sr-only">Team login</h1>
      <Logo className="text-5xl sm:text-6xl" />
      <p className="mt-2 mb-8 font-hand text-2xl text-blood-bright">The Archive is broken.</p>
      <TeamAccessCard className="w-full" />
    </section>
  );
}
