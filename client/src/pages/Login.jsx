import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import TeamAccessCard from "../components/game/TeamAccessCard.jsx";

// Standalone Team Access page (same card as the landing page).
export default function Login() {
  const { team } = useAuth();
  if (team) return <Navigate to="/map" replace />;

  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 py-12 sm:py-20">
      <h1 className="mb-2 w-full max-w-[24rem] rounded-[3px] bg-[#f7efdc] p-2 shadow-paper">
        <img src="/images/obscura-wordmark.png" alt="OBSCURA" className="block h-auto w-full" draggable="false" />
      </h1>
      <p className="mt-2 mb-8 font-hand text-2xl text-blood-bright">The Archive is broken.</p>
      <TeamAccessCard className="w-full" />
    </section>
  );
}
