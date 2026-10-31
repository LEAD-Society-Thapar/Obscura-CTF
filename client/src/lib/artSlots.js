// Every illustration in the designs is an "art slot". Until real art exists, <ArtSlot> draws a
// themed placeholder at the right aspect ratio.
//
// To add real art:
//   1. Put the image in client/public/art/ (e.g. client/public/art/act-2-cover.jpg)
//   2. Map the slot name to its path in ART_SOURCES below.
// Sizes are the recommended export size (2x the largest on-screen size); the ratio is what matters.
export const ART_SLOTS = [
  // Landing page background collage (design 1). Wide, can be busy at the edges; the centre-left is covered by text.
  { pattern: /^landing-hero$/, example: "landing-hero", w: 1600, h: 900, use: "Landing background collage (design 1)" },
  // Act card art on the mission map (design 2). One per act: act-1-cover ... act-5-cover. Bottom-right is covered by the title label.
  { pattern: /^act-\d+-cover$/, example: "act-2-cover", w: 640, h: 400, use: "Mission map act card (design 2)" },
  // Tall left panel of the act challenge list (design 3). One per act. Bottom half sits under a dark gradient + text.
  { pattern: /^act-\d+-banner$/, example: "act-2-banner", w: 480, h: 720, use: "Act challenge list side panel (design 3)" },
  // Poster on the challenge page (design 4). One per checkpoint: cp-<act>-<index>-poster.
  { pattern: /^cp-\d+-\d+-poster$/, example: "cp-2-2-poster", w: 600, h: 800, use: "Challenge page poster (design 4)" },
  // Film frame on the reel card (design 5). One per checkpoint: reel-<act>-<index>.
  { pattern: /^reel-\d+-\d+$/, example: "reel-2-2", w: 320, h: 400, use: "Reel card film still (design 5)" },
  // Relic artwork (designs 6, 7). Square, subject centred. relic-rusted-reel, relic-wax-seal, ...
  { pattern: /^relic-[\w-]+$/, example: "relic-rusted-reel", w: 400, h: 400, use: "Relic card (designs 6, 7)" },
  // Team avatar, shown in a circle (navbar, dashboard).
  { pattern: /^team-avatar$/, example: "team-avatar", w: 96, h: 96, use: "Team avatar (navbar, design 6)" },
];

// slot name -> image path (served from client/public). Empty = placeholders everywhere.
export const ART_SOURCES = {
  // "act-2-cover": "/art/act-2-cover.jpg",
};

const FALLBACK = { w: 4, h: 3, use: "Unregistered slot" };

export const slotSpec = (name) => ART_SLOTS.find((s) => s.pattern.test(name)) || FALLBACK;
