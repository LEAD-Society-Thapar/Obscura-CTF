import { Router } from "express";
import { env } from "../config/env.js";
import authRoutes from "./auth.routes.js";
import gameRoutes from "./game.routes.js";
import adminRoutes from "./admin.routes.js";

const r = Router();

r.get("/health", (_req, res) => {
  res.json({ ok: true, env: env.nodeEnv, time: new Date().toISOString() });
});

r.use("/auth", authRoutes);
r.use("/game", gameRoutes);
r.use("/admin", adminRoutes);

export default r;
