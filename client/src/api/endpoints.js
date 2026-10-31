import { api } from "./client.js";

export const health = () => api.get("/health");

// Auth
// TODO(auth): the designs ask for Team ID + Password, but the server's /auth/login only takes a team code.
// Send the password once the backend supports it.
export const teamLogin = (teamCode) => api.post("/auth/login", { teamCode });
export const teamLogout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me");

// Game
export const getEventState = () => api.get("/game/state");
export const getProgress = () => api.get("/game/progress");
export const getCheckpoint = (slug) => api.get(`/game/gate/${slug}`);
export const submitFlag = (slug, flag) => api.post(`/game/gate/${slug}/submit`, { flag });
export const useHint = (slug, level) => api.post(`/game/gate/${slug}/hint`, { level });
export const skipCheckpoint = (slug) => api.post(`/game/gate/${slug}/skip`);
export const getInventory = () => api.get("/game/inventory");
export const getLeaderboard = () => api.get("/game/leaderboard");
// Proposed for the UI, not on the server yet (mock versions in src/data/mockApi.js).
export const getReel = (cpId) => api.get(`/game/reel/${cpId}`);
export const getRules = () => api.get("/game/rules");
export const getActs = () => api.get("/game/acts"); // public: titles only, for the landing page

// Admin
export const adminLogin = (password) => api.post("/admin/login", { password });
export const adminOverview = () => api.get("/admin/overview");
