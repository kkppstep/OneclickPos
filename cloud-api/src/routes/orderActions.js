const express = require('express');
const db = require('../db');
const { authenticateUser } = require('../middleware/userAuth');

const router = express.Router();
const PAYMENT_CONFIRM_ROLES = ['owner', 'manager', 'cashier'];
function canConfirmPayment(role) { return PAYMENT_CONFIRM_ROLES.includes(role); }

// Both routes below take an order id, not a store id, so they can't
// use requireStoreRole directly (it expects store_id already present
// in the request) — each looks up the order's store first, then
// checks the caller's role there.
async function getCallerRoleAtOrdersStore(userId, orderId) {
  const orderRes = await db.query('SELECT store_id, tenant_id, status, prepared_at FROM orders WHERE id = $1', [orderId]);
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
  if (order.status !== 'open') return res.status(400).json({ error: 'order_not_open' });
  if (!order.prepared_at) return res.status(400).json({ error: 'order_not_prepared' });
  if (!canConfirmPayment(role)) return res.status(403).json({ error: 'insufficient_role' });

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
// mark an order completed once it's served. Completing now requires
// payment already confirmed — voiding (cancel) doesn't.
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

  if (status === 'completed') {
    if (!order.prepared_at) return res.status(400).json({ error: 'order_not_prepared' });
    const pending = await db.query(
      `SELECT 1 FROM payments WHERE order_id = $1 AND status = 'pending' LIMIT 1`,
      [req.params.id]
    );
    if (pending.rows.length > 0) return res.status(400).json({ error: 'payment_not_confirmed' });
  }

  await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, req.params.id]);

  await db.query(
    `INSERT INTO audit_log (id, tenant_id, store_id, user_id, action, entity_type, entity_id, metadata)
     VALUES (gen_random_uuid(), $1, $2, $3, 'order.status_changed', 'order', $4, $5)`,
    [order.tenant_id, order.store_id, req.user.id, req.params.id, JSON.stringify({ status })]
  );

  res.json({ id: req.params.id, status });
});

// ---------------------------------------------------------------
// Table-level actions — a table can carry more than one open order
// (customer ordered more after the first round), so checkout is a
// single action across all of them, not order-by-order.
// ---------------------------------------------------------------

async function getCallerRoleAtStore(userId, storeId) {
  const { rows } = await db.query('SELECT role FROM store_users WHERE user_id = $1 AND store_id = $2', [userId, storeId]);
  return rows[0]?.role || null;
}

function aggregateReceiptItems(orders) {
  const groups = new Map();
  for (const order of orders) {
    for (const item of (order.items || [])) {
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.unit_price || 0);
      const notes = item.notes || '';
      const productKey = item.product_id || item.product_name_snapshot || 'unknown';
      const key = `${productKey}|${unitPrice}|${notes}`;
      const existing = groups.get(key);
      if (existing) {
        existing.qty += qty;
        existing.line_total += Number(item.line_total || qty * unitPrice);
      } else {
        groups.set(key, {
          product_id: item.product_id || null,
          product_name_snapshot: item.product_name_snapshot,
          qty,
          unit_price: unitPrice,
          line_total: Number(item.line_total || qty * unitPrice),
          notes: notes || null,
        });
      }
    }
  }
  return Array.from(groups.values());
}

async function openOrdersForTable(storeId, tableNumber) {
  const { rows } = await db.query(
    `SELECT o.*,
       (SELECT COALESCE(json_agg(oi.* ORDER BY oi.created_at), '[]') FROM order_items oi WHERE oi.order_id = o.id) AS items,
       (SELECT COALESCE(json_agg(p.*), '[]') FROM payments p WHERE p.order_id = o.id) AS payments
     FROM orders o
     WHERE o.store_id = $1 AND o.table_number = $2 AND o.status = 'open' AND o.prepared_at IS NOT NULL
     ORDER BY o.created_at`,
    [storeId, tableNumber]
  );
  return rows;
}

// POST /admin/orders/:id/prepared — marks one order as prepared.
router.post('/admin/orders/:id/prepared', authenticateUser, async (req, res) => {
  const { order, role } = await getCallerRoleAtOrdersStore(req.user.id, req.params.id);
  if (!order) return res.status(404).json({ error: 'order_not_found' });
  if (!role) return res.status(403).json({ error: 'insufficient_role' });
  const { rows } = await db.query(
    `UPDATE orders SET prepared_at = COALESCE(prepared_at, now()), prepared_by = COALESCE(prepared_by, $1)
     WHERE id = $2 AND status = 'open' RETURNING id, prepared_at`,
    [req.user.id, req.params.id]
  );
  res.json({ order: rows[0] });
});

