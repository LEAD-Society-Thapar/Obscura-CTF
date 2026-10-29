-- SAT CTF - draft schema (v0). Run in Supabase SQL editor.
-- DRAFT: finalize after the team confirms points, flag model (global vs per-team) and gate methods.
-- All access goes through the Express server using the service-role key.
-- RLS is enabled with NO policies, so the anon key can read/write nothing.

create extension if not exists "pgcrypto";

-- ---------- Teams ----------
create table if not exists teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  team_code     text not null unique,          -- issued by volunteers
  members       jsonb not null default '[]',   -- 3 to 4 member names
  current_cp    int  not null default 1,       -- checkpoint the team is on
  score         int  not null default 0,
  finished_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- Checkpoints (flag stored as SHA-256 hash only) ----------
create table if not exists checkpoints (
  cp            int primary key,               -- 1..20
  act           int  not null,
  title         text not null,
  scene         text,                          -- Hinglish story text
  mission       text,                          -- the real question shown on site
  rules         text,
  points        int  not null,
  flag_hash     text not null,                 -- sha256 hex of the flag
  relic         text,                          -- relic name earned here, if any
  data_pack_url text,
  drawer        jsonb,                         -- one-liner / cheat sheet
  hint_l1       text,
  hint_l2       text,
  hint_l3       text,
  gate_method   text                           -- cookie | header | robots | ... (how the NEXT gate is found)
);

-- ---------- Submissions (audit log + fair-play checks) ----------
create table if not exists submissions (
  id            bigserial primary key,
  team_id       uuid not null references teams(id) on delete cascade,
  cp            int  not null references checkpoints(cp),
  submitted     text not null,
  correct       boolean not null,
  created_at    timestamptz not null default now()
);
create index if not exists submissions_team_cp_idx on submissions(team_id, cp);

-- ---------- Per-team progress on each checkpoint ----------
create table if not exists team_progress (
  team_id       uuid not null references teams(id) on delete cascade,
  cp            int  not null references checkpoints(cp),
  status        text not null default 'locked',  -- locked | open | solved | skipped
  gate_slug     text,                            -- per-team slug, derived server-side
  hint_level    int  not null default 1,         -- highest hint level used
  points_earned int  not null default 0,
  opened_at     timestamptz,
  solved_at     timestamptz,
  primary key (team_id, cp)
);

-- ---------- Relics ----------
create table if not exists team_relics (
  team_id       uuid not null references teams(id) on delete cascade,
  relic         text not null,
  cp            int  not null references checkpoints(cp),
  earned_at     timestamptz not null default now(),
  primary key (team_id, relic)
);

-- ---------- Global event state (single row) ----------
create table if not exists event_state (
  id                  int primary key default 1 check (id = 1),
  status              text not null default 'idle',   -- idle | running | paused | ended
  started_at          timestamptz,
  paused_at           timestamptz,
  total_paused_ms     bigint not null default 0,
  duration_minutes    int not null default 90,
  leaderboard_frozen  boolean not null default false
);
insert into event_state (id) values (1) on conflict do nothing;

-- ---------- Mogambo ticker ----------
create table if not exists ticker_messages (
  id          bigserial primary key,
  message     text not null,
  created_at  timestamptz not null default now()
);

-- ---------- Lock it down ----------
alter table teams            enable row level security;
alter table checkpoints      enable row level security;
alter table submissions      enable row level security;
alter table team_progress    enable row level security;
alter table team_relics      enable row level security;
alter table event_state      enable row level security;
alter table ticker_messages  enable row level security;
