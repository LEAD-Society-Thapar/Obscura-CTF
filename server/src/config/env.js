const required = ["JWT_SECRET", "ADMIN_PASSWORD", "GATE_SECRET", "FLAG_PEPPER"];
const missing = required.filter((k) => !process.env[k]);

const isProd = process.env.NODE_ENV === "production";
if (missing.length && isProd) {
  throw new Error(`Missing required env vars: ${missing.join(", ")}`);
}
if (missing.length) {
  console.warn(`[env] Missing ${missing.join(", ")} (ok for early dev, required in production)`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd,
  port: Number(process.env.PORT) || 5000,
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret",
  adminPassword: process.env.ADMIN_PASSWORD || "",
  gateSecret: process.env.GATE_SECRET || "dev-only-gate-secret",
  // Key for flag hashes. Must be identical wherever the seed runs and wherever the API runs.
  flagPepper: process.env.FLAG_PEPPER || "dev-only-flag-pepper",
  flagPepperIsSet: !!process.env.FLAG_PEPPER,
};
