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
# fill in server/.env (Supabase URL + service-role key, secrets)
# run supabase/schema.sql in the Supabase SQL editor
npm run dev                  # client :5173, server :5000
```
Open http://localhost:5173. The landing page shows the API status.
The client runs on mock data by default; see `client/README.md`.

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
│       ├── controllers/    request handlers (game/admin still TODO)
│       ├── data/           static checkpoint metadata (no flags)
│       ├── middleware/     auth, submit limiter, error handling
│       ├── routes/         /api routes + gateHunt.routes.js (root-level puzzle routes)
│       └── utils/          gate slug derivation, flag hashing
├── supabase/schema.sql     draft schema
└── docs/                   plan and decisions
```

## Rules the code must keep
- Flags never leave the server. Stored as SHA-256 hashes, validated server-side only.
- Gate slugs are per-team: `HMAC(GATE_SECRET, teamId + previousFlag)`.
- Submissions: 1 per 10 s per team; 60 s cooldown after 5 wrong in a row.
- The Supabase service-role key lives only in `server/.env`.
