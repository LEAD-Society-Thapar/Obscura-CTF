import { Router } from "express";
import { teamLogin, teamLogout, me } from "../controllers/auth.controller.js";
import { requireTeam } from "../middleware/auth.js";

const r = Router();
r.post("/login", teamLogin);
r.post("/logout", teamLogout);
r.get("/me", requireTeam, me);
export default r;
