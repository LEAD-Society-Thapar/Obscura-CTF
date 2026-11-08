// ALL mock data lives in this file. Edit freely.
// Pages never import this file: data flows mock.js -> mockApi.js (fake server) -> hooks/useGameData.js -> pages.
// No flags here, ever: in mock mode any flag ending in "}" is accepted (see mockApi.js).
//
// Initial state matches the designs: Team 07, 425 pts, Act 2 in progress, CP 2.1 solved, CP 2.2 current,
// 2 hints used (-40), 1/5 relics (The Rusted Reel), streak 2.
// Values marked PLACEHOLDER are made up and need real content.

// Countdown starts at 01:29:45 from page load.
export const event = {
  status: "running",
  endsAt: new Date(Date.now() + (1 * 3600 + 29 * 60 + 45) * 1000).toISOString(),
  durationMinutes: 90,
};

export const team = {
  id: "team-07",
  name: "Team 07",
  avatarSlot: "team-avatar",
  points: 425, // server-authoritative; not derived from checkpoint points
};

export const stats = {
  hintsUsed: 2,
  hintPointsSpent: 40,
  streak: 2,
};

export const acts = [
  {
    id: 1,
    title: "Ramgarh Ka Rahasya",
    film: null,
    blurb: "PLACEHOLDER: Dust, dacoits and a village that remembers everything.",
    coverSlot: "act-1-cover",
    bannerSlot: "act-1-banner",
    relicId: "rusted-reel",
  },
  {
    id: 2,
    title: "Mumbai Ka Mayajaal",
    film: null,
    blurb: "City of dreams. City of lies. In the neon glow of Bombay, truth wears many masks.",
    coverSlot: "act-2-cover",
    bannerSlot: "act-2-banner",
    relicId: "wax-seal",
  },
  {
    id: 3,
    title: "Filmcity Ka Fitoor",
    film: null,
    blurb: "PLACEHOLDER: Lights, camera, conspiracy. Every set has a trapdoor.",
    coverSlot: "act-3-cover",
    bannerSlot: "act-3-banner",
    relicId: "directors-script",
  },
  {
    id: 4,
    title: "Bollywood Express",
    film: null,
    blurb: "PLACEHOLDER: A train, a ticket and a love letter that never arrived.",
    coverSlot: "act-4-cover",
    bannerSlot: "act-4-banner",
    relicId: "love-letter",
  },
  {
    id: 5,
    title: "Mogambo Ka Mars",
    film: null,
    blurb: "PLACEHOLDER: The red planet. The red lair. Mogambo is waiting.",
    coverSlot: "act-5-cover",
    bannerSlot: "act-5-banner",
    relicId: "martian-orb",
  },
];

// Builds a clearly labelled placeholder checkpoint for acts without real content yet.
const placeholderCp = (act, index, status, category = "Misc", points = 100) => ({
  id: `${act}.${index}`,
  act,
  index,
  slug: `mock-${act}-${index}`,
  title: `[Placeholder] Act ${act} Challenge ${index}`,
  category,
  points,
  status,
  story: "PLACEHOLDER: Story scene goes here.",
  body: "PLACEHOLDER: challenge text goes here.",
  posterSlot: `cp-${act}-${index}-poster`,
  downloads: [],
  hints: [
    { id: 1, cost: 20, teaser: "PLACEHOLDER hint teaser.", text: "PLACEHOLDER hint text." },
    { id: 2, cost: 40, teaser: "PLACEHOLDER second hint.", text: "PLACEHOLDER second hint text." },
  ],
  reel: {
    quote: "PLACEHOLDER: a filmi dialogue goes here.",
    clue: "PLACEHOLDER: clue to the next gate.",
    frameSlot: `reel-${act}-${index}`,
  },
});

