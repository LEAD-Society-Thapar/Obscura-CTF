// Built-in puzzle tools, shown on a checkpoint's page when challenges.json lists them in `tools`
// (components/game/ToolPanel.jsx). They replace outside websites like CyberChef, which are not allowed: the hunt
// runs in full screen. Free to use. Pure functions only; everything runs in the browser and nothing is sent anywhere.
//
// Each tool is generic (a Base64 decoder, not "the answer to 2.3"), so no answer lives in the client.
// What teams SEE is deliberately neutral ("Decoder", never "Morse decoder"): naming the cipher would give the
// puzzle away. Keep titles, descriptions, placeholders and error messages free of cipher names.

// ---------- Base64 -> text ----------
export function base64Decode(input) {
  const clean = String(input).replace(/\s+/g, "");
  if (!clean) return "";
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) throw new Error("This decoder cannot read that input.");
  let bin;
  try {
    bin = atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, "="));
  } catch {
    throw new Error("This decoder cannot read that input.");
  }
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

// ---------- Vigenère decode ----------
// Only letters are shifted and only letters use up key letters; case, spaces and punctuation are kept.
export function vigenereDecode(text, key) {
  const shifts = [...String(key).toUpperCase()].filter((c) => c >= "A" && c <= "Z").map((c) => c.charCodeAt(0) - 65);
  if (!shifts.length) throw new Error("Enter a key made of letters.");
  let k = 0;
  return [...String(text)]
    .map((ch) => {
      const upper = ch >= "A" && ch <= "Z";
      const lower = ch >= "a" && ch <= "z";
      if (!upper && !lower) return ch;
      const base = upper ? 65 : 97;
      const shift = shifts[k++ % shifts.length];
      return String.fromCharCode(((ch.charCodeAt(0) - base - shift + 26) % 26) + base);
    })
    .join("");
}

// ---------- Hex -> text ----------
// One output line per input line. Printable ASCII is shown as itself; any other byte as "·".
export function hexToText(input) {
  return String(input)
    .split(/\r?\n/)
    .map((line) => {
      const clean = line.replace(/0x/gi, "").replace(/[\s,:]+/g, "");
      if (!clean) return "";
      if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2) throw new Error(`This decoder cannot read the line "${line.trim()}".`);
      let out = "";
      for (let i = 0; i < clean.length; i += 2) {
        const b = parseInt(clean.slice(i, i + 2), 16);
        out += b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : "·";
      }
      return out;
    })
    .join("\n");
}

// ---------- Morse -> text ----------
const MORSE = {
  ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E", "..-.": "F", "--.": "G", "....": "H", "..": "I",
  ".---": "J", "-.-": "K", ".-..": "L", "--": "M", "-.": "N", "---": "O", ".--.": "P", "--.-": "Q", ".-.": "R",
  "...": "S", "-": "T", "..-": "U", "...-": "V", ".--": "W", "-..-": "X", "-.--": "Y", "--..": "Z",
  "-----": "0", ".----": "1", "..---": "2", "...--": "3", "....-": "4", ".....": "5", "-....": "6", "--...": "7",
  "---..": "8", "----.": "9",
};
// Letters are separated by spaces, words by " / " or a new line. Unknown patterns come out as "?".
export function morseDecode(input) {
  return String(input)
    .replace(/[•·]/g, ".")
    .replace(/[–—_−]/g, "-")
    .split(/\s*(?:\/|\r?\n)\s*/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => MORSE[code] ?? "?")
        .join("")
    )
    .filter(Boolean)
    .join(" ");
}

// ---------- Character inspector ----------
// Splits text into characters and flags letters outside basic Latin (A-Z, a-z), with their code point and script.
const SCRIPTS = ["Latin", "Cyrillic", "Greek", "Armenian", "Cherokee", "Devanagari"];
const scriptOf = (ch) => SCRIPTS.find((s) => new RegExp(`\\p{Script=${s}}`, "u").test(ch)) ?? "other";
export function inspectCharacters(text) {
  return [...String(text)].map((ch) => {
    const cp = ch.codePointAt(0);
    const letter = /\p{L}/u.test(ch);
    return {
      ch,
      code: `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`,
      script: letter ? scriptOf(ch) : null,
      suspicious: letter && cp > 0x7f,
    };
  });
}

// ---------- Modular power: base^exponent mod modulus ----------
const MAX_DIGITS = 40;
const toBig = (s, name) => {
  const t = String(s).trim();
  if (!/^\d+$/.test(t)) throw new Error(`${name} must be a whole number.`);
  if (t.length > MAX_DIGITS) throw new Error(`${name} is too long.`);
  return BigInt(t);
};
export function modPow(base, exponent, modulus) {
  let b = toBig(base, "Each base");
  let e = toBig(exponent, "The exponent");
  const m = toBig(modulus, "The modulus");
  if (m === 0n) throw new Error("The modulus must be at least 1.");
  let r = 1n % m;
  b %= m;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return r;
}
// Several bases at once ("38 1 1 38"), same exponent and modulus.
export function modPowMany(bases, exponent, modulus) {
  const list = String(bases).trim().split(/[\s,]+/).filter(Boolean);
  if (!list.length) throw new Error("Enter at least one number.");
  if (list.length > 100) throw new Error("At most 100 numbers at a time.");
  return list.map((b) => ({ base: b, result: modPow(b, exponent, modulus).toString() }));
}

// ---------- Registry: what challenges.json can list in a checkpoint's "tools" ----------
// `button` is the label of the open button. Titles stay neutral on purpose (see the top of this file).
export const TOOLS = {
  base64: { title: "Decoder", blurb: "Paste text from the challenge to decode it.", button: "Use decoder" },
  vigenere: { title: "Decoder", blurb: "Paste text from the challenge and enter a key.", button: "Use decoder" },
  hex: { title: "Decoder", blurb: "Paste rows from the challenge, one per line. Unreadable characters show as ·.", button: "Use decoder" },
  morse: { title: "Decoder", blurb: "Type or paste a coded message. Put a space between letters.", button: "Use decoder" },
  unicode: { title: "Inspector", blurb: "Paste text to look at it character by character.", button: "Use inspector" },
  modpow: { title: "Calculator", blurb: "Works out base^exponent mod n, for one or several bases at once.", button: "Use calculator" },
};
