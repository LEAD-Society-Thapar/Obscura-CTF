import { Router } from "express";
import * as game from "../controllers/game.controller.js";
import { requireTeam } from "../middleware/auth.js";
import { submitLimiter } from "../middleware/submitLimiter.js";

const r = Router();
r.use(requireTeam);

r.get("/state", game.getEventState);
r.get("/progress", game.getProgress);
r.get("/inventory", game.getInventory);
r.get("/leaderboard", game.getLeaderboard);

r.get("/gate/:slug", game.getCheckpoint);
r.post("/gate/:slug/submit", submitLimiter, game.submitFlag);
r.post("/gate/:slug/hint", game.useHint);
r.post("/gate/:slug/skip", game.skipCheckpoint);
export default r;
