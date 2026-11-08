# OBSCURA: SAT CTF Round 1 (LEAD Society, TIET)

Bollywood treasure-hunt CTF website: 5 acts of 4 checkpoints each, then the final face-off (21 gates in all),
with a 90-minute global countdown. See `docs/` for the designs.

## Stack
- **Client:** React + Vite + Tailwind CSS v4 (JavaScript)
- **Server:** Node.js + Express 5 (deployed on Vercel as one serverless function, `api/index.js`)
- **Database:** Supabase (Postgres), accessed only from the server

## Setup
```bash
npm run install:all          # installs root, client and server deps
cp .env.example .env         # ONE env file, at the repo root (PowerShell: Copy-Item .env.example .env)
# fill in .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, ADMIN_PASSWORD, GATE_SECRET, FLAG_PEPPER
npm run dev                  # client :5173, server :5000
```
The server scripts and Vite both read the root `.env` (Vite only exposes `VITE_*` variables to the browser).
`client/.env` and `server/.env` are **not** read. `.env` is gitignored, so a fresh clone has none: without the
Supabase values the server answers "Database is not configured".

Open http://localhost:5173 and log in with Team ID `team1`, password `1234` (dev teams, see below).

### Database (once per Supabase project)
The team shares one Supabase project, so only one person does this:
1. Supabase dashboard -> SQL Editor: run `supabase/schema.sql`, then every file in `supabase/migrations/` in order.
   (`reset.sql` drops every game table and all data: dev only, never on the event database.)
2. `npm run db:seed:flags`: stores the flag hashes. Safe on the event database (it touches only the
   `checkpoints` table).
3. Dev only: `npm run db:seed` also creates test teams `team1`..`team3` (password `1234`).
   `-- --start-clock` also starts a fresh event clock; `-- --reset` also wipes all team progress.

The key for `SUPABASE_SERVICE_ROLE_KEY` is the **secret** key (`sb_secret_...`) under Project Settings -> API Keys,
not the publishable one.

### Mock mode
Set `VITE_USE_MOCKS=true` in the root `.env` to run the UI on fake data with no server or DB (any Team ID and
password work). See `client/README.md`.

## Content workflow
Two files hold the game:

| File | What | Git |
|---|---|---|
| `server/src/data/content/challenges.json` | acts, 20 checkpoints, final boss, relics, rules, story (no answers) | committed |
| `server/private/flags.local.json` | answers: `{ "<id>": { "primary": "OBSCURA{...}", "accept": [...] } }` for all 21 ids | **gitignored, never commit** |

To change content or answers:
1. Edit `challenges.json` (and/or `flags.local.json`). Never re-type or "clean" content strings: CP 2.4 relies on
   Cyrillic look-alike letters and CP 1.1 shows HTML that must stay literal text.
2. `npm run verify:content`: checks structure, hint costs, that the 21 ids match the flags file, that no flag string
   is in the content, CP 2.4's look-alike letters, the relic acrostic and the 4500-point total. Fix any FAIL.
3. `npm run db:seed:flags`: re-hashes the answers into the `checkpoints` table (needed whenever answers change).
4. Content text changes need a redeploy (the JSON is bundled with the server). The client never imports it.

Optional, against a real database: `npm run e2e -- --allow-db` walks all 21 gates with a throwaway team
(`e2e_team`), checks what the API reveals at each step, and deletes the team and its rows afterwards.
It never touches other teams or the event clock. About 4 minutes (submissions are rate limited).

### FLAG_PEPPER
Flags are stored as `HMAC(FLAG_PEPPER, checkpointId + ":" + normalizedAnswer)`. `FLAG_PEPPER` must be the **same**
value in the root `.env` of whoever runs `db:seed:flags` and in the Vercel environment variables. If they differ,
no flag will ever match. Changing it means re-running `db:seed:flags`. The API refuses to start in production
without it, and the seed refuses to run without it.

## Structure
```
sat-ctf/
├── .env.example            the only env template (copy to .env at the repo root)
├── api/index.js            Vercel entry: the whole Express app as one function
├── client/                 React app (Vite dev server proxies /api to :5000)
│   └── src/
│       ├── api/            fetch wrapper + endpoint functions
│       ├── components/     layout/, ui/ (incl. SafeMarkdown) and game/
│       ├── context/        AuthContext (team session), GameDataContext
│       ├── data/           mock data + fake server (mock mode)
│       ├── hooks/          data hooks: the only way pages read game data
│       ├── lib/            config, display formatters, art slot registry
│       ├── pages/          one file per screen (+ admin/)
│       └── routes/         ProtectedRoute, AdminRoute
├── server/
│   ├── private/            flags.local.json (gitignored)
│   ├── scripts/            seed.js, verify-content.js, e2e.js
│   ├── test/               unit tests (npm test, no DB needed)
│   └── src/
│       ├── config/         env, supabase client
│       ├── controllers/    request handlers (admin still TODO)
│       ├── data/           game.js loads content/challenges.json (no flags)
│       ├── services/       teamState.js: a team's progress built from DB rows + game.js
│       ├── middleware/     auth, submit limiter, error handling
│       ├── routes/         /api routes + gateHunt.routes.js (root-level puzzle routes, empty)
│       └── utils/          gate slugs, answer normalization + flag hashing, password hashing
├── supabase/               schema.sql, migrations/, reset.sql (dev only)
└── docs/                   designs
```

## Rules the code must keep
- Flags never leave the server. Stored as keyed hashes (above), validated server-side only. Answers are case- and
  whitespace-insensitive and the `OBSCURA{...}` wrapper is optional (`normalizeAnswer` in `server/src/utils/gate.js`).
- Gate slugs are per-team: `HMAC(GATE_SECRET, teamId + ":" + checkpointId)`, first 16 base64url characters.
  A slug is only sent to a team once that gate is open.
- The final face-off only opens when the team holds all five relics (enforced twice on the server).
- Submissions: 1 per 10 s per team; 60 s cooldown after 5 wrong in a row (in memory, per server instance).
- The Supabase service-role key lives only in the root `.env` and in Vercel's environment variables.
- `npm test` and `npm run verify:content` must pass before deploying.
