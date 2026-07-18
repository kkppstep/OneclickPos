// Gates only POST /admin/tenants — the one action with no logged-in
// user to authenticate as yet, since it creates the tenant's first
// user. A single shared secret is acceptable here because only the
// platform operator runs this (onboarding a new business), not shop
// owners or staff in day-to-day use — see middleware/userAuth.js for
// everything else.
function authenticatePlatform(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || token !== process.env.PLATFORM_API_KEY) {
    return res.status(401).json({ error: 'invalid_platform_key' });
  }
  next();
}

module.exports = { authenticatePlatform };
