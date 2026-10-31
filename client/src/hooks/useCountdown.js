import { useEffect, useState } from "react";
import { formatClock } from "../lib/format.js";

// Ticks every second until `endsAt` (ISO string, Date or ms). Returns null fields while endsAt is unknown.
export function useCountdown(endsAt) {
  const target = endsAt ? new Date(endsAt).getTime() : null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return { remaining: null, expired: false, h: null, m: null, s: null, label: "--:--:--" };

  const remaining = Math.max(0, target - now);
  const total = Math.floor(remaining / 1000);
  return {
    remaining,
    expired: remaining === 0,
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    label: formatClock(remaining),
  };
}
