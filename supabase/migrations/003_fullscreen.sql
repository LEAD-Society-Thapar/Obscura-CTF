-- 003: full-screen invigilation. Safe to re-run.
--
-- While the clock is running, a team's devices must stay in full screen. Every exit is a violation; the third one
-- locks the team: its timer freezes at the time it had left and it cannot open gates or submit. An organiser can
-- forgive one violation from the admin page, which unlocks the team and resumes its timer from where it froze.
alter table teams
  add column if not exists fs_violations          int         not null default 0,  -- exits counted so far
  add column if not exists fs_last_violation_at   timestamptz,                       -- also used to drop duplicate reports
  add column if not exists fs_locked_at           timestamptz,                       -- set while the team is locked out
  add column if not exists fs_locked_remaining_ms bigint;                            -- the team's time left when it was locked

-- Organiser switch for the whole rule (on by default).
alter table event_state
  add column if not exists fullscreen_required boolean not null default true;
