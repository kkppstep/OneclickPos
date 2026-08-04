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

// GET /print-jobs/pending — hub-authenticated. On-demand receipt
// images requested by staff at checkout (see admin/print-jobs below),
// separate from /orders/pending's automatic kitchen-ticket flow —
// this queue only ever has something in it right after someone taps
// "confirm payment".
router.get('/print-jobs/pending', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, image_url FROM print_jobs WHERE store_id = $1 AND status = 'pending' ORDER BY created_at ASC LIMIT 20`,
    [req.hub.store_id]
  );
  res.json({ print_jobs: rows });
});

// POST /print-jobs/:id/ack — hub-authenticated. Body: { success: bool,
// error?: string }. Marked failed (not retried) on failure, same
// reasoning as orders/pending — a bad printer_ip failing forever
// isn't fixed by trying again next cycle.
router.post('/print-jobs/:id/ack', async (req, res) => {
  const status = req.body.success === false ? 'failed' : 'printed';
  const { rows } = await db.query(
    `UPDATE print_jobs SET status = $1, error_message = $2, printed_at = now()
     WHERE id = $3 AND store_id = $4 RETURNING id`,
    [status, req.body.error || null, req.params.id, req.hub.store_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'print_job_not_found' });
  res.json({ id: rows[0].id, status });
});

module.exports = router;
