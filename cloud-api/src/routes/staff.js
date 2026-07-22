const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateUser } = require('../middleware/userAuth');
const { requireStoreRole } = require('../middleware/roles');
const { requireFeature } = require('../middleware/features');

const router = express.Router();

const INVITABLE_ROLES = ['manager', 'cashier', 'kitchen_staff'];

// POST /admin/stores/:storeId/staff — owner-only. Creates a login for
// a manager/cashier/kitchen_staff at this store. If the email already
// belongs to a user in this tenant (e.g. someone who works two
// branches), reuses that user and just adds the new store_users row
// instead of creating a duplicate account.
//
// No invite-link/reset-password flow yet — the owner sets an initial
// password directly and shares it with the staff member out of band.
router.post('/admin/stores/:storeId/staff', authenticateUser, requireFeature('staff_management'), requireStoreRole(['owner']), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !INVITABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: 'name_email_password_and_valid_role_required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
      [req.user.tenant_id, email]
    );

    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      const userRes = await client.query(
        `INSERT INTO users (id, tenant_id, name, email, password_hash)
         VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id`,
        [req.user.tenant_id, name, email, passwordHash]
      );
      userId = userRes.rows[0].id;
    }

    await client.query(
      `INSERT INTO store_users (id, user_id, store_id, role)
       VALUES (gen_random_uuid(), $1, $2, $3)
       ON CONFLICT (user_id, store_id) DO UPDATE SET role = excluded.role`,
      [userId, req.params.storeId, role]
    );

    await client.query('COMMIT');
    res.status(201).json({ user_id: userId, store_id: req.params.storeId, role });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[staff] add failed:', err.message);
    res.status(500).json({ error: 'staff_add_failed' });
  } finally {
    client.release();
  }
});

// GET /admin/stores/:storeId/staff — owner or manager can view who has access.
router.get('/admin/stores/:storeId/staff', authenticateUser, requireFeature('staff_management'), requireStoreRole(['owner', 'manager']), async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, su.role
     FROM store_users su JOIN users u ON u.id = su.user_id
     WHERE su.store_id = $1 ORDER BY su.role, u.name`,
    [req.params.storeId]
  );
  res.json({ staff: rows });
});

// DELETE /admin/stores/:storeId/staff/:userId — owner-only. Removes
// this person's access to this specific store; doesn't touch their
// access at any other store or delete their user account.
router.delete('/admin/stores/:storeId/staff/:userId', authenticateUser, requireFeature('staff_management'), requireStoreRole(['owner']), async (req, res) => {
  const { rows } = await db.query(
    `DELETE FROM store_users WHERE store_id = $1 AND user_id = $2 AND role != 'owner' RETURNING id`,
    [req.params.storeId, req.params.userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'not_found_or_cannot_remove_owner' });
  res.json({ removed: true });
});

module.exports = router;
