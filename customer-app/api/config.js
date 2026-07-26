// Serves the deployed cloud-api URL from a real environment variable
// (CLOUD_API_BASE) instead of a hardcoded value in a committed file.
// Set CLOUD_API_BASE in the Vercel project's Environment Variables —
// same place/pattern as cloud-api's DATABASE_URL — and it takes effect
// on redeploy, no code edits or rebuild-from-source needed.
//
// Exported as ESM (`export default`), not `module.exports` — package.json
// has "type": "module", which makes Node treat every .js file in this
// project as an ES module. A CommonJS `module.exports` here throws
// `ReferenceError: module is not defined in ES module scope` at request
// time, which surfaces as a 500 with no other symptoms.
export default (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.__POS_CONFIG__ = ${JSON.stringify({ CLOUD_API_BASE: process.env.CLOUD_API_BASE || '' })};`);
};