// Order in this array = unlock order. Per-act counts come from here, never hard-coded.
// status: "solved" | "current" | "locked". slug: fake per-team slug (real ones are generated server-side).
// hints[].revealed is optional (default false).
export const checkpoints = [
  placeholderCp(1, 1, "solved", "Web"),
  placeholderCp(1, 2, "solved", "Misc"),
  placeholderCp(1, 3, "solved", "Crypto"),
  placeholderCp(1, 4, "solved", "Stego"),

  {
    id: "2.1",
    act: 2,
    index: 1,
    slug: "mock-2-1",
    title: "Welcome to Bombay",
    category: "Web",
    points: 100,
    status: "solved",
    story: "PLACEHOLDER: The train pulls into Bombay Central. Somewhere in this city, the Archive's first reel is hidden.",
    posterSlot: "cp-2-1-poster",
    downloads: [],
    hints: [{ id: 1, cost: 20, teaser: "PLACEHOLDER hint teaser.", text: "PLACEHOLDER hint text.", revealed: true }],
    reel: {
      quote: "PLACEHOLDER: a filmi dialogue goes here.",
      clue: "A new location has been marked on your map. Proceed to the next gate.",
      frameSlot: "reel-2-1",
    },
  },
  {
    id: "2.2",
    act: 2,
    index: 2,
    slug: "mock-2-2",
    title: "Poster Pe Likha Hai",
    category: "Misc",
    points: 100,
    status: "current",
    story:
      "A vintage poster surfaced from the old theatres of Bombay.\nThey say every blockbuster hides a secret message.\nTake a closer look... the hero isn't the only one with a line.",
    posterSlot: "cp-2-2-poster",
    downloads: [{ label: "poster_scan.jpg", href: "#", size: "PLACEHOLDER" }],
    hints: [
      {
        id: 1,
        cost: 20,
        teaser: "Maybe the dialogue isn't just a dialogue...",
        text: "PLACEHOLDER: real hint 1 text.",
      },
      { id: 2, cost: 40, teaser: "PLACEHOLDER second hint teaser.", text: "PLACEHOLDER: real hint 2 text." },
    ],
    reel: {
      quote: "Bade bade shehron mein aisi chhoti chhoti baatein hoti rehti hain...",
      clue: "A new location has been marked on your map. Proceed to the next gate.",
      frameSlot: "reel-2-2",
    },
  },
  {
    id: "2.3",
    act: 2,
    index: 3,
    slug: "mock-2-3",
    title: "City Strings",
    category: "Crypto",
    points: 150,
    status: "locked",
    story: "PLACEHOLDER: Story scene for City Strings.",
    posterSlot: "cp-2-3-poster",
    downloads: [],
    hints: [{ id: 1, cost: 20, teaser: "PLACEHOLDER hint teaser.", text: "PLACEHOLDER hint text." }],
    reel: {
      quote: "PLACEHOLDER: a filmi dialogue goes here.",
      clue: "A new location has been marked on your map. Proceed to the next gate.",
      frameSlot: "reel-2-3",
    },
  },
  {
    id: "2.4",
    act: 2,
    index: 4,
    slug: "mock-2-4",
    title: "The Last Show",
    category: "Stego",
    points: 200,
    status: "locked",
    story: "PLACEHOLDER: Story scene for The Last Show.",
    posterSlot: "cp-2-4-poster",
    downloads: [],
    hints: [{ id: 1, cost: 20, teaser: "PLACEHOLDER hint teaser.", text: "PLACEHOLDER hint text." }],
    reel: {
      quote: "PLACEHOLDER: a filmi dialogue goes here.",
      clue: "The Wax Seal is yours. A new act opens on your map.",
      frameSlot: "reel-2-4",
    },
  },

  placeholderCp(3, 1, "locked", "Web"),
  placeholderCp(3, 2, "locked", "Misc"),
  placeholderCp(3, 3, "locked", "Crypto", 150),
  placeholderCp(3, 4, "locked", "Stego", 200),

  placeholderCp(4, 1, "locked", "Web"),
  placeholderCp(4, 2, "locked", "Crypto", 150),
  placeholderCp(4, 3, "locked", "Misc", 150),
  placeholderCp(4, 4, "locked", "Stego", 200),

  placeholderCp(5, 1, "locked", "Web", 150),
  placeholderCp(5, 2, "locked", "Crypto", 200),
  placeholderCp(5, 3, "locked", "Stego", 200),
  placeholderCp(5, 4, "locked", "Misc", 300),
];

// Design names. The original plan used different relic names (see server/src/data/checkpoints.js).
export const relics = [
  { id: "rusted-reel", name: "The Rusted Reel", act: 1, collected: true, slot: "relic-rusted-reel", inscription: null, lore: null },
  { id: "wax-seal", name: "The Wax Seal", act: 2, collected: false, slot: "relic-wax-seal", inscription: null, lore: null },
  { id: "directors-script", name: "The Director's Script", act: 3, collected: false, slot: "relic-directors-script", inscription: null, lore: null },
  { id: "love-letter", name: "The Love Letter", act: 4, collected: false, slot: "relic-love-letter", inscription: null, lore: null },
  { id: "martian-orb", name: "The Martian Orb", act: 5, collected: false, slot: "relic-martian-orb", inscription: null, lore: null },
];

// Newest first. Text is built in the UI (ActivityFeed) so the CP label format stays in lib/format.js.
// type: "solve" | "hint" | "relic"
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();
export const activity = [
  { id: 6, type: "solve", cpId: "2.1", delta: 100, at: minutesAgo(3) },
  { id: 5, type: "hint", cpId: "2.1", delta: -20, at: minutesAgo(5) },
  { id: 4, type: "relic", relicId: "rusted-reel", delta: 0, at: minutesAgo(9) },
  { id: 3, type: "solve", cpId: "1.4", delta: 100, at: minutesAgo(9) },
  { id: 2, type: "hint", cpId: "1.3", delta: -20, at: minutesAgo(14) },
];

// Design 8.
export const rules = [
  { id: 1, icon: "clock", title: "90 Minutes", body: "A single global countdown for all teams." },
  {
    id: 2,
    icon: "scroll",
    title: "Five Acts, One Face-off",
    body: "Progress in order: every solved checkpoint opens the next gate. Clear all five acts to reach Mogambo. Submit answers as OBSCURA{answer}. Case and spaces don't matter, and the bare answer works too.",
  },
  {
    id: 3,
    icon: "mask",
    title: "Memes, Movies and More",
    body: "Clues are meme-based. Expect twists, references and hidden meanings.",
  },
  { id: 4, icon: "bulb", title: "Hints and Penalties", body: "Each hint costs points. Use them wisely." },
  { id: 5, icon: "relic", title: "Five Relics", body: "Collect all relics to unlock the final face-off." },
  {
    id: 6,
    icon: "shield",
    title: "No Cheating",
    body: "Fair play only. Use of external brute-force tools, flag-sharing, or malicious activity will lead to disqualification.",
  },
];

// Other teams (PLACEHOLDER). The logged-in team's row is merged in live by mockApi.getLeaderboard().
export const leaderboard = [
  { teamId: "team-03", team: "Team 03", points: 910, solved: 9 },
  { teamId: "team-11", team: "Team 11", points: 780, solved: 8 },
  { teamId: "team-01", team: "Team 01", points: 640, solved: 7 },
  { teamId: "team-14", team: "Team 14", points: 505, solved: 6 },
  { teamId: "team-05", team: "Team 05", points: 390, solved: 5 },
  { teamId: "team-09", team: "Team 09", points: 300, solved: 4 },
  { teamId: "team-12", team: "Team 12", points: 180, solved: 2 },
];
