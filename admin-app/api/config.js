// Serves the deployed cloud-api URL from a real environment variable
// (CLOUD_API_BASE) instead of a hardcoded value in a committed file.
// Set CLOUD_API_BASE in the Vercel project's Environment Variables —
// same place/pattern as cloud-api's DATABASE_URL etc. Change it there
// and redeploy; no code edits needed.
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store'); // always reflect the current env var, never a stale cached copy
  res.send(`window.POS_CONFIG = ${JSON.stringify({ CLOUD_API_BASE: process.env.CLOUD_API_BASE || '' })};`);
};
