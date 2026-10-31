// The hook layer: the only way pages get game data.
// Today `source` is the mock server (data/mockApi.js); with VITE_USE_MOCKS=false it is api/endpoints.js.
// Every hook returns an object with `loading` (and `error` where a request can fail).
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "../context/GameDataContext.jsx";
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

// Adds solvedCount / total / status ("done" | "current" | "locked") to each act, from its checkpoints.
function withActStats(act) {
  const total = act.checkpoints.length;
  const solvedCount = act.checkpoints.filter((c) => c.status === "solved").length;
  const current = act.checkpoints.find((c) => c.status === "current") || null;
  const status = total > 0 && solvedCount === total ? "done" : current ? "current" : "locked";
  return { ...act, total, solvedCount, current, status };
}

// ---------- Progress snapshot (shared, refreshed after actions) ----------

export function useEventClock() {
  const { event } = useGameStore();
  return useCountdown(event?.endsAt);
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
  return { loading, error, reel: data?.reel ?? null, next: data?.next ?? null };
}

export function useActTitles() {
  const { data, error, loading } = useResource(() => source.getActs(), []);
  return { loading, error, acts: data?.acts ?? [] };
}

export function useRules() {
  const { data, error, loading } = useResource(() => source.getRules(), []);
  return { loading, error, rules: data?.rules ?? [] };
}

export function useLeaderboard() {
  const { data, error, loading, reload } = useResource(() => source.getLeaderboard(), []);
  return { loading, error, rows: data?.rows ?? [], frozen: !!data?.frozen, reload };
}

// ---------- Actions ----------

export function useGameActions() {
  const { refresh } = useGameStore();

  // Resolves { correct, ... }; rejects with ApiError (data.code: TOO_FAST | COOLDOWN | ALREADY_SOLVED | LOCKED).
  const submitFlag = useCallback(
    async (slug, flag) => {
      const result = await source.submitFlag(slug, flag);
      if (result.correct) await refresh();
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
