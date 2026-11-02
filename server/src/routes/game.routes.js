import { Router } from "express";
import * as game from "../controllers/game.controller.js";
import { optionalTeam, requireTeam } from "../middleware/auth.js";
import { submitLimiter } from "../middleware/submitLimiter.js";

const r = Router();

// Public (landing and rules pages work logged out).
r.get("/acts", game.getActs);
r.get("/rules", game.getRules);
r.get("/leaderboard", optionalTeam, game.getLeaderboard);

r.use(requireTeam);

r.get("/state", game.getEventState);
r.get("/progress", game.getProgress);
r.get("/inventory", game.getInventory);
r.get("/reel/:cpId", game.getReel);

r.get("/gate/:slug", game.getCheckpoint);
r.post("/gate/:slug/submit", submitLimiter, game.submitFlag);
r.post("/gate/:slug/hint", game.useHint);
r.post("/gate/:slug/skip", game.skipCheckpoint);
export default r;
