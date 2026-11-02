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
Open http://localhost:5173 and log in with Team ID `team1`, password `1234`. Every checkpoint accepts the
dev flag `OBSCURA{test}`.

`.env` files are gitignored, so a fresh clone has none: without the Supabase values the server answers
"Database is not configured".

### Database (once per Supabase project)
The team shares one Supabase project, so only one person does this:
1. Supabase dashboard -> SQL Editor: run `supabase/schema.sql`.
   Upgrading from the v0 draft schema? Run `supabase/reset.sql` first (dev only: drops all game tables).
2. `npm run db:seed`: creates test teams `team1`..`team3` (password `1234`), stores the dev flag hash for every
   checkpoint and starts a fresh 90-minute clock. Safe to re-run; it restarts the clock each time.
   `npm run db:seed -- --reset` also wipes all team progress.

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
│   └── scripts/seed.js     npm run db:seed (dev teams, flag hashes, event clock)
├── supabase/               schema.sql, reset.sql (dev only)
└── docs/                   plan and decisions
```

## Rules the code must keep
- Flags never leave the server. Stored as SHA-256 hashes, validated server-side only.
- Gate slugs are per-team: `HMAC(GATE_SECRET, teamId + previousFlag)`.
- Submissions: 1 per 10 s per team; 60 s cooldown after 5 wrong in a row.
- The Supabase service-role key lives only in `server/.env`.
