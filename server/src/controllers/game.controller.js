// TODO (next step): implement against the Supabase schema.
// Each handler below maps to one route in routes/game.routes.js.
import { HttpError } from "../utils/httpError.js";

const todo = (name) => () => {
  throw new HttpError(501, `${name} is not implemented yet`);
};

export const getEventState = todo("getEventState");     // clock, paused?, leaderboard frozen?, ticker
export const getProgress = todo("getProgress");         // team's current CP, solved CPs, score
export const getCheckpoint = todo("getCheckpoint");     // scene + challenge for a valid gate slug (never the flag)
export const submitFlag = todo("submitFlag");           // validate server-side, advance, return reel card
export const useHint = todo("useHint");                 // L2 -10%, L3 -30%
export const skipCheckpoint = todo("skipCheckpoint");   // -40%, no flag/relic
export const getInventory = todo("getInventory");       // relics collected
export const getLeaderboard = todo("getLeaderboard");   // respects freeze toggle
