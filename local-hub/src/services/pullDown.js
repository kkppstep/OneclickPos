const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { client } = require('./cloudClient');
const { printReceipt, printImageFromUrl } = require('./printer');

// Pulls customer-placed orders that landed in the cloud down to this
// hub, so they get printed and recorded locally even though this hub
// never created them. Runs on the same timer as the sync-queue drain
// (see index.js) — the mirror image of pushing local orders up.
async function pullPendingOrders(timeoutMs) {
  let pending;
  try {
    const res = await client(timeoutMs).get('/orders/pending');
    pending = res.data.orders;
  } catch (err) {
    return; // cloud unreachable this tick — retried automatically next cycle
  }

  for (const order of pending) {
    const alreadyHave = db.prepare('SELECT id FROM orders WHERE id = ?').get(order.id);
    if (!alreadyHave) {
      db.prepare(`
        INSERT INTO orders (id, store_id, terminal_id, customer_id, table_number, channel, status, subtotal, tax_total, discount_total, total, origin, sync_status, created_at, synced_at)
        VALUES (@id, @store_id, NULL, NULL, @table_number, @channel, @status, @subtotal, @tax_total, @discount_total, @total, 'cloud', 'synced', @created_at, @created_at)
      `).run({
        id: order.id,
        store_id: order.store_id,
        table_number: order.table_number,
        channel: order.channel,
        status: order.status,
        subtotal: order.subtotal,
        tax_total: order.tax_total,
        discount_total: order.discount_total,
        total: order.total,
        created_at: order.created_at,
      });

      const insertItem = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, product_name_snapshot, qty, unit_price, discount_amount, tax_amount, line_total, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of order.items) {
        insertItem.run(
          uuidv4(), order.id, item.product_id, item.product_name_snapshot,
          item.qty, item.unit_price, item.discount_amount || 0, item.tax_amount || 0, item.line_total,
          item.notes || null
        );
      }
    }

    try {
      await printReceipt(order, order.items);
    } catch (err) {
      console.error(`[pulldown] print failed for order ${order.id}:`, err.message);
      db.prepare(`INSERT INTO print_jobs (id, order_id, job_type, status, created_at) VALUES (?, ?, 'receipt', 'failed', datetime('now'))`)
        .run(uuidv4(), order.id);
      // Still acked below — re-pulling an order the printer keeps
      // rejecting just produces the same failure forever. A failed
      // print_jobs row is what lets staff notice instead.
    }

    try {
      await client(timeoutMs).post(`/orders/${order.id}/ack`);
    } catch (err) {
      console.error(`[pulldown] ack failed for order ${order.id}:`, err.message);
      // Not acked -> will be pulled and printed again next cycle. A
      // duplicate kitchen ticket is the safer failure mode here versus
      // silently losing the order.
    }
  }
}

// On-demand receipts (payment confirmation) — separate queue from the
// kitchen-ticket orders above, only ever has something in it right
// after staff tap "confirm payment" in admin-app. No local order/item
// data involved here, just an image to hand to the printer.
async function pullPendingPrintJobs(timeoutMs) {
  let printJobs;
  try {
    const res = await client(timeoutMs).get('/print-jobs/pending');
    printJobs = res.data.print_jobs;
  } catch (err) {
    return; // cloud unreachable this tick — retried automatically next cycle
  }

  for (const job of printJobs) {
    try {
      await printImageFromUrl(job.image_url);
      await client(timeoutMs).post(`/print-jobs/${job.id}/ack`, { success: true });
    } catch (err) {
      console.error(`[pulldown] receipt image print failed, job ${job.id}:`, err.message);
      await client(timeoutMs).post(`/print-jobs/${job.id}/ack`, { success: false, error: err.message }).catch(() => {});
    }
  }
}

module.exports = { pullPendingOrders, pullPendingPrintJobs };
