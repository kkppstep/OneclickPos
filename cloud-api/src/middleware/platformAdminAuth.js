const jwt = require('jsonwebtoken');
const config = require('../config');

// Verifies a platform-admin login token. Uses config.platformJwtSecret,
// not the tenant-user jwtSecret — a platform-admin token and a tenant-
// user token are never interchangeable, by construction, not just by
// a role check that could have a bug.
function authenticatePlatformAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  try {
    const payload = jwt.verify(token, config.platformJwtSecret);
    req.platformAdmin = { id: payload.sub };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid_or_expired_token' });
  }
}

module.exports = { authenticatePlatformAdmin };
