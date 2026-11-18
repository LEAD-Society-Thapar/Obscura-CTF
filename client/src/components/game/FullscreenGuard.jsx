import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useGameStore } from "../../context/GameDataContext.jsx";
import { formatClock } from "../../lib/format.js";
import Button from "../ui/Button.jsx";
import Icon from "../ui/Icon.jsx";

// Full-screen invigilation (server: services/fullscreen.js).
//
// While the event clock runs, every device logged in as a team must stay in full screen. Out of full screen the
// whole site is covered by a modal dialog (inert background, Esc cannot close it) with one button that re-enters
// full screen. Each exit is reported to the server, which counts it; at the limit the team is locked: the dialog
// says so, the team's timer is frozen, and only an organiser can restore access from /admin.
// Leaving the window while the browser stays in full screen (Alt+Tab, Task View, another virtual desktop) counts too:
// see the focus/visibility listener below.
//
// Not enforced: before the start, during a global pause, after the end, once the team has closed the final, on the
// admin pages, or when the organisers switch the rule off. Browsers only enter full screen from a click, which is
// why the team always has to press the button.

// How long the page may be out of focus before it counts as leaving the window (system pop-ups can take focus
// for a moment), and the minimum gap between two reports from this device (one incident can fire several events).
const LEAVE_GRACE_MS = 1_500;
const REPORT_GAP_MS = 2_500;
const CONTEXT_MENU_MS = 10_000;

const fsElement = () => document.fullscreenElement ?? document.webkitFullscreenElement ?? null;
const fsAvailable = () => Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);

// Chrome and Edge: with the Escape key locked, a short Esc press reaches the page (closing a pop-up, say) instead of
// leaving full screen; leaving needs Esc held down. Without this, closing the Reel Card with Esc would be a violation.
// Other browsers ignore it.
const lockEscape = () => navigator.keyboard?.lock?.(["Escape"]).catch(() => {});

function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) return el.requestFullscreen({ navigationUI: "hide" }).then(lockEscape);
  if (el.webkitRequestFullscreen) {
    el.webkitRequestFullscreen(); // Safari: no promise
    return Promise.resolve();
  }
  return Promise.reject(new Error("Full screen is not supported here."));
}

