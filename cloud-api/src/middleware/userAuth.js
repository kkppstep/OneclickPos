const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

// Verifies a login token issued by POST /auth/login or
// /auth/google-exchange and attaches the caller's identity. Only user
// id + tenant id are trusted from the token; per-store role is always
// looked up fresh from store_users (see roles.js), so revoking
// someone's access takes effect immediately rather than waiting for
// their token to expire.
//
// Also checks the tenant's subscription_status on every request — a
// suspended/cancelled tenant is actually blocked, not just flagged in
// a column nobody reads.
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return res.status(401).json({ error: 'invalid_or_expired_token' });
  }

  try {
    const tenantRes = await db.query('SELECT subscription_status FROM tenants WHERE id = $1', [payload.tenant_id]);
    const status = tenantRes.rows[0]?.subscription_status;
    if (status === 'suspended' || status === 'cancelled') {
      return res.status(402).json({ error: 'subscription_inactive', subscription_status: status });
    }
  } catch (err) {
    console.error('[auth] tenant status check failed:', err.message);
    return res.status(500).json({ error: 'tenant_status_check_failed' });
  }

  req.user = { id: payload.sub, tenant_id: payload.tenant_id };
  next();
}

module.exports = { authenticateUser };
