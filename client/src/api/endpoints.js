import { api } from "./client.js";

export const health = () => api.get("/health");

// Auth
// The Team ID typed on the login screen is the team's code on the server.
export const teamLogin = (teamCode, password) => api.post("/auth/login", { teamCode, password });
export const teamLogout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me");

// Game
export const getEventState = () => api.get("/game/state");
export const reportViolation = () => api.post("/game/fullscreen/violation"); // this device left full screen
export const getProgress = () => api.get("/game/progress");
export const getCheckpoint = (slug) => api.get(`/game/gate/${slug}`);
export const submitFlag = (slug, flag) => api.post(`/game/gate/${slug}/submit`, { flag });
export const useHint = (slug, level) => api.post(`/game/gate/${slug}/hint`, { level });
export const getInventory = () => api.get("/game/inventory");
export const getReel = (cpId) => api.get(`/game/reel/${cpId}`);
export const getRules = () => api.get("/game/rules");
export const getActs = () => api.get("/game/acts"); // public: titles only, for the landing page

// Admin (always the real API, also in mock mode)
export const adminLogin = (username, password) => api.post("/admin/login", { username, password });
export const adminLogout = () => api.post("/admin/logout");
export const adminMe = () => api.get("/admin/me");
export const adminOverview = () => api.get("/admin/overview");
export const adminLeaderboard = () => api.get("/admin/leaderboard");
export const adminEvent = (action) => api.post("/admin/event", { action }); // start | pause | resume | end | reset
export const adminExtendEvent = (minutes) => api.post("/admin/event/extend", { minutes });
export const adminTeamTime = (teamId, minutes) => api.post(`/admin/teams/${teamId}/time`, { minutes });
export const adminIgnoreAttempt = (teamId, cpId) => api.post(`/admin/teams/${teamId}/attempts/ignore`, { cpId });
export const adminForgiveViolation = (teamId) => api.post(`/admin/teams/${teamId}/fullscreen/forgive`);
export const adminFullscreenRule = (required) => api.post("/admin/fullscreen", { required });
export const adminCoinsAll = (coins) => api.post("/admin/coins", { coins }); // negative removes
export const adminTeamCoins = (teamId, coins) => api.post(`/admin/teams/${teamId}/coins`, { coins });
