import crypto from "node:crypto";

// Team passwords are stored as "scrypt$<salt hex>$<hash hex>". No extra dependency needed.
const KEY_LEN = 32;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

// Async: scrypt takes ~30 ms of CPU. scryptSync would freeze the whole server for that long on every login (1500
// screens logging in = ~50 s of nothing else being answered); crypto.scrypt runs on libuv's thread pool instead.
export async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await new Promise((resolve, reject) =>
    crypto.scrypt(String(password), Buffer.from(saltHex, "hex"), expected.length, (err, key) => (err ? reject(err) : resolve(key)))
  );
  return crypto.timingSafeEqual(actual, expected);
}
