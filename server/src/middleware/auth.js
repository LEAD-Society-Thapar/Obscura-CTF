import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "../utils/httpError.js";

export const TEAM_COOKIE = "sat_team";
export const ADMIN_COOKIE = "sat_admin";

export const cookieOptions = {
  httpOnly: true,
  sameSite: env.isProd ? "none" : "lax", // "none" needed if client and API are on different domains
  secure: env.isProd,
  maxAge: 1000 * 60 * 60 * 6, // event is 90 min, 6h is a safe ceiling
};

export function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "6h" });
}

function readToken(req, cookieName) {
  const token = req.cookies?.[cookieName];
  if (!token) throw new HttpError(401, "Not logged in");
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    throw new HttpError(401, "Session expired, log in again");
  }
}

export function requireTeam(req, _res, next) {
  try {
    const payload = readToken(req, TEAM_COOKIE);
    if (payload.role !== "team") throw new HttpError(403, "Forbidden");
    req.team = { id: payload.teamId, name: payload.teamName };
    next();
  } catch (e) {
    next(e);
  }
}

// Sets req.team when a valid team cookie is present, otherwise carries on as a guest.
export function optionalTeam(req, res, next) {
  requireTeam(req, res, () => {}); // on failure requireTeam passes the error to this no-op
  next();
}

export function requireAdmin(req, _res, next) {
  try {
    const payload = readToken(req, ADMIN_COOKIE);
    if (payload.role !== "admin") throw new HttpError(403, "Forbidden");
    req.admin = true;
    next();
  } catch (e) {
    next(e);
  }
}
