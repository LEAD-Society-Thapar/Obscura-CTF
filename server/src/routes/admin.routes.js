import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";
import { adminLogin, adminLogout, adminMe } from "../controllers/auth.controller.js";
import { requireAdmin } from "../middleware/auth.js";

const r = Router();
r.post("/login", adminLogin);
r.post("/logout", adminLogout);

r.use(requireAdmin);
r.get("/me", adminMe);
r.get("/overview", admin.overview);
r.get("/leaderboard", admin.leaderboard);
r.post("/event", admin.eventAction);
r.post("/event/extend", admin.extendEvent);
r.post("/teams/:teamId/time", admin.addTeamTime);
r.post("/teams/:teamId/attempts/ignore", admin.ignoreAttempt);
r.post("/teams/:teamId/fullscreen/forgive", admin.forgiveViolation);
r.post("/fullscreen", admin.setFullscreenRule);
r.post("/coins", admin.addCoinsAll);
r.post("/teams/:teamId/coins", admin.addTeamCoins);
export default r;
