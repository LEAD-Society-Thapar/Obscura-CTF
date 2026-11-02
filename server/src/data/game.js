// Static game content served by the API. NO flags here (flag hashes live in the `checkpoints` table).
// Ported from client/src/data/mock.js so the live API shows the same screens as mock mode.
// Values marked PLACEHOLDER need real content. The original plan's titles/points are in ./checkpoints.js.

export const ACTS = [
  {
    id: 1,
    title: "Ramgarh Ka Rahasya",
    blurb: "PLACEHOLDER: Dust, dacoits and a village that remembers everything.",
    coverSlot: "act-1-cover",
    bannerSlot: "act-1-banner",
    relicId: "rusted-reel",
  },
  {
    id: 2,
    title: "Mumbai Ka Mayajaal",
    blurb: "City of dreams. City of lies. In the neon glow of Bombay, truth wears many masks.",
    coverSlot: "act-2-cover",
    bannerSlot: "act-2-banner",
    relicId: "wax-seal",
  },
  {
    id: 3,
    title: "Filmcity Ka Fitoor",
    blurb: "PLACEHOLDER: Lights, camera, conspiracy. Every set has a trapdoor.",
    coverSlot: "act-3-cover",
    bannerSlot: "act-3-banner",
    relicId: "directors-script",
  },
  {
    id: 4,
    title: "Pyaar Ki Rail",
    blurb: "PLACEHOLDER: A train, a ticket and a love letter that never arrived.",
    coverSlot: "act-4-cover",
    bannerSlot: "act-4-banner",
    relicId: "love-letter",
  },
  {
    id: 5,
    title: "Mogambo Ka Mars",
    blurb: "PLACEHOLDER: The red planet. The red lair. Mogambo is waiting.",
    coverSlot: "act-5-cover",
    bannerSlot: "act-5-banner",
    relicId: "martian-orb",
  },
];

const placeholderCp = (act, index, category = "Misc", points = 100) => ({
  id: `${act}.${index}`,
  act,
  index,
  title: `[Placeholder] Act ${act} Challenge ${index}`,
  category,
  points,
  story: "PLACEHOLDER: Story scene goes here.",
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

// Order in this array = unlock order. Each id needs a row in the `checkpoints` table (npm run db:seed).
export const CHECKPOINTS = [
  placeholderCp(1, 1, "Web"),
  placeholderCp(1, 2, "Misc"),
  placeholderCp(1, 3, "Crypto"),
  placeholderCp(1, 4, "Stego"),

  {
    id: "2.1",
    act: 2,
    index: 1,
    title: "Welcome to Bombay",
    category: "Web",
    points: 100,
    story: "PLACEHOLDER: The train pulls into Bombay Central. Somewhere in this city, the Archive's first reel is hidden.",
    posterSlot: "cp-2-1-poster",
    downloads: [],
    hints: [{ id: 1, cost: 20, teaser: "PLACEHOLDER hint teaser.", text: "PLACEHOLDER hint text." }],
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
    title: "Poster Pe Likha Hai",
    category: "Misc",
    points: 100,
    story:
      "A vintage poster surfaced from the old theatres of Bombay.\nThey say every blockbuster hides a secret message.\nTake a closer look... the hero isn't the only one with a line.",
    posterSlot: "cp-2-2-poster",
    downloads: [{ label: "poster_scan.jpg", href: "#", size: "PLACEHOLDER" }],
    hints: [
      { id: 1, cost: 20, teaser: "Maybe the dialogue isn't just a dialogue...", text: "PLACEHOLDER: real hint 1 text." },
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
    title: "City Strings",
    category: "Crypto",
    points: 150,
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
    title: "The Last Show",
    category: "Stego",
    points: 200,
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

  placeholderCp(3, 1, "Web"),
  placeholderCp(3, 2, "Misc"),
  placeholderCp(3, 3, "Crypto", 150),
  placeholderCp(3, 4, "Stego", 200),

  placeholderCp(4, 1, "Web"),
  placeholderCp(4, 2, "Crypto", 150),
  placeholderCp(4, 3, "Misc", 150),
  placeholderCp(4, 4, "Stego", 200),

  placeholderCp(5, 1, "Web", 150),
  placeholderCp(5, 2, "Crypto", 200),
  placeholderCp(5, 3, "Stego", 200),
  placeholderCp(5, 4, "Misc", 300),
];

// The last checkpoint of an act grants that act's relic.
export const RELICS = [
  { id: "rusted-reel", name: "The Rusted Reel", act: 1, slot: "relic-rusted-reel" },
  { id: "wax-seal", name: "The Wax Seal", act: 2, slot: "relic-wax-seal" },
  { id: "directors-script", name: "The Director's Script", act: 3, slot: "relic-directors-script" },
  { id: "love-letter", name: "The Love Letter", act: 4, slot: "relic-love-letter" },
  { id: "martian-orb", name: "The Martian Orb", act: 5, slot: "relic-martian-orb" },
];

export const RULES = [
  { id: 1, icon: "clock", title: "90 Minutes", body: "A single global countdown for all teams." },
  {
    id: 2,
    icon: "scroll",
    title: "Five Acts, Twenty Checkpoints",
    body: "Progress in order. Unlock new gates using Reel Cards.",
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
