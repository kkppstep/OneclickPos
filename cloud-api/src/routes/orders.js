const express = require('express');
const db = require('../db');
const { notifyStore } = require('../services/push');

const router = express.Router();

// POST /orders — a hub may retry the same order if its earlier attempt
// timed out locally even though the cloud actually received and saved
// it. A conflict on id is treated as "already recorded", not an error,
// so retries are always safe to send.
router.post('/orders', async (req, res) => {
  const {
    id, store_id, terminal_id, customer_id, status,
    subtotal, tax_total, discount_total, total, origin,
    items = [], payments = [],
  } = req.body;

  if (!id || !store_id || !Array.isArray(items)) {
    return res.status(400).json({ error: 'invalid_order_payload' });
  }
  if (store_id !== req.hub.store_id) {
    return res.status(403).json({ error: 'store_mismatch' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM orders WHERE id = $1', [id]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({ id, sync_status: 'synced', note: 'already_recorded' });
    }

    await client.query(
      `INSERT INTO orders
         (id, tenant_id, store_id, hub_id, terminal_id, customer_id, table_number, channel, status,
          subtotal, tax_total, discount_total, total, origin, sync_status, synced_at, delivered_to_hub_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'synced', now(), now())`,
      [
        id, req.hub.tenant_id, store_id, req.hub.id, terminal_id || null, customer_id || null,
        req.body.table_number || null, req.body.channel || 'staff_terminal',
        status || 'completed', subtotal || 0, tax_total || 0, discount_total || 0, total || 0,
        origin || 'hub',
      ]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items
           (id, order_id, product_id, product_name_snapshot, qty, unit_price, discount_amount, tax_amount, line_total, notes)
         VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          id, item.product_id, item.product_name_snapshot, item.qty, item.unit_price,
          item.discount_amount || 0, item.tax_amount || 0, item.line_total, item.notes || null,
        ]
      );
    }

    for (const payment of payments) {
      await client.query(
        `INSERT INTO payments
           (id, order_id, method, amount, status, external_ref, confirmed_by, confirmed_at)
         VALUES (gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7)`,
        [
          id, payment.method, payment.amount, payment.status || 'pending',
          payment.external_ref || null, payment.confirmed_by || null, payment.confirmed_at || null,
        ]
      );
    }

    await client.query('COMMIT');

    // Terminal orders default to 'completed' (already rung up at the
    // counter) so this rarely fires — but if a hub ever sends one
    // through as 'open', it belongs on the Home tab's live list just
    // like a customer_qr order does, so it gets the same alert.
    if ((status || 'completed') === 'open') {
      await notifyStore(store_id, ['owner', 'manager', 'cashier', 'kitchen_staff'], {
        title: 'New order',
        body: req.body.table_number ? `Table ${req.body.table_number} just placed an order` : 'A new order just came in',
        data: { type: 'new_order', order_id: id, store_id: store_id },
      });
    }

    res.status(201).json({ id, sync_status: 'synced' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[orders] insert failed:', err.message);
    res.status(500).json({ error: 'order_insert_failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
