import { Router } from "express";
import * as admin from "../controllers/admin.controller.js";
import { adminLogin } from "../controllers/auth.controller.js";
import { requireAdmin } from "../middleware/auth.js";

const r = Router();
r.post("/login", adminLogin);

r.use(requireAdmin);
r.get("/overview", admin.overview);
r.post("/ticker", admin.pushTicker);
r.post("/event/status", admin.setEventStatus);
r.post("/teams/:teamId/adjust", admin.adjustTeam);
r.get("/submissions", admin.submissionLog);
r.post("/leaderboard/freeze", admin.toggleFreeze);
export default r;
