const express = require('express');
const db = require('../db');

const router = express.Router();

// POST /public/stores/:storeId/orders — unauthenticated, customer-facing.
// The mirror of the hub-authenticated /orders route, but for orders
// placed straight from a customer's phone. Idempotent on id for the
// same reason as the hub route: a client-side retry after a lost
// response shouldn't create a duplicate order.
//
// origin is always 'cloud' here and delivered_to_hub_at starts NULL —
// the store's hub hasn't seen this order yet. It picks it up next time
// it's online, via the pull-down mechanism (not yet built).
router.post('/public/stores/:storeId/orders', async (req, res) => {
  const { storeId } = req.params;
  const {
    id, table_number, channel, status,
    subtotal, tax_total, discount_total, total,
    items = [], payments = [],
  } = req.body;

  if (!id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'invalid_order_payload' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const storeRow = await client.query('SELECT tenant_id FROM stores WHERE id = $1', [storeId]);
    if (storeRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'store_not_found' });
    }

    const existing = await client.query('SELECT id FROM orders WHERE id = $1', [id]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(200).json({ id, note: 'already_recorded' });
    }

    await client.query(
      `INSERT INTO orders
         (id, tenant_id, store_id, table_number, channel, status,
          subtotal, tax_total, discount_total, total, origin, sync_status)
       VALUES ($1,$2,$3,$4,'customer_qr',$5,$6,$7,$8,$9,'cloud','synced')`,
      [
        id, storeRow.rows[0].tenant_id, storeId, table_number || null,
        status || 'open', subtotal || 0, tax_total || 0, discount_total || 0, total || 0,
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
        `INSERT INTO payments (id, order_id, method, amount, status)
         VALUES (gen_random_uuid(), $1,$2,$3,$4)`,
        [id, payment.method, payment.amount, payment.status || 'pending']
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[public orders] insert failed:', err.message);
    res.status(500).json({ error: 'order_insert_failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
