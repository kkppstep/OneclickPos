const db = require('../db');

// Requires the caller to hold one of allowedRoles at a specific store
// (owner/manager/cashier/kitchen_staff — see schema.sql's store_users
// table). The store must also belong to the caller's own tenant, so a
// user can never act on a store outside their tenant even if they
// somehow guessed its id.
function requireStoreRole(allowedRoles) {
  return async (req, res, next) => {
    const storeId = req.params.storeId || req.params.store_id || req.body.store_id || req.query.store_id;
    if (!storeId) return res.status(400).json({ error: 'store_id_required' });

    const { rows } = await db.query(
      `SELECT su.role FROM store_users su
       JOIN stores s ON s.id = su.store_id
       WHERE su.user_id = $1 AND su.store_id = $2 AND s.tenant_id = $3`,
      [req.user.id, storeId, req.user.tenant_id]
    );
    if (rows.length === 0 || !allowedRoles.includes(rows[0].role)) {
      return res.status(403).json({ error: 'insufficient_role' });
    }
    next();
  };
}

// For tenant-scoped resources not tied to one store (categories,
// products) — allowed if the caller holds one of allowedRoles at ANY
// store in their own tenant. Tenant is always the caller's own
// (from their JWT), never taken from the request body.
function requireTenantRole(allowedRoles) {
  return async (req, res, next) => {
    const { rows } = await db.query(
      `SELECT 1 FROM store_users su
       JOIN stores s ON s.id = su.store_id
       WHERE su.user_id = $1 AND s.tenant_id = $2 AND su.role = ANY($3)
       LIMIT 1`,
      [req.user.id, req.user.tenant_id, allowedRoles]
    );
    if (rows.length === 0) return res.status(403).json({ error: 'insufficient_role' });
    next();
  };
}

module.exports = { requireStoreRole, requireTenantRole };
