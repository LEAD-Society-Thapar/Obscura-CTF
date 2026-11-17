import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { source } from "../hooks/dataSource.js";

// Holds the logged-in team's progress snapshot + event clock. Pages read it through hooks/useGameData.js.
const GameDataContext = createContext(null);

// The clock is polled so a start, pause, resume or extra time from the admin page reaches every screen.
// Faster while waiting for the start (the "Round 1 has started" prompt) or for an organiser to lift a full-screen
// lock, so teams are not left waiting.
const CLOCK_POLL_MS = 20_000;
const CLOCK_POLL_WAITING_MS = 5_000;

// The server sends remainingMs; `deadline` is that turned into a time on THIS device, so the countdown is right
// even when the device clock is wrong. Only set while the clock is running.
const withDeadline = (e) => ({ ...e, deadline: e.status === "running" ? Date.now() + e.remainingMs : null });

export function GameDataProvider({ children }) {
  const { team } = useAuth();
  const [progress, setProgress] = useState(null);
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([source.getProgress(), source.getEventState()]);
      setProgress(p);
      setEvent(withDeadline(e));
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  const refreshEvent = useCallback(async () => {
    try {
      setEvent(withDeadline(await source.getEventState()));
    } catch {
      /* keep the last known clock; the next poll tries again */
    }
  }, []);

  useEffect(() => {
    if (!team) {
      setProgress(null);
      setEvent(null);
      return undefined;
    }
    refresh();
    // Coming back to the tab: a team-mate may have closed a checkpoint on another device.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [team, refresh, refreshEvent]);

  const waiting = !event || event.status === "idle" || !!event.fullscreen?.locked;
  useEffect(() => {
    if (!team) return undefined;
    const poll = setInterval(refreshEvent, waiting ? CLOCK_POLL_WAITING_MS : CLOCK_POLL_MS);
    return () => clearInterval(poll);
  }, [team, waiting, refreshEvent]);

  // A device left full screen: the server counts it and answers with the team's clock and full-screen state.
  const reportViolation = useCallback(async () => {
    try {
      const res = await source.reportViolation();
      const { counted: _counted, ...clock } = res;
      setEvent(withDeadline(clock));
      return res;
    } catch {
      refreshEvent();
      return null;
    }
  }, [refreshEvent]);

  // When the local countdown reaches zero, ask the server (the clock may have been paused or extended meanwhile).
  const deadline = event?.deadline ?? null;
  useEffect(() => {
    if (!deadline) return undefined;
    const id = setTimeout(refreshEvent, Math.max(0, deadline - Date.now()) + 400);
    return () => clearTimeout(id);
  }, [deadline, refreshEvent]);

  return (
    <GameDataContext.Provider value={{ progress, event, error, refresh, refreshEvent, reportViolation }}>
      {children}
    </GameDataContext.Provider>
  );
}

export function useGameStore() {
  const ctx = useContext(GameDataContext);
  if (!ctx) throw new Error("useGameStore must be used inside <GameDataProvider>");
  return ctx;
}
