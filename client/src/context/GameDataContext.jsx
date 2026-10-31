import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { source } from "../hooks/dataSource.js";

// Holds the logged-in team's progress snapshot + event clock. Pages read it through hooks/useGameData.js.
const GameDataContext = createContext(null);

export function GameDataProvider({ children }) {
  const { team } = useAuth();
  const [progress, setProgress] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([source.getProgress(), source.getEventState()]);
      setProgress(p);
      setEvent(e);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    if (team) {
      refresh();
    } else {
      setProgress(null);
      setEvent(null);
    }
  }, [team, refresh]);

  return (
    <GameDataContext.Provider value={{ progress, event, error, refresh }}>{children}</GameDataContext.Provider>
  );
}

export function useGameStore() {
  const ctx = useContext(GameDataContext);
  if (!ctx) throw new Error("useGameStore must be used inside <GameDataProvider>");
  return ctx;
}
