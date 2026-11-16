-- 002: extra time per team, on top of the global event clock.
-- A team's clock ends at event start + duration + paused time + teams.extra_time_ms.
-- Set from the admin page ("+ time" on a team row). Safe to re-run.
alter table teams
  add column if not exists extra_time_ms bigint not null default 0;
