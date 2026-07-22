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
// Also checks, on every request: the tenant's subscription_status
// (suspended/cancelled tenants are blocked entirely — not just a
// column nobody reads) and the individual user's is_active flag
// (lets a platform admin deactivate one specific account without
// touching the rest of the tenant).
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
    const res1 = await db.query(
      `SELECT t.subscription_status, u.is_active
       FROM tenants t
       JOIN users u ON u.tenant_id = t.id
       WHERE t.id = $1 AND u.id = $2`,
      [payload.tenant_id, payload.sub]
    );
    const row = res1.rows[0];
    if (!row) return res.status(401).json({ error: 'account_not_found' });
    if (row.subscription_status === 'suspended' || row.subscription_status === 'cancelled') {
      return res.status(402).json({ error: 'subscription_inactive', subscription_status: row.subscription_status });
    }
    if (!row.is_active) {
      return res.status(403).json({ error: 'account_deactivated' });
    }
  } catch (err) {
    console.error('[auth] status check failed:', err.message);
    return res.status(500).json({ error: 'status_check_failed' });
  }

  req.user = { id: payload.sub, tenant_id: payload.tenant_id };
  next();
}

module.exports = { authenticateUser };
