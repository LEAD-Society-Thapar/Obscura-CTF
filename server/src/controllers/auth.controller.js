import crypto from "node:crypto";
import { env } from "../config/env.js";
import { requireDb } from "../config/supabase.js";
import { HttpError } from "../utils/httpError.js";
import { verifyPassword } from "../utils/password.js";
import { TEAM_COOKIE, ADMIN_COOKIE, cookieOptions, signToken } from "../middleware/auth.js";
import { loginGuard } from "../middleware/submitLimiter.js";

// Constant-time string comparison (hashing first makes the lengths equal).
const sameText = (a, b) => {
  const h = (s) => crypto.createHash("sha256").update(String(s)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
};

// POST /api/auth/login  { teamCode, password }   teamCode is the "Team ID" on the login screen.
export async function teamLogin(req, res) {
  const teamCode = String(req.body?.teamCode || "").trim();
  const password = String(req.body?.password || "");
  if (!teamCode || !password) throw new HttpError(400, "Enter your Team ID and password.");

  const db = requireDb();
  const { data: row, error } = await db
    .from("teams")
    .select("id, name, password_hash")
    .eq("team_code", teamCode)
    .maybeSingle();

  if (error) throw error;
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new HttpError(401, "Wrong Team ID or password.");
  }
  const team = { id: row.id, name: row.name };

  const token = signToken({ role: "team", teamId: team.id, teamName: team.name });
  res.cookie(TEAM_COOKIE, token, cookieOptions);
  res.json({ team });
}

export function teamLogout(_req, res) {
  res.clearCookie(TEAM_COOKIE, cookieOptions);
  res.json({ ok: true });
}

export function me(req, res) {
  res.json({ team: req.team });
}

// POST /api/admin/login  { username, password }
// Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD. Failed attempts are limited per client address.
export function adminLogin(req, res) {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const guard = loginGuard(req.ip || "unknown");
  const configured = !!env.adminUsername && !!env.adminPassword;
  // Both comparisons always run, so the response time does not reveal which half was wrong.
  const userOk = sameText(username, env.adminUsername);
  const passOk = sameText(password, env.adminPassword);
  if (!configured || !userOk || !passOk) {
    guard.fail();
    throw new HttpError(401, "Wrong admin username or password.");
  }
  guard.ok();
  res.cookie(ADMIN_COOKIE, signToken({ role: "admin", username }), cookieOptions);
  res.json({ ok: true, username });
}

export function adminLogout(_req, res) {
  res.clearCookie(ADMIN_COOKIE, cookieOptions);
  res.json({ ok: true });
}

// GET /api/admin/me   Lets the client check the admin cookie before showing the dashboard.
export function adminMe(req, res) {
  res.json({ ok: true, username: req.admin.username });
}
