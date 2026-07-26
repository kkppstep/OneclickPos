// Serves the deployed cloud-api URL from a real environment variable
// (CLOUD_API_BASE) instead of a hardcoded value in a committed file.
// Set CLOUD_API_BASE in the Vercel project's Environment Variables —
// same place/pattern as cloud-api's DATABASE_URL — and it takes effect
// on redeploy, no code edits or rebuild-from-source needed.
//
// NOTE: previously this set `window.POS_CONFIG`, but the frontend read
// `window.SERVER_CONFIG` — a naming mismatch that meant the app never
// actually saw a real CLOUD_API_BASE. Both sides now agree on
// `window.__POS_CONFIG__` (see src/lib/config.js).
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store'); // always reflect the current env var, never a stale cached copy
  res.send(`window.__POS_CONFIG__ = ${JSON.stringify({ CLOUD_API_BASE: process.env.CLOUD_API_BASE || '' })};`);
};
