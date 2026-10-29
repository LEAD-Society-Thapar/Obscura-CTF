import { Router } from "express";

// Routes that exist purely as "gate hunt" puzzle surfaces (robots.txt, sitemap.xml, POST /api/uday,
// X-Next-Gate headers, custom 404 clue pages...). They live at the site root, not under /api.
// Each one must serve content that depends on the logged-in team, since gate slugs are per-team.
// TODO: implement once the team confirms the final gate-method mapping per checkpoint.
const r = Router();

// r.get("/robots.txt", ...);
// r.get("/sitemap.xml", ...);
// r.get("/platform/:fare", ...);
// r.get("/host/:octet", ...);
// r.get("/raj-simran-nahi-hai", ...);

export default r;
