import { env } from "../config/env.js";
import { requireDb } from "../config/supabase.js";
import { HttpError } from "../utils/httpError.js";
import { TEAM_COOKIE, ADMIN_COOKIE, cookieOptions, signToken } from "../middleware/auth.js";

// POST /api/auth/login  { teamCode }
export async function teamLogin(req, res) {
  const teamCode = String(req.body?.teamCode || "").trim();
  if (!teamCode) throw new HttpError(400, "Team code is required");

  const db = requireDb();
  const { data: team, error } = await db
    .from("teams")
    .select("id, name")
    .eq("team_code", teamCode)
    .maybeSingle();

  if (error) throw error;
  if (!team) throw new HttpError(401, "Invalid team code");

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
