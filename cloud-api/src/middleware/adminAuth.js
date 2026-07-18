// Placeholder admin auth: a single shared secret from env. This is
// enough to gate provisioning-code creation during development, but a
// real dashboard needs proper admin accounts (owner/manager login,
// per-tenant scoping, session or JWT auth) — swap this out before
// this goes anywhere near production.
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || token !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'invalid_admin_key' });
  }
  next();
}

module.exports = { authenticateAdmin };
