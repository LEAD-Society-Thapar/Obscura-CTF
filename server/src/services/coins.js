// Coins pay for hints. Points come only from correct answers (+ manual admin adjustment); hints never cost points.
//
//   coins total = START_COINS + event_state.coins_bonus (every team) + teams.coins_adjust (one team)
//   coins spent = sum of team_hints.cost        (hint costs come from challenges.json)
//   coins left  = total - spent
//
// Before migration 004 the two columns are missing and count as 0, so the game still works with START_COINS.
// Neither the total nor the coins left is ever below 0, whatever the stored numbers say (a hand edit in the
// database, or an organiser removing coins at the same instant a team buys a hint). A hint needs left >= cost.
export const START_COINS = 120;
export const MAX_COIN_CHANGE = 1000; // per admin action, either direction

export const coinsSupported = (ev, team) => !!ev && !!team && "coins_bonus" in ev && "coins_adjust" in team;

export const coinsSpent = (hints) => hints.reduce((n, h) => n + Number(h.cost || 0), 0);

export function coinsView(ev, team, hints) {
  const total = Math.max(0, START_COINS + Number(ev?.coins_bonus || 0) + Number(team?.coins_adjust || 0));
  const spent = coinsSpent(hints);
  return { total, spent, left: Math.max(0, total - spent) };
}

// For the admin guards: true when these numbers would leave the team with fewer coins than it has already spent.
// Uses the unfloored total on purpose (coinsView floors at 0, which would hide the shortfall).
export function wouldOverdraw(ev, team, hints) {
  const raw = START_COINS + Number(ev?.coins_bonus || 0) + Number(team?.coins_adjust || 0);
  return raw < coinsSpent(hints);
}

// What "Reset clock" leaves in teams.coins_adjust: added coins go, except what the team has already spent, so a
// team that spent coins it was given ends at 0 left, never below.
export const resetAdjust = (spent) => Math.max(0, spent - START_COINS);

// Admin input: a non-zero whole number of coins within MAX_COIN_CHANGE either way.
export function readCoins(body) {
  const coins = Number(body?.coins);
  if (!Number.isInteger(coins) || coins === 0 || Math.abs(coins) > MAX_COIN_CHANGE) {
    return null;
  }
  return coins;
}
