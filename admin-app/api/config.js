// Serves runtime config from real environment variables instead of
// hardcoded values in a committed file. Set these in the Vercel
// project's Environment Variables — same place/pattern as cloud-api's
// DATABASE_URL etc. Change them there and redeploy; no code edits.
//
// SUPABASE_ANON_KEY is safe to expose to the browser on purpose — it's
// Supabase's public client key, meant for this. Never put the service
// role key here.
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.POS_CONFIG = ${JSON.stringify({
    CLOUD_API_BASE: process.env.CLOUD_API_BASE || '',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  })};`);
};
