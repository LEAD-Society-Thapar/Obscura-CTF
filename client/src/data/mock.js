// ALL mock data lives in this file. Edit freely.
// Pages never import this file: data flows mock.js -> mockApi.js (fake server) -> hooks/useGameData.js -> pages.
// No flags here, ever: in mock mode any flag ending in "}" is accepted (see mockApi.js).
//
// Initial state matches the designs: Team 07, 425 pts, Act 2 in progress, CP 2.1 solved, CP 2.2 current,
// 2 hints used (20 of 120 coins), 1/5 relics (The Rusted Reel), streak 2.
// Values marked PLACEHOLDER are made up and need real content.

// Countdown starts at 00:59:45 from page load.
export const event = {
  status: "running",
  endsAt: new Date(Date.now() + (59 * 60 + 45) * 1000).toISOString(),
  durationMinutes: 60,
};

export const team = {
  id: "team-07",
  name: "Team 07",
  avatarSlot: "team-avatar",
  points: 425, // server-authoritative; not derived from checkpoint points
  coins: { total: 120, spent: 20, left: 100 }, // hints are paid in coins, never points
};

export const stats = {
  hintsUsed: 2,
  coinsSpent: 20,
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
    { id: 1, cost: 10, teaser: "PLACEHOLDER hint teaser.", text: "PLACEHOLDER hint text." },
    { id: 2, cost: 15, teaser: "PLACEHOLDER second hint.", text: "PLACEHOLDER second hint text." },
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
    hints: [{ id: 1, cost: 10, teaser: "PLACEHOLDER hint teaser.", text: "PLACEHOLDER hint text.", revealed: true }],
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
        cost: 10,
        teaser: "Maybe the dialogue isn't just a dialogue...",
        text: "PLACEHOLDER: real hint 1 text.",
      },
      { id: 2, cost: 15, teaser: "PLACEHOLDER second hint teaser.", text: "PLACEHOLDER: real hint 2 text." },
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
    hints: [{ id: 1, cost: 10, teaser: "PLACEHOLDER hint teaser.", text: "PLACEHOLDER hint text." }],
    reel: {
      quote: "PLACEHOLDER: a filmi dialogue goes here.",
      clue: "The Wax Seal is yours. A new act opens on your map.",
      frameSlot: "reel-2-3",
    },
  },

  placeholderCp(3, 1, "locked", "Web"),
  placeholderCp(3, 2, "locked", "Misc"),
  placeholderCp(3, 3, "locked", "Crypto", 150),

  placeholderCp(4, 1, "locked", "Web"),
  placeholderCp(4, 2, "locked", "Misc", 150),
  placeholderCp(4, 3, "locked", "Stego", 200),

  placeholderCp(5, 1, "locked", "Web", 150),
  placeholderCp(5, 2, "locked", "Crypto", 200),
  placeholderCp(5, 3, "locked", "Stego", 300),
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
  { id: 5, type: "hint", cpId: "2.1", delta: 0, coins: -10, at: minutesAgo(5) },
  { id: 4, type: "relic", relicId: "rusted-reel", delta: 0, at: minutesAgo(9) },
  { id: 3, type: "solve", cpId: "1.3", delta: 100, at: minutesAgo(9) },
  { id: 2, type: "hint", cpId: "1.2", delta: 0, coins: -10, at: minutesAgo(14) },
];

