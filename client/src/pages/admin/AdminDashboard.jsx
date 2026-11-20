import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminEvent,
  adminExtendEvent,
  adminForgiveViolation,
  adminFullscreenRule,
  adminLogout,
  adminOverview,
  adminReopen,
  adminTeamTime,
} from "../../api/endpoints.js";
import { formatClock } from "../../lib/format.js";
import { subscribeToChanges } from "../../lib/live.js";
import Button from "../../components/ui/Button.jsx";
import Icon from "../../components/ui/Icon.jsx";
import PageStatus from "../../components/ui/PageStatus.jsx";

// Organiser dashboard (/admin): the event clock for every team, extra time per team, and a live table of every
// team's score and position. Data comes from GET /api/admin/overview, refreshed every few seconds.
const REFRESH_MS = 5_000;

const STATUS_LABEL = { idle: "Not started", running: "Running", paused: "Paused", ended: "Ended" };
const STATUS_TONE = {
  idle: "border-line text-muted",
  running: "border-gold/70 text-gold",
  paused: "border-gold/70 text-gold",
  ended: "border-blood-bright/70 text-blood-bright",
};
// One square per checkpoint in a team's progress strip.
const CELL = {
  solved: "bg-gold",
  failed: "bg-blood-bright",
  current: "bg-bone ring-2 ring-bone/40",
  locked: "bg-ink-raised ring-1 ring-line",
};
const CELL_WORD = { solved: "solved", failed: "missed", current: "current", locked: "locked" };

const cpLabel = (id) => (id === "final" ? "Final" : `CP ${id}`);
const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—");
const inputCls =
  "w-20 rounded-chip border border-line bg-ink/80 px-2 py-1.5 text-center font-mono text-sm text-bone focus:outline-none focus-visible:outline-2 focus-visible:outline-gold";

// Re-renders every second so countdowns tick between refreshes.
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Tile({ label, value }) {
  return (
    <div className="rounded-card border border-line bg-ink-soft/80 px-4 py-3">
      <dt className="font-type text-[10px] tracking-[0.2em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-heading text-2xl font-bold text-bone tabular-nums">{value}</dd>
    </div>
  );
}

