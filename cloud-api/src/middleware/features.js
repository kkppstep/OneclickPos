const db = require('../db');

// Canonical list of gate-able features. A tenant's sidebar tabs and
// the matching API endpoints are both locked unless the platform
// admin has explicitly turned the key on for that tenant — missing
// key defaults to locked, not open. See tenants.feature_overrides.
const FEATURE_KEYS = ['live_orders', 'analytics', 'staff_management'];

function requireFeature(key) {
  return async (req, res, next) => {
    const { rows } = await db.query('SELECT feature_overrides FROM tenants WHERE id = $1', [req.user.tenant_id]);
    const enabled = rows[0]?.feature_overrides?.[key] === true;
    if (!enabled) {
      return res.status(403).json({ error: 'feature_not_enabled', feature: key });
    }
    next();
  };
}

module.exports = { requireFeature, FEATURE_KEYS };
