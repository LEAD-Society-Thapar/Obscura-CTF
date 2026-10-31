// App-wide constants. Values that differ between the designs and the original plan live here
// so they can be changed in one place.

// Mock mode: the UI runs on client/src/data/mock.js instead of the API.
// On by default; set VITE_USE_MOCKS=false in client/.env to use the real server.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";

export const EVENT_NAME = "OBSCURA";

// Designs show OBSCURA{...}; the original plan said SAT{...}. Needs a decision.
export const FLAG_PREFIX = "OBSCURA";
export const FLAG_PLACEHOLDER = `${FLAG_PREFIX}{...}`;

// Mock "server" behaviour (client/src/data/mockApi.js). Shortened so states are easy to see.
export const MOCK_LATENCY_MS = 600;
export const MOCK_SUBMIT_INTERVAL_MS = 3_000; // real server: 1 submission per 10 s
export const MOCK_WRONG_LIMIT = 5; // real server: 5 wrong in a row
export const MOCK_COOLDOWN_MS = 15_000; // real server: 60 s cooldown
