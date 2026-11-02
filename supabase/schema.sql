-- SAT CTF - schema (v1). Run in the Supabase SQL editor, then `npm run db:seed`.
-- Upgrading from the v0 draft? Run reset.sql first (drops every game table).
-- Static content (acts, checkpoint text, hints, relics, rules) lives in server/src/data/game.js.
-- The DB holds only secrets (flag hashes, password hashes) and per-team state.
-- All access goes through the Express server using the secret / service-role key.
-- RLS is enabled with NO policies, so the publishable/anon key can read/write nothing.

create extension if not exists "pgcrypto";

-- ---------- Teams ----------
create table if not exists teams (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique,
  team_code      text not null unique,          -- the "Team ID" typed on the login screen
  password_hash  text not null,                 -- scrypt, see server/src/utils/password.js
  members        jsonb not null default '[]',   -- 3 to 4 member names
  points_adjust  int  not null default 0,       -- manual admin award/deduction
  created_at     timestamptz not null default now()
);

-- ---------- Checkpoints (flag stored as SHA-256 hash only) ----------
create table if not exists checkpoints (
  id         text primary key,                  -- "2.2" = act 2, checkpoint 2 (matches game.js)
  flag_hash  text not null                      -- sha256 hex of the flag
);

-- ---------- Per-team state. A team's points = sum(solves) - sum(hints) + points_adjust ----------
create table if not exists team_solves (
  team_id    uuid not null references teams(id) on delete cascade,
  cp_id      text not null references checkpoints(id),
  points     int  not null,
  solved_at  timestamptz not null default now(),
  primary key (team_id, cp_id)                  -- a checkpoint can only be scored once
);

create table if not exists team_hints (
  team_id      uuid not null references teams(id) on delete cascade,
  cp_id        text not null references checkpoints(id),
  hint_id      int  not null,
  cost         int  not null,
  revealed_at  timestamptz not null default now(),
  primary key (team_id, cp_id, hint_id)         -- a hint is only charged once
);

create table if not exists team_relics (
  team_id    uuid not null references teams(id) on delete cascade,
  relic_id   text not null,
  earned_at  timestamptz not null default now(),
  primary key (team_id, relic_id)
);

-- ---------- Submissions (audit log + fair-play checks) ----------
create table if not exists submissions (
  id          bigserial primary key,
  team_id     uuid not null references teams(id) on delete cascade,
  cp_id       text not null references checkpoints(id),
  submitted   text not null,
  correct     boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists submissions_team_cp_idx on submissions(team_id, cp_id);

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
alter table team_solves      enable row level security;
alter table team_hints       enable row level security;
alter table team_relics      enable row level security;
alter table submissions      enable row level security;
alter table event_state      enable row level security;
alter table ticker_messages  enable row level security;