// POST /admin/stores/:storeId/tables/:tableNumber/prepared — marks every open order at a table as prepared.
router.post('/admin/stores/:storeId/tables/:tableNumber/prepared', authenticateUser, async (req, res) => {
  const role = await getCallerRoleAtStore(req.user.id, req.params.storeId);
  if (!role) return res.status(403).json({ error: 'insufficient_role' });
  const { rows } = await db.query(
    `UPDATE orders SET prepared_at = COALESCE(prepared_at, now()), prepared_by = COALESCE(prepared_by, $1)
     WHERE store_id = $2 AND table_number = $3 AND status = 'open' RETURNING id, prepared_at`,
    [req.user.id, req.params.storeId, req.params.tableNumber]
  );
  if (!rows.length) return res.status(404).json({ error: 'no_open_orders_for_table' });
  res.json({ table_number: req.params.tableNumber, orders: rows });
});

// POST /admin/stores/:storeId/tables/:tableNumber/confirm-payment —
// owner/manager. Finds every still-open order at this table, confirms
// any pending payments on all of them, and returns the combined set
// (with items) so the client can render one receipt covering all of
// it — this is the "2 orders, 1 bill" case.
router.post('/admin/stores/:storeId/tables/:tableNumber/confirm-payment', authenticateUser, async (req, res) => {
  const role = await getCallerRoleAtStore(req.user.id, req.params.storeId);
  if (!canConfirmPayment(role)) return res.status(403).json({ error: 'insufficient_role' });

  const orders = await openOrdersForTable(req.params.storeId, req.params.tableNumber);
  if (orders.length === 0) return res.status(404).json({ error: 'no_open_orders_for_table' });

  const orderIds = orders.map((o) => o.id);
  await db.query(`UPDATE payments SET status = 'confirmed', confirmed_by = 'staff_override', confirmed_at = now() WHERE order_id = ANY($1) AND status = 'pending'`, [orderIds]);

  await db.query(
    `INSERT INTO audit_log (id, tenant_id, store_id, user_id, action, entity_type, entity_id, metadata)
     VALUES (gen_random_uuid(), $1, $2, $3, 'payment.manual_confirm', 'table', $4, $5)`,
    [orders[0].tenant_id, req.params.storeId, req.user.id, req.params.tableNumber, JSON.stringify({ order_ids: orderIds })]
  );

  // Re-fetch so the response reflects the just-confirmed payment status.
  const confirmedOrders = await openOrdersForTable(req.params.storeId, req.params.tableNumber);
  const items = aggregateReceiptItems(confirmedOrders);
  const total = items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  res.json({ table_number: req.params.tableNumber, orders: confirmedOrders, items, total });
});

// POST /admin/stores/:storeId/tables/:tableNumber/complete — any
// assigned role, matching the per-order rule. Rejects if any order at
// the table still has unconfirmed payment — confirm-payment above is
// a required step first, not optional.
router.post('/admin/stores/:storeId/tables/:tableNumber/complete', authenticateUser, async (req, res) => {
  const role = await getCallerRoleAtStore(req.user.id, req.params.storeId);
  if (!role) return res.status(403).json({ error: 'insufficient_role' });

  const orders = await openOrdersForTable(req.params.storeId, req.params.tableNumber);
  if (orders.length === 0) return res.status(404).json({ error: 'no_open_orders_for_table' });

  const stillPending = orders.some((o) => o.payments.some((p) => p.status === 'pending'));
  if (stillPending) return res.status(400).json({ error: 'payment_not_confirmed' });

  const orderIds = orders.map((o) => o.id);
  await db.query(`UPDATE orders SET status = 'completed' WHERE id = ANY($1)`, [orderIds]);

  await db.query(
    `INSERT INTO audit_log (id, tenant_id, store_id, user_id, action, entity_type, entity_id, metadata)
     VALUES (gen_random_uuid(), $1, $2, $3, 'order.status_changed', 'table', $4, $5)`,
    [orders[0].tenant_id, req.params.storeId, req.user.id, req.params.tableNumber, JSON.stringify({ status: 'completed', order_ids: orderIds })]
  );

  res.json({ table_number: req.params.tableNumber, completed_order_ids: orderIds });
});

module.exports = router;
