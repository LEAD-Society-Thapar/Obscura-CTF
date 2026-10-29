// Static checkpoint metadata. NO flags in this file (flags live hashed in the DB / env).
// Points reflect the Ques tab (6,050 total). Confirm with the team before launch:
// the Game Flow tab used a different set (4,750 total).
export const ACTS = [
  { act: 1, title: "Ramgarh Ka Rahasya", film: "Sholay", checkpoints: [1, 2, 3, 4, 5] },
  { act: 2, title: "Mumbai Ka Mayajaal", film: "Hera Pheri, Deewaar, Munna Bhai", checkpoints: [6, 7, 8, 9, 10] },
  { act: 3, title: "Filmcity Ka Fitoor", film: "Om Shanti Om, Golmaal, Welcome", checkpoints: [11, 12, 13, 14] },
  { act: 4, title: "Pyaar Ki Rail", film: "DDLJ, Jab We Met, Mohabbatein", checkpoints: [15, 16, 17] },
  { act: 5, title: "Mogambo Ka Mars", film: "Mr. India, Koi Mil Gaya", checkpoints: [18, 19, 20] },
];

export const CHECKPOINTS = [
  { cp: 1, act: 1, title: "Mogambo Ke Jasoos", points: 100, relic: null },
  { cp: 2, act: 1, title: "Gabbar Ka Khat", points: 250, relic: null },
  { cp: 3, act: 1, title: "Basanti Ki Diary", points: 250, relic: null },
  { cp: 4, act: 1, title: "Gabbar Ki Garaj", points: 250, relic: null },
  { cp: 5, act: 1, title: "Sambha Ka Signal", points: 400, relic: "Sambha Ki Doorbeen" },
  { cp: 6, act: 2, title: "Thane Police Ka Teapot", points: 250, relic: null },
  { cp: 7, act: 2, title: "Baburao Ka Leak", points: 250, relic: null },
  { cp: 8, act: 2, title: "Khandala Ka Ghat", points: 250, relic: null },
  { cp: 9, act: 2, title: "Mumbai Local Ka Raasta", points: 250, relic: null },
  { cp: 10, act: 2, title: "Babu Bhaiya Ka Chashma", points: 250, relic: "Babu Bhaiya Ka Ulta Chashma" },
  { cp: 11, act: 3, title: "Pooja Ki Query", points: 250, relic: null },
  { cp: 12, act: 3, title: "Studio Ka Network", points: 250, relic: null },
  { cp: 13, act: 3, title: "Golmaal Ka QR", points: 400, relic: null },
  { cp: 14, act: 3, title: "Uday Shetty Ka Dimaag", points: 400, relic: "Uday Shetty Ki Painting" },
  { cp: 15, act: 4, title: "Simran Ka Ticket", points: 250, relic: null },
  { cp: 16, act: 4, title: "Geet Ka Bit Flip", points: 400, relic: null },
  { cp: 17, act: 4, title: "Mohabbatein Ki Chitthi", points: 250, relic: "Mohabbatein Ki Chitthi" },
  { cp: 18, act: 5, title: "Hawa Hawai Ka Raasta", points: 250, relic: null },
  { cp: 19, act: 5, title: "Jadoo Ki Jhappi", points: 400, relic: "Jadoo Ka Ishaara" },
  { cp: 20, act: 5, title: "FINAL BOSS: Mogambo Khush Nahi Hua", points: 700, relic: null },
];

export const TOTAL_POINTS = CHECKPOINTS.reduce((sum, c) => sum + c.points, 0); // 6050

export const HINT_COST = { 2: 0.1, 3: 0.3 }; // fraction of the checkpoint's points
export const SKIP_COST = 0.4;
