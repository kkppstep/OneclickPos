const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /orders/pending — hub-authenticated. Returns customer-placed
// orders that landed in the cloud and haven't been picked up by this
// store's hub yet. Called on the hub's existing sync timer whenever
// it's online — the mirror of the queue-drain that pushes local
// orders up to the cloud.
router.get('/orders/pending', async (req, res) => {
  const ordersRes = await db.query(
    `SELECT * FROM orders
     WHERE store_id = $1 AND origin = 'cloud' AND delivered_to_hub_at IS NULL
     ORDER BY created_at ASC LIMIT 20`,
    [req.hub.store_id]
  );

  const orders = [];
  for (const order of ordersRes.rows) {
    const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    const paymentsRes = await db.query('SELECT * FROM payments WHERE order_id = $1', [order.id]);
    orders.push({ ...order, items: itemsRes.rows, payments: paymentsRes.rows });
  }

  res.json({ orders });
});

// POST /orders/:id/ack — hub-authenticated. Marks a pulled-down order
// as delivered so it isn't handed out again on the next poll. Only
// called after the hub has successfully saved and printed it.
router.post('/orders/:id/ack', async (req, res) => {
  const { rows } = await db.query(
    `UPDATE orders SET delivered_to_hub_at = now()
     WHERE id = $1 AND store_id = $2
     RETURNING id`,
    [req.params.id, req.hub.store_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'order_not_found' });
  res.json({ id: rows[0].id, delivered: true });
});

module.exports = router;
