# OBSCURA client

React 19 + Vite + Tailwind CSS v4 + React Router 7. JavaScript only.

```bash
npm run dev      # http://localhost:5173 (proxies /api to :5000)
npm run build
```

`client/.env.example` sets `VITE_USE_MOCKS=false`: the real server + Supabase (log in with `team1` / `1234`, see the
root README). Set it to `true` (or leave it unset) for mock mode: fake data, no server, **any** Team ID and password.

## Folder layout

```
src/
├── api/              fetch wrapper (client.js) + endpoint functions (endpoints.js)
├── components/
│   ├── layout/       PublicLayout, GameLayout, AutoLayout, navbars, TickerSlot
│   ├── ui/           generic pieces: PaperCard, StampLabel, ArtSlot, Button, CategoryTag, ProgressBar, ...
│   └── game/         game pieces: CountdownChip, TeamChip, ActCard, CheckpointRow, HintPanel, FlagForm,
│                     ReelCardBody/ReelCardModal, RelicCard, ActivityFeed, RuleItem, TeamAccessCard
├── context/          AuthContext (team session), GameDataContext (progress snapshot + event clock)
├── data/             mock.js (ALL mock data) and mockApi.js (fake server)
├── hooks/            useGameData.js (every data hook + actions), useCountdown.js, dataSource.js
├── lib/              config.js (constants), format.js (display formats), artSlots.js (art registry)
├── pages/            one file per route (+ admin/)
└── routes/           ProtectedRoute, AdminRoute
```

## Routes and shells

| Path | Page | Shell |
|---|---|---|
| `/`, `/login` | Landing, Login | Public |
| `/rules`, `/leaderboard`, `*` | Rules, Leaderboard, NotFound | Auto: game navbar when logged in, public otherwise |
| `/map` | MissionMap | Game (login required) |
| `/challenges` | ChallengesHub (team dashboard) | Game |
| `/challenges/act/:actId` | ActChallenges | Game |
| `/gate/:slug` | Gate (challenge page; Reel Card modal after a solve) | Game |
| `/reel/:cpId` | ReelCard (standalone, e.g. `/reel/2.2`) | Game |
| `/relics` | Relics (`/inventory` redirects here) | Game |
| `/admin/login`, `/admin` | admin placeholders | Public |

## How data flows

```
data/mock.js ──> data/mockApi.js ─┐
                                  ├─> hooks/dataSource.js ──> hooks/useGameData.js ──> pages
api/endpoints.js ─────────────────┘        (USE_MOCKS picks one)
```

- **Pages never import `data/` or `api/endpoints.js` for game data.** They call hooks: `useTeam`, `useActs`, `useAct`,
  `useRelics`, `useActivity`, `useGate`, `useReel`, `useRules`, `useLeaderboard`, `useEventClock`, and
  `useGameActions` (`submitFlag`, `revealHint`). Every hook returns `{ loading, error?, ... }`.
- `mockApi.js` exports the same function names as `endpoints.js` and returns the response shapes the UI expects,
  so it doubles as the API contract: the server (`server/src/controllers/game.controller.js`) returns the same shapes.
  Keep the two in step when a shape changes. Game content for the live API is in `server/src/data/game.js`.
- Mock progress is kept in `sessionStorage`, so it survives a reload. Logging out resets it.
- **Flags never exist in the client.** In mock mode any flag ending in `}` is accepted. Mock rate limits
  (3 s between flags, 15 s cooldown after 5 wrong) live in `lib/config.js`; the real server uses 10 s / 60 s.
- Per-act checkpoint counts and progress chips are derived from `checkpoints` in `mock.js`. Add or remove
  rows and everything follows.

### Editing mock data

Everything is in `src/data/mock.js`: event end time, team, stats, acts, checkpoints (story, hints with
per-hint `cost`, downloads, reel card), relics, activity feed, rules, leaderboard. Fields marked
`PLACEHOLDER` need real content.

## Theme

All colours, fonts, radii, shadows and animations are tokens in the `@theme` block of `src/index.css`.
Change a token there and every screen follows. The same file has the texture utilities used as class names:
`paper-texture`, `panel-dark`, `torn-edge`, `film-strip`, `film-strip-v`, `grain-overlay`, `stamp`,
`dotted-route`, `noir-backdrop`. Fonts are loaded from Google Fonts in `client/index.html`.

Other one-place switches:

- `lib/config.js`: `FLAG_PREFIX` (shown as `OBSCURA{...}`), event name, mock timings.
- `lib/format.js`: checkpoint label (`CP 2.2`), points and delta formats, clock format.
- `--spacing-ticker` in `index.css`: height reserved under the game navbar for the Mogambo ticker (0 for now).

### Page transitions

`components/layout/PageTransition.jsx` wraps each layout's `<Outlet />`. On every route change it plays a short
"projector cut" (dark flicker + light sweep, `projector-cut` utility), develops the new page in from sepia
(`animate-page-in`) and scrolls back to the top. Add the `stagger` class to a list to make its children rise in one
after another. Timings are the `--animate-page-in` / `--animate-projector-cut` tokens and keyframes in `index.css`.

Motion respects `prefers-reduced-motion`: animations, delays and transitions collapse to nothing.

## Replacing art

Illustrations are `<ArtSlot name="..." />` placeholders. `src/lib/artSlots.js` lists every slot pattern with
its size. To add real art:

1. Put the file in `client/public/art/`, e.g. `client/public/art/act-2-cover.jpg`.
2. Add `"act-2-cover": "/art/act-2-cover.jpg"` to `ART_SOURCES` in `src/lib/artSlots.js`.

| Slot | Size (px) | Where |
|---|---|---|
| `landing-hero` | 1600 × 900 | Landing background |
| `act-1-cover` … `act-5-cover` | 640 × 400 | Mission map act cards |
| `act-1-banner` … `act-5-banner` | 480 × 720 | Act challenge list side panel |
| `cp-<act>-<index>-poster` (20) | 600 × 800 | Challenge page poster |
| `reel-<act>-<index>` (20) | 320 × 400 | Reel card film still |
| `relic-rusted-reel`, `relic-wax-seal`, `relic-directors-script`, `relic-love-letter`, `relic-martian-orb` | 400 × 400 | Relic cards |
| `team-avatar` | 96 × 96 | Team chip, dashboard |