export default function FullscreenGuard() {
  const { team } = useAuth();
  const { pathname } = useLocation();
  const { event, progress, reportViolation } = useGameStore();
  const [inFs, setInFs] = useState(() => !!fsElement());
  const [refused, setRefused] = useState(false);
  const dialogRef = useRef(null);

  // Set when leaving the window was counted while the browser stayed in full screen (Alt+Tab, Task View, another
  // virtual desktop): the warning is shown even though no full-screen exit happened.
  const [leftWindow, setLeftWindow] = useState(false);

  const fs = event?.fullscreen ?? null;
  const onAdmin = pathname.startsWith("/admin");
  const done = !!(progress?.finished || progress?.finalMissed);
  const active = !!team && !onAdmin && !!fs;
  // Exits count only while this is true. A locked team's clock is "paused", so it is false then too.
  const enforcing = active && fs.required && event.status === "running" && !done;
  const locked = active && fs.locked && event.status !== "ended";
  const show = locked || (enforcing && (!inFs || leftWindow));

  // Latest values for the listeners, which are registered once.
  const enforcingRef = useRef(enforcing);
  enforcingRef.current = enforcing;
  const showRef = useRef(show);
  showRef.current = show;

  // "Armed": this device has been in full screen during this run of the clock. Leaving the window only counts once
  // armed, so a laptop that never joined (or was in another window when the clock started) is not punished. Kept in
  // sessionStorage per team and start time, so reloading the page does not disarm it.
  const armKey = team?.id && event?.startedAt ? `obscura_fs_armed:${team.id}:${event.startedAt}` : null;
  const armedRef = useRef(false);
  useEffect(() => {
    try {
      armedRef.current = !!armKey && sessionStorage.getItem(armKey) === "1";
    } catch {
      armedRef.current = false;
    }
  }, [armKey]);
  useEffect(() => {
    if (!armKey || !enforcing || !inFs) return;
    armedRef.current = true;
    try {
      sessionStorage.setItem(armKey, "1");
    } catch {
      /* storage blocked: armed for this page load only */
    }
  }, [armKey, enforcing, inFs]);

  // One report per incident: alt-tabbing out of full screen can fire both a full-screen exit and a focus loss.
  const lastReportRef = useRef(0);
  const report = useCallback(() => {
    const now = Date.now();
    if (now - lastReportRef.current < REPORT_GAP_MS) return false;
    lastReportRef.current = now;
    reportViolation();
    return true;
  }, [reportViolation]);

  // Remember a lock until the team is back in full screen, to say "access restored" rather than "you left".
  // Cleared once unlocked and in full screen (also on a device that never left full screen during the lock).
  const [wasLocked, setWasLocked] = useState(false);
  useEffect(() => {
    if (locked) setWasLocked(true);
    else if (inFs) setWasLocked(false);
  }, [locked, inFs]);

  useEffect(() => {
    const onChange = () => {
      const nowFs = !!fsElement();
      setInFs(nowFs);
      if (nowFs) setRefused(false);
      else if (enforcingRef.current) report();
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [report]);

  // Leaving the window without leaving full screen: Alt+Tab, Win+Tab or a three-finger swipe to Task View, another
  // virtual desktop, a second monitor, minimising. The browser stays "full screen", so the only signal is that the
  // page lost focus or became hidden. Counted if the device is still away after LEAVE_GRACE_MS (so a flicker, such as
  // a system pop-up that takes focus for a moment, is not punished), once per departure.
  useEffect(() => {
    let timer = null;
    let contextMenuAt = 0;
    const away = () => document.visibilityState === "hidden" || !document.hasFocus();
    // A right-click menu (used to copy text into the tools) can take focus from the page in some browsers. While one
    // was opened recently and the page is still visible, keep waiting instead of counting.
    const inContextMenu = () => document.visibilityState === "visible" && Date.now() - contextMenuAt < CONTEXT_MENU_MS;
    const check = () => {
      timer = null;
      if (!away() || !enforcingRef.current || !armedRef.current) return;
      if (inContextMenu()) {
        timer = setTimeout(check, 1_000);
        return;
      }
      if (report()) setLeftWindow(true);
    };
    const onLeave = () => {
      if (timer || !enforcingRef.current || !armedRef.current) return;
      timer = setTimeout(check, LEAVE_GRACE_MS);
    };
    const onContextMenu = () => {
      contextMenuAt = Date.now();
    };
    document.addEventListener("contextmenu", onContextMenu);
    const onBack = () => {
      if (away()) return;
      clearTimeout(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? onLeave() : onBack());
    window.addEventListener("blur", onLeave);
    window.addEventListener("focus", onBack);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("focus", onBack);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [report]);

  // The window warning is only for this departure: gone once the rule stops applying (pause, end, lock).
  useEffect(() => {
    if (!enforcing) setLeftWindow(false);
  }, [enforcing]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (show && !d.open) d.showModal();
    if (!show && d.open) d.close();
  }, [show]);

  const enter = () => {
    setRefused(false);
    setLeftWindow(false);
    if (inFs) return; // left the window but stayed in full screen: acknowledging the warning is enough
    enterFullscreen().catch(() => setRefused(true));
  };

  let view = null;
  if (locked) view = "locked";
  else if (show && !fsAvailable()) view = "unsupported";
  else if (show && wasLocked) view = "restored";
  else if (show && leftWindow) view = "left";
  else if (show && fs.violations > 0) view = "warning";
  else if (show) view = "start";

  const max = fs?.max ?? 3;
  const left = Math.max(0, max - (fs?.violations ?? 0));

  return (
    <dialog
      ref={dialogRef}
      // Esc and other "close requests" must not dismiss it; if a browser closes it anyway, open it again.
      onCancel={(e) => e.preventDefault()}
      onClose={() => showRef.current && dialogRef.current?.showModal()}
      aria-labelledby="fs-heading"
      aria-describedby="fs-text"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] bg-transparent p-0 text-inherit backdrop:bg-black/90 backdrop:backdrop-blur-md"
    >
      {view && (
        <div
          className={`rounded-card border p-6 text-center sm:p-8 ${
            view === "locked" ? "border-blood-bright bg-blood-deep" : "border-gold bg-ink shadow-glow-gold"
          }`}
        >
          <span
            className={`mx-auto grid size-16 place-items-center rounded-full ring-1 ${
              view === "locked" || view === "warning" || view === "left" ? "bg-blood-deep/60 text-blood-bright ring-blood-bright/60" : "bg-gold/15 text-gold ring-gold/60"
            }`}
          >
            <Icon name={view === "locked" ? "lock" : view === "start" || view === "restored" ? "film" : "shield"} className="size-8" />
          </span>

          {view === "locked" && (
            <>
              <p className="mt-5 font-type text-xs tracking-[0.3em] text-blood-bright uppercase">Full-screen violation</p>
              <h2 id="fs-heading" className="mt-1 font-display text-4xl tracking-wide text-bone uppercase">
                Team disqualified
              </h2>
              <p id="fs-text" className="mt-3 text-bone/90">
                Your team left full screen or the hunt window {fs.violations} times. Your timer is stopped at{" "}
                <span className="font-mono font-bold text-gold">{formatClock(event.remainingMs)}</span> and no flags or hints are
                accepted.
              </p>
              <p className="mt-3 text-sm text-muted">
                If this was an accident, tell an organiser now. They can restore your access, and your timer resumes from where
                it stopped. This screen updates by itself.
              </p>
            </>
          )}

          {view === "unsupported" && (
            <>
              <h2 id="fs-heading" className="mt-5 font-heading text-3xl font-bold text-bone">
                Full screen needed
              </h2>
              <p id="fs-text" className="mt-3 text-muted">
                This browser cannot switch to full screen, so it cannot be used for the hunt. Open the site on a laptop or desktop
                in Chrome, Edge or Firefox.
              </p>
            </>
          )}

          {view === "start" && (
            <>
              <p className="mt-5 font-type text-xs tracking-[0.3em] text-gold uppercase">OBSCURA</p>
              <h2 id="fs-heading" className="mt-1 font-display text-4xl tracking-wide text-bone uppercase">
                Round 1 has started
              </h2>
              <p id="fs-text" className="mt-3 text-bone/90">
                Enter full screen mode to proceed.
              </p>
              <p className="mt-3 rounded-chip border border-line bg-ink-raised/60 px-3 py-2 text-sm text-muted">
                Stay in full screen, on this window, until the hunt ends. Leaving is a violation: pressing Esc, opening a new
                tab, or switching to another window, app or desktop (Alt+Tab, Task View, swipes) all count. After {max}, your
                team is disqualified and its timer stops.
              </p>
            </>
          )}

          {view === "warning" && (
            <>
              <p className="mt-5 font-type text-xs tracking-[0.3em] text-blood-bright uppercase">
                Violation {fs.violations} of {max}
              </p>
              <h2 id="fs-heading" className="mt-1 font-heading text-3xl font-bold text-bone">
                You left full screen
              </h2>
              <p id="fs-text" className="mt-3 text-bone/90">
                {left === 1
                  ? "One more exit and your team is disqualified: its timer stops and no more flags are accepted."
                  : `${left} more exits and your team is disqualified.`}{" "}
                Go back to full screen to continue.
              </p>
            </>
          )}

          {view === "left" && (
            <>
              <p className="mt-5 font-type text-xs tracking-[0.3em] text-blood-bright uppercase">
                Violation {fs.violations} of {max}
              </p>
              <h2 id="fs-heading" className="mt-1 font-heading text-3xl font-bold text-bone">
                You left the hunt window
              </h2>
              <p id="fs-text" className="mt-3 text-bone/90">
                Switching to another window, app or desktop counts just like leaving full screen.{" "}
                {left === 1
                  ? "One more and your team is disqualified: its timer stops and no more flags are accepted."
                  : `${left} more and your team is disqualified.`}
              </p>
            </>
          )}

          {view === "restored" && (
            <>
              <p className="mt-5 font-type text-xs tracking-[0.3em] text-gold uppercase">
                Violations {fs.violations} of {max}
              </p>
              <h2 id="fs-heading" className="mt-1 font-heading text-3xl font-bold text-bone">
                Access restored
              </h2>
              <p id="fs-text" className="mt-3 text-bone/90">
                The organisers have restored your team. Your timer is running again from where it stopped. Enter full screen to
                continue.
              </p>
            </>
          )}

          {(view === "start" || view === "warning" || view === "left" || view === "restored") && (
            <div className="mt-6">
              <Button onClick={enter} autoFocus>
                {view === "left" && inFs ? "Back to the hunt" : view === "warning" || view === "left" ? "Return to full screen" : "Enter full screen"}
              </Button>
              {refused && (
                <p role="alert" className="mt-3 text-sm text-blood-bright">
                  The browser did not allow full screen. Press the button again; if it keeps failing, use Chrome or Edge.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
