// The hook layer: the only way pages get game data.
// Today `source` is the mock server (data/mockApi.js); with VITE_USE_MOCKS=false it is api/endpoints.js.
// Every hook returns an object with `loading` (and `error` where a request can fail).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "../context/GameDataContext.jsx";
import { formatClock } from "../lib/format.js";
import { useCountdown } from "./useCountdown.js";
import { source } from "./dataSource.js";

// Fetches once per `deps` change. Use for page-level data that is not part of the progress snapshot.
function useResource(fetcher, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, error: null, loading: true }));
    fetcher().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error) => alive && setState({ data: null, error, loading: false })
    );
    return () => {
      alive = false;
    };
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

// Adds solvedCount / missedCount / total / status ("done" | "current" | "locked") to each act, from its checkpoints.
// An act is done when every checkpoint is closed: solved, or missed with a wrong answer ("failed").
function withActStats(act) {
  const total = act.checkpoints.length;
  const solvedCount = act.checkpoints.filter((c) => c.status === "solved").length;
  const missedCount = act.checkpoints.filter((c) => c.status === "failed").length;
  const current = act.checkpoints.find((c) => c.status === "current") || null;
  const status = total > 0 && solvedCount + missedCount === total ? "done" : current ? "current" : "locked";
  return { ...act, total, solvedCount, missedCount, current, status };
}

// ---------- Progress snapshot (shared, refreshed after actions) ----------

// The event clock for this team. status: null (loading) | "idle" | "running" | "paused" | "ended".
// While running it ticks every second; otherwise it shows the time the server reported, frozen.
export function useEventClock() {
  const { event } = useGameStore();
  const running = event?.status === "running";
  const cd = useCountdown(running ? event.deadline : null);
  if (!event) return { status: null, remaining: null, label: "--:--:--" };
  if (running) return { status: cd.expired ? "ended" : "running", remaining: cd.remaining, label: cd.label };
  const remaining = event.status === "ended" ? 0 : event.remainingMs;
  return { status: event.status, remaining, label: formatClock(remaining) };
}

// Only the status, without a re-render every second (for pages that just need to know if flags are accepted).
export function useEventStatus() {
  const { event } = useGameStore();
  return event?.status ?? null;
}

export function useTeam() {
  const { progress, error } = useGameStore();
  return { loading: !progress && !error, error, team: progress?.team ?? null, stats: progress?.stats ?? null };
}

export function useActs() {
  const { progress, error } = useGameStore();
  return useMemo(() => {
    if (!progress) return { loading: !error, error, acts: [], currentAct: null, totalCheckpoints: 0 };
    const acts = progress.acts.map(withActStats);
    const currentAct = acts.find((a) => a.status === "current") || acts.findLast((a) => a.status === "done") || null;
    const totalCheckpoints = acts.reduce((n, a) => n + a.total, 0);
    return { loading: false, error, acts, currentAct, totalCheckpoints };
  }, [progress, error]);
}

export function useAct(actId) {
  const { loading, error, acts } = useActs();
  return { loading, error, act: acts.find((a) => String(a.id) === String(actId)) || null };
}

export function useRelics() {
  const { progress, error } = useGameStore();
  const relics = progress?.relics ?? [];
  return {
    loading: !progress && !error,
    error,
    relics,
    collected: relics.filter((r) => r.collected).length,
    total: relics.length,
  };
}

// Final face-off state from /progress. Safe defaults when the API (or mock mode) has no final boss yet.
//   unlocked: the final gate is open and not yet solved (show the CTA, pulse the Relics tab)
export function useFinale() {
  const { progress, event, error } = useGameStore();
  const relics = progress?.relics ?? [];
  const finalBoss = progress?.finalBoss ?? null;
  const finished = !!progress?.finished;
  const finishedAt = progress?.finishedAt ?? null;
  const startedAt = event?.startedAt ?? null;
  const timeTakenMs =
    finished && finishedAt && startedAt ? Math.max(0, new Date(finishedAt) - new Date(startedAt)) : null;
  return {
    loading: !progress && !error,
    finalBoss,
    relicsCollected: progress?.relicsCollected ?? relics.filter((r) => r.collected).length,
    relicsTotal: progress?.relicsTotal ?? relics.length,
    unlocked: finalBoss?.status === "current" && !!finalBoss.slug,
    finalMissed: finalBoss?.status === "failed", // wrong answer on the final: the run is over, no victory
    finished,
    finishedAt,
    timeTakenMs: Number.isFinite(timeTakenMs) ? timeTakenMs : null,
  };
}

export function useActivity() {
  const { progress, error } = useGameStore();
  return { loading: !progress && !error, error, activity: progress?.activity ?? [] };
}

// ---------- Per-page requests ----------

// error.data.code: "NOT_FOUND" | "LOCKED"
export function useGate(slug) {
  const { data, error, loading, reload } = useResource(() => source.getCheckpoint(slug), [slug]);
  return { loading, error, checkpoint: data?.checkpoint ?? null, reload };
}

export function useReel(cpId) {
  const { data, error, loading } = useResource(() => source.getReel(cpId), [cpId]);
  return { loading, error, reel: data?.reel ?? null, next: data?.next ?? null, missed: !!data?.missed };
}

export function useActTitles() {
  const { data, error, loading } = useResource(() => source.getActs(), []);
  return { loading, error, acts: data?.acts ?? [] };
}

export function useRules() {
  const { data, error, loading } = useResource(() => source.getRules(), []);
  return { loading, error, rules: data?.rules ?? [] };
}

// ---------- Actions ----------

export function useGameActions() {
  const { refresh } = useGameStore();

  // One attempt per checkpoint. Resolves { correct, missed, reel, next, relic, ... }; a wrong answer closes the
  // checkpoint too, so progress is refreshed either way. Rejects with ApiError (data.code: TOO_FAST |
  // ALREADY_SOLVED | ALREADY_ATTEMPTED | LOCKED | EVENT_NOT_STARTED | EVENT_PAUSED | EVENT_ENDED).
  const submitFlag = useCallback(
    async (slug, flag) => {
      const result = await source.submitFlag(slug, flag);
      await refresh();
      return result;
    },
    [refresh]
  );

  const revealHint = useCallback(
    async (slug, level) => {
      const result = await source.useHint(slug, level);
      await refresh();
      return result;
    },
    [refresh]
  );

  return { submitFlag, revealHint };
}
