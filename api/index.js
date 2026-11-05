// Vercel serverless entry: runs the whole Express API as one function.
// vercel.json rewrites /api/* here; req.url keeps the original path, so Express routes match as usual.
import app from "../server/src/app.js";

export default app;
