// The one switch between mock data and the real API.
// Both modules export the same function names (getProgress, getCheckpoint, submitFlag, useHint, ...).
import * as endpoints from "../api/endpoints.js";
import * as mockApi from "../data/mockApi.js";
import { USE_MOCKS } from "../lib/config.js";

export const source = USE_MOCKS ? mockApi : endpoints;
