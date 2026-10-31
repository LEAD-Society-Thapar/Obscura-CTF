import { Outlet } from "react-router-dom";
import PageTransition from "./PageTransition.jsx";
import GameNavbar from "./GameNavbar.jsx";
import TickerSlot from "./TickerSlot.jsx";
import CountdownChip from "../game/CountdownChip.jsx";
import TeamChip from "../game/TeamChip.jsx";

// Shell for logged-in team pages.
export default function GameLayout() {
  return (
    <div className="noir-backdrop flex min-h-screen flex-col">
      <GameNavbar
        chips={
          <>
            <CountdownChip />
            <TeamChip />
          </>
        }
      />
      <TickerSlot />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