function MinutesForm({ label, onApply, disabled, defaultMinutes = 5 }) {
  const [minutes, setMinutes] = useState(String(defaultMinutes));
  const n = Number(minutes);
  const valid = Number.isInteger(n) && n > 0 && n <= 180;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-sm text-muted">
        {label}
        <input
          type="number"
          min="1"
          max="180"
          step="1"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className={inputCls}
        />
        min
      </label>
      <Button size="sm" caps={false} disabled={disabled || !valid} onClick={() => onApply(n)}>
        Add
      </Button>
      <Button size="sm" variant="outline" caps={false} disabled={disabled || !valid} onClick={() => onApply(-n)}>
        Remove
      </Button>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const now = useNow();
  const [data, setData] = useState(null); // overview + fetchedAt
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { tone: "ok" | "error", text }
  const [open, setOpen] = useState(null); // team id whose "manage" panel is open
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("rank");

  const load = useCallback(async () => {
    try {
      const d = await adminOverview();
      setData({ ...d, fetchedAt: Date.now() });
      setLoadError(null);
    } catch (err) {
      if (err.status === 401 || err.status === 403) navigate("/admin/login", { replace: true });
      else setLoadError(err);
    }
  }, [navigate]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    // Instant refresh when anything changes (another organiser's action, a team's full-screen violation).
    const off = subscribeToChanges(() => load());
    return () => {
      clearInterval(id);
      off();
    };
  }, [load]);

  // Runs an admin action, then refreshes. `confirmText` asks first (for anything that affects every team).
  const run = async (fn, okText, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      setNotice({ tone: "ok", text: okText });
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: err.message || "That did not work." });
    } finally {
      setBusy(false);
    }
  };

  const teams = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const rows = q ? data.teams.filter((t) => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)) : [...data.teams];
    if (sort === "name") rows.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    else if (sort === "progress") rows.sort((a, b) => b.solved + b.missed - (a.solved + a.missed) || a.rank - b.rank);
    else rows.sort((a, b) => a.rank - b.rank);
    return rows;
  }, [data, query, sort]);

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <PageStatus loading={!loadError} error={loadError} label="Loading the projection room" />
      </div>
    );
  }

  const { event, checkpoints, extraTimeSupported } = data;
  const elapsed = now - data.fetchedAt;
  // Time left right now: the server's figure, counted down locally while the clock is running.
  const live = (clock) => (clock.status === "running" ? Math.max(0, clock.remainingMs - elapsed) : clock.remainingMs);
  const stored = event.storedStatus;
  const timeUp = stored === "running" && event.status === "ended"; // ran out by itself
  const total = checkpoints.length;
  const finishedCount = data.teams.filter((t) => t.finished).length;
  const topScore = data.teams.reduce((m, t) => Math.max(m, t.points), 0);
  const started = data.teams.filter((t) => t.solved + t.missed > 0).length;
  const fsRule = data.fullscreen ?? { supported: false, required: false, max: 3 };
  const lockedCount = data.teams.filter((t) => t.fullscreen?.locked).length;

  return (
    <section aria-labelledby="admin-heading" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-type text-xs tracking-[0.25em] text-gold-soft uppercase">OBSCURA / organisers only</p>
          <h1 id="admin-heading" className="font-display text-3xl tracking-wide text-bone uppercase sm:text-4xl">
            Projection Room
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-type text-xs text-muted">Updated {timeOf(new Date(data.fetchedAt).toISOString())}</p>
          <Button to="/admin/leaderboard" size="sm" variant="outline" caps={false}>
            <Icon name="trophy" className="size-4" /> Leaderboard
          </Button>
          <Button
            size="sm"
            variant="ghost"
            caps={false}
            onClick={async () => {
              await adminLogout().catch(() => {});
              navigate("/admin/login", { replace: true });
            }}
          >
            <Icon name="logout" className="size-4" /> Log out
          </Button>
        </div>
      </header>

      {(notice || loadError) && (
        <p
          role={notice?.tone === "ok" ? "status" : "alert"}
          className={`mt-4 rounded-card border px-4 py-2 text-sm ${
            notice?.tone === "ok" ? "border-gold-soft/60 bg-gold/10 text-gold" : "border-blood-bright/60 bg-blood-deep/40 text-bone"
          }`}
        >
          {notice?.text || `Could not refresh: ${loadError.message}`}
        </p>
      )}

      {/* ---------- Event clock (applies to every team) ---------- */}
      <div className="panel-dark mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-xl font-bold text-bone uppercase">Event clock</h2>
              <span className={`rounded-chip border px-2.5 py-0.5 font-type text-xs uppercase ${STATUS_TONE[event.status]}`}>
                {timeUp ? "Time up" : STATUS_LABEL[event.status]}
              </span>
            </div>
            <p
              role="timer"
              aria-label={`Time remaining for all teams: ${formatClock(live(event))}`}
              className={`mt-2 font-mono text-5xl font-bold tabular-nums sm:text-6xl ${
                event.status === "running" ? "text-bone" : event.status === "paused" ? "text-gold" : "text-muted"
              }`}
            >
              {formatClock(live(event))}
            </p>
            <p className="mt-2 text-sm text-muted">
              Duration {event.durationMinutes} min
              {event.startedAt && <> &middot; started {timeOf(event.startedAt)}</>}
              {event.totalPausedMs > 0 && <> &middot; paused for {formatClock(event.totalPausedMs)} in total</>}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2">
              {stored === "idle" && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => adminEvent("start"),
                      "The clock is running for every team.",
                      `Start the ${event.durationMinutes}-minute clock for ALL teams now?`
                    )
                  }
                >
                  Start the hunt
                </Button>
              )}
              {stored === "running" && (
                <Button disabled={busy} onClick={() => run(() => adminEvent("pause"), "Clock paused. Teams cannot submit until you resume.")}>
                  Pause
                </Button>
              )}
              {stored === "paused" && (
                <Button disabled={busy} onClick={() => run(() => adminEvent("resume"), "Clock resumed.")}>
                  Resume
                </Button>
              )}
              {(stored === "running" || stored === "paused") && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    run(() => adminEvent("end"), "The hunt is ended for every team.", "End the hunt now for ALL teams? No more flags will be accepted.")
                  }
                >
                  End now
                </Button>
              )}
              {stored !== "idle" && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => adminEvent("reset"),
                      "Clock reset to not started. Extra time and full-screen violations cleared; team progress was not touched.",
                      "Reset the clock to NOT STARTED?\n\nThe duration goes back to 60 minutes, and every team's extra time and full-screen violations are cleared. Scores and progress are kept."
                    )
                  }
                >
                  Reset clock
                </Button>
              )}
            </div>
            <MinutesForm
              label="Time for all teams:"
              disabled={busy}
              onApply={(m) => run(() => adminExtendEvent(m), `${m > 0 ? "Added" : "Removed"} ${Math.abs(m)} min for every team.`)}
            />
          </div>
        </div>
        <p className="mt-4 border-t border-line/60 pt-3 text-xs text-muted">
          Flags and hints are accepted only while the clock is running. Before the start teams cannot open any gate; while
          paused or after the end they can read but not submit.
        </p>
      </div>

      {!extraTimeSupported && (
        <p role="alert" className="mt-4 rounded-card border border-gold/60 bg-gold/10 px-4 py-3 text-sm text-bone">
          <strong className="text-gold">Extra time for a single team is switched off.</strong> It needs one database change: run{" "}
          <code className="font-mono text-gold">supabase/migrations/002_team_extra_time.sql</code> in the Supabase SQL editor.
          Everything else on this page works without it.
        </p>
      )}

      {!fsRule.supported ? (
        <p role="alert" className="mt-4 rounded-card border border-gold/60 bg-gold/10 px-4 py-3 text-sm text-bone">
          <strong className="text-gold">Full-screen invigilation is switched off.</strong> It needs one database change: run{" "}
          <code className="font-mono text-gold">supabase/migrations/003_fullscreen.sql</code> in the Supabase SQL editor.
        </p>
      ) : (
        <div className="panel-dark mt-4 flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <h2 className="font-heading text-base font-bold text-bone uppercase">Full-screen rule</h2>
              <span
                className={`rounded-chip border px-2.5 py-0.5 font-type text-xs uppercase ${
                  fsRule.required ? "border-gold/70 text-gold" : "border-line text-muted"
                }`}
              >
                {fsRule.required ? "On" : "Off"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              While the clock runs, every device logged in as a team must stay in full screen. Each exit is a violation; at{" "}
              {fsRule.max} the team is locked: its timer stops and it cannot submit. Use <em>Manage</em> &rarr;{" "}
              <em>Ignore one violation</em> to restore a team; its timer resumes from where it stopped. Turning the rule off
              stops new violations; locked teams stay locked until you restore them.
            </p>
          </div>
          <Button
            size="sm"
            variant={fsRule.required ? "outline" : "primary"}
            caps={false}
            disabled={busy}
            onClick={() =>
              run(
                () => adminFullscreenRule(!fsRule.required),
                fsRule.required ? "Full-screen rule switched off. Exits are no longer counted." : "Full-screen rule switched on.",
                fsRule.required ? "Switch the full-screen rule OFF for every team?" : undefined
              )
            }
          >
            {fsRule.required ? "Switch off" : "Switch on"}
          </Button>
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Tile label="Teams" value={data.teams.length} />
        <Tile label="Have answered" value={started} />
        <Tile label="Cleared the final" value={finishedCount} />
        <Tile label="Top score" value={topScore} />
        <Tile label="Locked out" value={lockedCount} />
      </dl>

      {/* ---------- Teams ---------- */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-heading text-xl font-bold text-bone uppercase">Teams</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2 text-muted">
            Find
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="team name"
              className="w-40 rounded-chip border border-line bg-ink/80 px-2 py-1.5 text-bone placeholder:text-muted/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-gold"
            />
          </label>
          <label className="flex items-center gap-2 text-muted">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-chip border border-line bg-ink px-2 py-1.5 text-bone focus:outline-none focus-visible:outline-2 focus-visible:outline-gold"
            >
              <option value="rank">Rank</option>
              <option value="progress">Progress</option>
              <option value="name">Team name</option>
            </select>
          </label>
        </div>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        Progress strip, one square per checkpoint (1.1 to 5.3, then the final):
        {Object.keys(CELL).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`inline-block size-2.5 rounded-[2px] ${CELL[k]}`} /> {CELL_WORD[k]}
          </span>
        ))}
      </p>

      <div className="panel-dark mt-3 overflow-x-auto">
        <table className="w-full min-w-[66rem] text-left text-sm">
          <caption className="sr-only">Every team: score, progress and time left</caption>
          <thead className="border-b border-line font-heading text-xs text-muted uppercase">
            <tr>
              <th scope="col" className="px-3 py-3">#</th>
              <th scope="col" className="px-3 py-3">Team</th>
              <th scope="col" className="px-3 py-3 text-right">Points</th>
              <th scope="col" className="px-3 py-3 text-right">Solved</th>
              <th scope="col" className="px-3 py-3 text-right">Missed</th>
              <th scope="col" className="px-3 py-3 text-right">Hints</th>
              <th scope="col" className="px-3 py-3 text-center" title="Full-screen violations">
                Full screen
              </th>
              <th scope="col" className="px-3 py-3">Progress</th>
              <th scope="col" className="px-3 py-3">Now at</th>
              <th scope="col" className="px-3 py-3 text-right">Time left</th>
              <th scope="col" className="px-3 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/50">
            {teams.map((t) => {
              const isOpen = open === t.id;
              const left = t.clock ? live(t.clock) : null;
              const fs = t.fullscreen;
              return (
                <Fragment key={t.id}>
                  <tr className={isOpen ? "bg-ink-raised/60" : fs?.locked ? "bg-blood-deep/30" : ""}>
                    <td className="px-3 py-2.5 font-type text-gold">{t.rank}</td>
                    <th scope="row" className="px-3 py-2.5 font-heading text-base font-semibold whitespace-nowrap text-bone">
                      {t.code}
                    </th>
                    <td className="px-3 py-2.5 text-right font-heading text-base font-bold text-gold tabular-nums">{t.points}</td>
                    <td className="px-3 py-2.5 text-right text-bone tabular-nums">
                      {t.solved}/{total}
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${t.missed ? "text-blood-bright" : "text-muted"}`}>{t.missed}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap text-muted tabular-nums">
                      {t.hintsUsed}
                      {t.hintPointsSpent > 0 && <> (−{t.hintPointsSpent})</>}
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {!fs?.supported ? (
                        <span className="text-muted">—</span>
                      ) : fs.locked ? (
                        <span className="rounded-chip border border-blood-bright/70 bg-blood-deep/60 px-2 py-0.5 font-type text-xs text-blood-bright uppercase">
                          Locked {fs.violations}/{fs.max}
                        </span>
                      ) : (
                        <span className={`tabular-nums ${fs.violations ? "text-blood-bright" : "text-muted"}`}>
                          {fs.violations}/{fs.max}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex gap-0.5" role="img" aria-label={`${t.solved} solved, ${t.missed} missed of ${total}`}>
                        {t.checkpoints.map((c) => (
                          <span
                            key={c.id}
                            title={`${cpLabel(c.id)}: ${CELL_WORD[c.status]}`}
                            className={`inline-block size-2.5 rounded-[2px] ${CELL[c.status]} ${c.id === "final" ? "ml-1" : ""}`}
                          />
                        ))}
                      </span>
                    </td>
                    <td className="max-w-56 truncate px-3 py-2.5 text-bone">
                      {t.finished ? (
                        <span className="text-gold">Cleared the final</span>
                      ) : t.finalMissed ? (
                        <span className="text-blood-bright">Missed the final</span>
                      ) : t.current ? (
                        <>
                          <span className="font-type text-gold">{cpLabel(t.current.id)}</span> {t.current.title}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap tabular-nums">
                      <span className={fs?.locked ? "text-blood-bright" : t.clock?.status === "running" ? "text-bone" : "text-muted"}>
                        {left == null ? "—" : formatClock(left)}
                      </span>
                      {fs?.locked && <span className="ml-1.5 font-sans text-xs text-blood-bright">stopped</span>}
                      {t.clock?.extraTimeMs !== 0 && t.clock && (
                        <span className="ml-1.5 font-sans text-xs text-gold">
                          {t.clock.extraTimeMs > 0 ? "+" : "−"}
                          {Math.abs(Math.round(t.clock.extraTimeMs / 60_000))}m
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant={isOpen ? "primary" : "outline"} caps={false} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : t.id)}>
                        {isOpen ? "Close" : "Manage"}
                      </Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-ink-raised/60">
                      <td colSpan={11} className="px-3 pt-1 pb-5">
                        <div className="grid gap-5 rounded-card border border-line bg-ink/60 p-4 lg:grid-cols-2">
                          <div>
                            <h3 className="font-heading text-sm font-bold text-bone uppercase">Time for {t.code}</h3>
                            <p className="mt-1 text-xs text-muted">
                              Added on top of the event clock for this team only. Extra so far:{" "}
                              {Math.round((t.clock?.extraTimeMs ?? 0) / 60_000)} min.
                            </p>
                            <div className="mt-3">
                              <MinutesForm
                                label="Minutes:"
                                disabled={busy || !extraTimeSupported}
                                onApply={(m) =>
                                  run(() => adminTeamTime(t.id, m), `${m > 0 ? "Added" : "Removed"} ${Math.abs(m)} min for ${t.code}.`)
                                }
                              />
                            </div>
                            <p className="mt-3 text-xs text-muted">
                              Relics {t.relics}/5 &middot; last activity {timeOf(t.lastActivityAt)}
                            </p>
                          </div>
                          <div>
                            <h3 className="font-heading text-sm font-bold text-bone uppercase">Missed checkpoints</h3>
                            {t.misses.length === 0 ? (
                              <p className="mt-1 text-xs text-muted">None. This team has not given a wrong answer.</p>
                            ) : (
                              <ul className="mt-2 space-y-2">
                                {t.misses.map((m) => (
                                  <li key={m.cpId} className="flex flex-wrap items-center justify-between gap-2 rounded-chip border border-line/70 px-3 py-2">
                                    <span className="min-w-0 text-sm text-bone">
                                      <span className="font-type text-blood-bright">{cpLabel(m.cpId)}</span>{" "}
                                      <span className="text-muted">at {timeOf(m.at)}, typed</span>{" "}
                                      <code className="font-mono break-all text-gold">{m.submitted}</code>
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      caps={false}
                                      disabled={busy}
                                      onClick={() =>
                                        run(
                                          () => adminReopen(t.id, m.cpId),
                                          `${cpLabel(m.cpId)} is open again for ${t.code}.`,
                                          `Reopen ${cpLabel(m.cpId)} for ${t.code}?\n\nTheir wrong attempt is erased and they get one new attempt. If they have already moved on, this checkpoint becomes their current gate again.`
                                        )
                                      }
                                    >
                                      Reopen
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {fs?.supported && (
                            <div className="border-t border-line/60 pt-4 lg:col-span-2">
                              <h3 className="font-heading text-sm font-bold text-bone uppercase">Full screen</h3>
                              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-bone">
                                  {fs.violations}/{fs.max} violations
                                  {fs.lastViolationAt && <span className="text-muted"> &middot; last at {timeOf(fs.lastViolationAt)}</span>}
                                  {fs.locked && (
                                    <span className="text-blood-bright">
                                      {" "}
                                      &middot; locked since {timeOf(fs.lockedAt)}, timer stopped at {formatClock(fs.frozenRemainingMs ?? 0)}
                                    </span>
                                  )}
                                </p>
                                <Button
                                  size="sm"
                                  variant={fs.locked ? "primary" : "outline"}
                                  caps={false}
                                  disabled={busy || fs.violations === 0}
                                  onClick={() =>
                                    run(
                                      () => adminForgiveViolation(t.id),
                                      fs.locked
                                        ? `${t.code} is restored at ${fs.violations - 1}/${fs.max}. Their timer is running again from ${formatClock(fs.frozenRemainingMs ?? 0)}.`
                                        : `${t.code} is now at ${fs.violations - 1}/${fs.max} violations.`,
                                      fs.locked
                                        ? `Ignore one violation for ${t.code}?\n\nThey go from ${fs.violations} to ${fs.violations - 1} of ${fs.max}, are unlocked, and their timer resumes from ${formatClock(fs.frozenRemainingMs ?? 0)}. One more exit locks them again.`
                                        : `Ignore one violation for ${t.code}? (${fs.violations} -> ${fs.violations - 1})`
                                    )
                                  }
                                >
                                  {fs.locked ? "Ignore violation & restore" : "Ignore one violation"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {teams.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted">
                  No team matches &ldquo;{query}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
