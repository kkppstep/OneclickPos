const express = require('express');
const db = require('../db');
const { authenticateUser } = require('../middleware/userAuth');

const router = express.Router();

// Both routes below take an order id, not a store id, so they can't
// use requireStoreRole directly (it expects store_id already present
// in the request) — each looks up the order's store first, then
// checks the caller's role there.
async function getCallerRoleAtOrdersStore(userId, orderId) {
  const orderRes = await db.query('SELECT store_id, tenant_id FROM orders WHERE id = $1', [orderId]);
  if (orderRes.rows.length === 0) return { order: null, role: null };
  const order = orderRes.rows[0];
  const roleRes = await db.query(
    'SELECT role FROM store_users WHERE user_id = $1 AND store_id = $2',
    [userId, order.store_id]
  );
  return { order, role: roleRes.rows[0]?.role || null };
}

// POST /admin/orders/:id/confirm-payment — owner/manager only. Marks
// any pending payment on this order as confirmed via staff override —
// this is the primary payment-confirmation path given Myanmar mobile
// wallets don't offer reliable webhook confirmation for small
// merchants (see schema.sql's payments.confirmed_by).
router.post('/admin/orders/:id/confirm-payment', authenticateUser, async (req, res) => {
  const { order, role } = await getCallerRoleAtOrdersStore(req.user.id, req.params.id);
  if (!order) return res.status(404).json({ error: 'order_not_found' });
  if (!['owner', 'manager'].includes(role)) return res.status(403).json({ error: 'insufficient_role' });

  const { rows } = await db.query(
    `UPDATE payments SET status = 'confirmed', confirmed_by = 'staff_override', confirmed_at = now()
     WHERE order_id = $1 AND status = 'pending' RETURNING *`,
    [req.params.id]
  );

  await db.query(
    `INSERT INTO audit_log (id, tenant_id, store_id, user_id, action, entity_type, entity_id)
     VALUES (gen_random_uuid(), $1, $2, $3, 'payment.manual_confirm', 'order', $4)`,
    [order.tenant_id, order.store_id, req.user.id, req.params.id]
  );

  res.json({ confirmed_payments: rows.length });
});

// POST /admin/orders/:id/status — any assigned role at that store can
// update status, since kitchen staff (not just owner/manager) need to
// mark an order completed once it's served.
router.post('/admin/orders/:id/status', authenticateUser, async (req, res) => {
  const { status } = req.body;
  if (!['open', 'completed', 'voided', 'refunded'].includes(status)) {
    return res.status(400).json({ error: 'invalid_status' });
  }

  const { order, role } = await getCallerRoleAtOrdersStore(req.user.id, req.params.id);
  if (!order) return res.status(404).json({ error: 'order_not_found' });
  if (!role) return res.status(403).json({ error: 'insufficient_role' });
  // Voiding/refunding is money-sensitive — restrict to owner/manager,
  // unlike the plain open -> completed step any staff role can do.
  if (['voided', 'refunded'].includes(status) && !['owner', 'manager'].includes(role)) {
    return res.status(403).json({ error: 'insufficient_role' });
  }

  await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);

  await db.query(
    `INSERT INTO audit_log (id, tenant_id, store_id, user_id, action, entity_type, entity_id, metadata)
     VALUES (gen_random_uuid(), $1, $2, $3, 'order.status_changed', 'order', $4, $5)`,
    [order.tenant_id, order.store_id, req.user.id, req.params.id, JSON.stringify({ status })]
  );

  res.json({ id: req.params.id, status });
});

module.exports = router;
