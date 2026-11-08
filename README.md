# SAT CTF - Round 1 (LEAD Society, TIET)

Bollywood treasure-hunt CTF website: 5 acts, 20 checkpoints, 90-minute global countdown.
See `docs/` for the full plan.

## Stack
- **Client:** React + Vite + Tailwind CSS v4 (JavaScript)
- **Server:** Node.js + Express 5
- **Database:** Supabase (Postgres), accessed only from the server

## Setup
```bash
npm run install:all          # installs root, client and server deps
cp server/.env.example server/.env
cp client/.env.example client/.env
# fill in server/.env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (ask a teammate, never commit them)
npm run dev                  # client :5173, server :5000
```
Open http://localhost:5173 and log in with Team ID `team1`, password `1234`. Without server/private/flags.local.json every checkpoint accepts the
dev flag `OBSCURA{test}`.

`.env` files are gitignored, so a fresh clone has none: without the Supabase values the server answers
"Database is not configured".

### Database (once per Supabase project)
The team shares one Supabase project, so only one person does this:
1. Supabase dashboard -> SQL Editor: run `supabase/schema.sql`.
   Upgrading from the v0 draft schema? Run `supabase/reset.sql` first (dev only: drops all game tables).
2. `npm run db:seed`: creates test teams `team1`..`team3` (password `1234`) and stores the flag hashes from
   `server/private/flags.local.json` (or, if that file is missing, the dev flag `OBSCURA{test}` everywhere).
   `-- --start-clock` also starts a fresh event clock; `-- --reset` also wipes all team progress.
   On the live DB use only `npm run db:seed:flags`.

The key for `SUPABASE_SERVICE_ROLE_KEY` is the **secret** key (`sb_secret_...`) under Project Settings -> API Keys,
not the publishable one.

### Mock mode
Set `VITE_USE_MOCKS=true` in `client/.env` to run the UI on fake data with no server or DB (any Team ID and
password work). See `client/README.md`.

## Structure
```
sat-ctf/
├── client/                 React app (Vite dev server proxies /api to :5000)
│   └── src/
│       ├── api/            fetch wrapper + endpoint functions
│       ├── components/     layout/, ui/ and game/
│       ├── context/        AuthContext (team session), GameDataContext
│       ├── data/           mock data + fake server (mock mode, on by default)
│       ├── hooks/          data hooks: the only way pages read game data
│       ├── lib/            config, display formatters, art slot registry
│       ├── pages/          one file per screen (+ admin/)
│       └── routes/         ProtectedRoute, AdminRoute
├── server/
│   └── src/
│       ├── config/         env, supabase client
│       ├── controllers/    request handlers (admin still TODO)
│       ├── data/           game.js: acts, checkpoint text, hints, relics, rules (no flags)
│       ├── services/       teamState.js: a team's progress built from DB rows + game.js
│       ├── middleware/     auth, submit limiter, error handling
│       ├── routes/         /api routes + gateHunt.routes.js (root-level puzzle routes)
│       └── utils/          gate slug derivation, flag + password hashing
│   └── scripts/seed.js     npm run db:seed / db:seed:flags (flag hashes; dev teams; optional clock)
├── supabase/               schema.sql, reset.sql (dev only)
└── docs/                   plan and decisions
```

### Content and flags
- Public content (acts, checkpoints, relics, rules, final boss): `server/src/data/content/challenges.json`,
  loaded by `server/src/data/game.js`. Never import it from `client/`.
- Answers: `server/private/flags.local.json` (gitignored, never commit). `npm run db:seed:flags` hashes them into
  the `checkpoints` table and touches nothing else. It needs `FLAG_PEPPER`, which must match the deployed API's value.
- Schema changes after the first `schema.sql` run live in `supabase/migrations/` (apply in order).
- `npm test` runs the server unit tests (no DB needed).

## Rules the code must keep
- Flags never leave the server. Stored as `HMAC(FLAG_PEPPER, cpId + ":" + normalizedAnswer)`, validated
  server-side only. Answers are case/whitespace-insensitive and the `OBSCURA{...}` wrapper is optional
  (see `normalizeAnswer` in `server/src/utils/gate.js`).
- Gate slugs are per-team: `HMAC(GATE_SECRET, teamId + ":" + checkpointId)`.
- Submissions: 1 per 10 s per team; 60 s cooldown after 5 wrong in a row.
- The Supabase service-role key lives only in `server/.env`.
