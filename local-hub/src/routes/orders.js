const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { trySubmitOrder } = require('../services/cloudClient');
const { enqueue } = require('../services/syncQueue');
const { printReceipt } = require('../services/printer');
const { getCached } = require('../services/settings');
const config = require('../config');

const router = express.Router();

function saveOrderLocally(order, items, origin, syncStatus) {
  db.prepare(`
    INSERT INTO orders (id, store_id, terminal_id, customer_id, table_number, channel, status, subtotal, tax_total, discount_total, total, origin, sync_status, created_at, synced_at)
    VALUES (@id, @store_id, @terminal_id, @customer_id, @table_number, @channel, @status, @subtotal, @tax_total, @discount_total, @total, @origin, @sync_status, @created_at, @synced_at)
  `).run({
    ...order,
    terminal_id: order.terminal_id || null,
    customer_id: order.customer_id || null,
    table_number: order.table_number || null,
    // Defaults to 'staff_terminal' so the existing terminal app keeps
    // working unchanged — it never has to send this field.
    channel: order.channel || 'staff_terminal',
    origin,
    sync_status: syncStatus,
    created_at: new Date().toISOString(),
    synced_at: syncStatus === 'synced' ? new Date().toISOString() : null,
  });

  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, product_name_snapshot, qty, unit_price, discount_amount, tax_amount, line_total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const item of items) {
    insertItem.run(
      uuidv4(), order.id, item.product_id, item.product_name_snapshot,
      item.qty, item.unit_price, item.discount_amount || 0, item.tax_amount || 0, item.line_total,
      item.notes || null
    );
  }
}

// POST /orders — the terminal app always calls the hub, never the
// cloud directly. The hub is what decides, per request, whether the
// cloud path or the local fallback path handles it.
router.post('/orders', async (req, res) => {
  const { items, ...orderFields } = req.body;
  const order = { id: orderFields.id || uuidv4(), ...orderFields };

  const settings = getCached('store_settings') || {};
  const timeoutMs = settings.cloud_timeout_ms || config.cloud.timeoutMs;

  const cloudResult = await trySubmitOrder({ ...order, items }, timeoutMs);

  if (cloudResult.ok) {
    saveOrderLocally(order, items, 'cloud', 'synced');
  } else {
    saveOrderLocally(order, items, 'hub', 'pending');
    enqueue('order', order.id, 'create', { ...order, items });
  }

  // Printing happens locally either way — this is not gated on
  // which path the order data took.
  try {
    await printReceipt(order, items);
  } catch (err) {
    console.error(`[print] failed for order ${order.id}:`, err.message);
    db.prepare(`
      INSERT INTO print_jobs (id, order_id, job_type, status, created_at)
      VALUES (?, ?, 'receipt', 'failed', datetime('now'))
    `).run(uuidv4(), order.id);
  }

  res.status(201).json({
    id: order.id,
    sync_status: cloudResult.ok ? 'synced' : 'pending',
  });
});

module.exports = router;
