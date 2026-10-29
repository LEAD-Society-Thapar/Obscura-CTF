import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import apiRoutes from "./routes/index.js";
import gateHuntRoutes from "./routes/gateHunt.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.set("trust proxy", 1); // Render/Vercel/Netlify sit behind a proxy
app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // allow same-origin / curl (no Origin header) and the configured frontends
      if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
if (!env.isProd) app.use(morgan("dev"));

app.use("/api", apiRoutes);
app.use(gateHuntRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
