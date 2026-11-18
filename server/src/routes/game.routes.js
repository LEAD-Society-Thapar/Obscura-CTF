import { Router } from "express";
import * as game from "../controllers/game.controller.js";
import { requireTeam } from "../middleware/auth.js";
import { submitLimiter } from "../middleware/submitLimiter.js";

const r = Router();

// Public (landing and rules pages work logged out). The leaderboard is admin only: /api/admin/leaderboard.
r.get("/acts", game.getActs);
r.get("/rules", game.getRules);

r.use(requireTeam);

r.get("/state", game.getEventState);
r.post("/fullscreen/violation", game.reportViolation);
r.get("/progress", game.getProgress);
r.get("/inventory", game.getInventory);
r.get("/reel/:cpId", game.getReel);

r.get("/gate/:slug", game.getCheckpoint);
r.post("/gate/:slug/submit", submitLimiter, game.submitFlag);
r.post("/gate/:slug/hint", game.useHint);
export default r;