// Design 8.
export const rules = [
  {
    id: 1,
    section: "I. The Hunt",
    icon: "clock",
    title: "The 60-Minute Countdown",
    body: "- The competition runs for 60 minutes under one shared global countdown.\n- All teams compete within the same time window.\n- Manage your time carefully. Every second counts.\n- The hunt ends when the official countdown reaches zero. Follow event staff instructions regarding the submission deadline.",
  },
  {
    id: 2,
    section: "I. The Hunt",
    icon: "scroll",
    title: "Five Acts, Fifteen Checkpoints",
    body: "- OBSCURA consists of five Acts, each containing three checkpoints.\n- Checkpoints open in sequence. Closing a checkpoint, by solving it or by using all three attempts on it, opens the next one.\n- Finish all five Acts to unlock the final face-off against Mogambo.\n- Each finished Act rewards your team with one unique relic, even if you missed checkpoints in it.\n- Collect all five relics to access the final challenge.",
  },
  {
    id: 3,
    section: "I. The Hunt",
    icon: "mask",
    title: "Submitting Flags",
    body: "- Submit answers in the format `OBSCURA{answer}`. You may also submit the bare answer without the wrapper.\n- Answers are case-insensitive. Spaces, underscores, hyphens and commas are ignored, so `Red Door`, `red door` and `RED-DOOR` are the same answer.\n- Read challenge instructions carefully and give exactly what is asked for (the right numbers, words and order).\n- **You get three attempts per checkpoint, including the final face-off.** A wrong answer uses one attempt. After the third wrong answer the checkpoint closes with zero points and the next one opens.\n- Agree on the answer as a team and check its format before you submit. You will be asked to confirm.",
  },
  {
    id: 4,
    section: "II. Scoring and Hints",
    icon: "check",
    title: "Points and Scoring",
    body: "- Points grow with every act. A correct answer scores **20 points in Act 1, 40 in Act 2, 70 in Act 3, 100 in Act 4 and 120 in Act 5**. The final face-off is worth **150 points**.\n- A wrong answer scores zero and uses one of your three attempts. There is no negative marking.\n- Hints never cost points. They are paid for with coins (see Hints and Coins).\n- The maximum score is 1,200 points.\n- Ranking: more points first. On equal points, the team that reached its last correct answer earlier ranks higher. If that is also equal, the team with more coins left ranks higher.",
  },
  {
    id: 5,
    section: "II. Scoring and Hints",
    icon: "bulb",
    title: "Hints and Coins",
    body: "- Every team starts with **120 coins**.\n- Each checkpoint has two optional hints, unlocked in order. On every checkpoint, **hint 1 costs 10 coins** and **hint 2 costs 15 coins**.\n- Coins are spent the moment you reveal a hint, whether or not you then solve the checkpoint. When your coins run out, no more hints.\n- 120 coins covers hint 1 on 12 checkpoints, or both hints on only 4. Spend them wisely: coins left over can break a tie.",
  },
  {
    id: 6,
    section: "III. Tools and Fair Play",
    icon: "scroll",
    title: "No Outside Help",
    body: "- No internet searches, other websites, apps or AI assistants during the hunt. It is played on this site only, in full screen.\n- Where a checkpoint needs a tool, such as a decoder or a calculator, it is built into that checkpoint's page. Built-in tools are free and never cost coins.\n- Pen and paper are allowed for working things out.\n- Using any other device, tool or outside help may result in disqualification at event staff discretion.",
  },
  {
    id: 7,
    section: "III. Tools and Fair Play",
    icon: "user",
    title: "Team Collaboration",
    body: "- Collaboration among members of the same registered team is encouraged.\n- Each team must use its assigned team account.\n- Do not share team credentials with participants outside your registered team.\n- Sharing flags, answers, or solutions with other competing teams is prohibited.",
  },
  {
    id: 8,
    section: "III. Tools and Fair Play",
    icon: "shield",
    title: "Fair Play and Prohibited Activities",
    body: "- Do not share flags, hints, or solutions with other competing teams.\n- Do not attack the CTF platform, its infrastructure, or other teams' accounts.\n- Unauthorized access, exploitation, or disruption of competition infrastructure is prohibited.\n- Brute-force attacks against the platform or challenge infrastructure are prohibited.\n- Do not manipulate scores, alter game progress, or interfere with another team's participation.\n- **Stay in full screen while the clock is running.** Every exit from full screen is a violation, and so is switching to another window, app or desktop (Alt+Tab, Task View, touchpad swipes). After 3, your team is disqualified: its timer stops and no flags or hints are accepted. Only event staff can restore access.\n- Violations may result in disqualification at event staff discretion.",
  },
  {
    id: 9,
    section: "IV. Event Protocol",
    icon: "clock",
    title: "Technical Issues and Support",
    body: "- Report technical issues to event staff immediately.\n- Do not exploit platform malfunctions or interfere with the system.\n- Event staff will assess reported issues and determine the appropriate resolution.\n- A technical issue does not automatically pause or extend the global countdown.",
  },
];
