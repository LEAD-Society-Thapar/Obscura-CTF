// App-wide constants. Values that differ between the designs and the original plan live here
// so they can be changed in one place.

// Mock mode: the UI runs on client/src/data/mock.js instead of the API.
// On unless VITE_USE_MOCKS=false. That variable is read at BUILD time from the repo-root .env (or the Vercel
// project settings): a production build without it serves fake data and accepts any login.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

export const EVENT_NAME = "OBSCURA";

// Designs show OBSCURA{...}; the original plan said SAT{...}. Needs a decision.
export const FLAG_PREFIX = "OBSCURA";
export const FLAG_PLACEHOLDER = `${FLAG_PREFIX}{...}`;
// The flag form shows "OBSCURA{}" with the cursor between the braces; the "}" moves along as the team types.
export const FLAG_OPEN = `${FLAG_PREFIX}{`;
export const FLAG_CLOSE = "}";

// What the team typed -> the answer between the braces. A pasted full flag (OBSCURA{answer}) is unwrapped so the
// wrapper is never doubled.
export const innerFlag = (typed) => {
  const m = String(typed).trim().match(new RegExp(`^${FLAG_PREFIX}\\{([\\s\\S]*)\\}$`, "i"));
  return (m ? m[1] : String(typed)).trim();
};
export const wrapFlag = (typed) => `${FLAG_OPEN}${innerFlag(typed)}${FLAG_CLOSE}`;

// Mock "server" behaviour (client/src/data/mockApi.js). Shortened so states are easy to see.
export const MOCK_LATENCY_MS = 600;
export const MOCK_SUBMIT_INTERVAL_MS = 3_000; // real server: 1 submission per 10 s
// Full-screen invigilation in mock mode. Off by default so UI work isn't interrupted; set VITE_MOCK_FULLSCREEN=true
// to try the overlay without a server.
export const MOCK_FULLSCREEN = import.meta.env.VITE_MOCK_FULLSCREEN === "true";
