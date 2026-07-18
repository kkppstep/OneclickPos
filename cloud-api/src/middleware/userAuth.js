const jwt = require('jsonwebtoken');
const config = require('../config');

// Verifies a login token issued by POST /auth/login and attaches the
// caller's identity. Only user id + tenant id are trusted from the
// token; per-store role is always looked up fresh from store_users
// (see roles.js), so revoking someone's access takes effect
// immediately rather than waiting for their token to expire.
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, tenant_id: payload.tenant_id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_or_expired_token' });
  }
}

module.exports = { authenticateUser };
