-- 004: coins for hints. Safe to re-run.
--
-- Every team starts with a fixed number of coins (START_COINS in server/src/services/coins.js) and pays for hints
-- with them; hints no longer cost points. A team's coins = START_COINS + event_state.coins_bonus
-- + teams.coins_adjust - sum(team_hints.cost). Organisers add or remove coins from the admin page, for every team
-- (coins_bonus) or for one team (coins_adjust). "Reset clock" sets both back to 0, except that a team keeps the
-- coins it has already spent (coins left never go below 0).
alter table teams
  add column if not exists coins_adjust int not null default 0;  -- coins given to (or taken from) this team only

alter table event_state
  add column if not exists coins_bonus int not null default 0;   -- coins given to (or taken from) every team
