import { env } from "../config/env.js";
import { requireDb } from "../config/supabase.js";
import { HttpError } from "../utils/httpError.js";
import { verifyPassword } from "../utils/password.js";
import { TEAM_COOKIE, ADMIN_COOKIE, cookieOptions, signToken } from "../middleware/auth.js";

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
  if (!row || !verifyPassword(password, row.password_hash)) {
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

// POST /api/admin/login  { password }
export function adminLogin(req, res) {
  const password = String(req.body?.password || "");
  if (!env.adminPassword || password !== env.adminPassword) {
    throw new HttpError(401, "Wrong admin password");
  }
  res.cookie(ADMIN_COOKIE, signToken({ role: "admin" }), cookieOptions);
  res.json({ ok: true });
}
