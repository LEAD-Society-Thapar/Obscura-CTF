-- SAT CTF - DEV ONLY. Drops every game table and ALL data (teams, progress, submissions).
-- Use it to move from an older schema, then run schema.sql and `npm run db:seed`.
-- Never run this against the live event database.

drop table if exists submissions      cascade;
drop table if exists team_progress    cascade;  -- v0 draft table
drop table if exists team_solves      cascade;
drop table if exists team_hints       cascade;
drop table if exists team_relics      cascade;
drop table if exists checkpoints      cascade;
drop table if exists teams            cascade;
drop table if exists event_state      cascade;
drop table if exists ticker_messages  cascade;
