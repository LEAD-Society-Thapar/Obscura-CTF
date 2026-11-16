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

// Mock "server" behaviour (client/src/data/mockApi.js). Shortened so states are easy to see.
export const MOCK_LATENCY_MS = 600;
export const MOCK_SUBMIT_INTERVAL_MS = 3_000; // real server: 1 submission per 10 s
