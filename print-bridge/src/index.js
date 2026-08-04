const config = require('./config');
const { client } = require('./cloudClient');
const { printReceipt, printImageFromUrl } = require('./printer');

if (!config.apiKey || !config.storeId) {
  console.error('Not registered yet. Run: STORE_ID=<uuid> node scripts/register.js <provisioning_code>');
  process.exit(1);
}

async function pollOnce() {
  let printerSettings;
  try {
    const res = await client().get(`/stores/${config.storeId}/settings`);
    printerSettings = res.data;
  } catch (err) {
    console.error('[print-bridge] could not fetch printer settings (cloud unreachable this cycle):', err.message);
    return; // retried automatically next cycle
  }

  if (!printerSettings.printer_enabled) {
    return; // owner hasn't turned printing on in admin-app yet — quietly wait
  }

  let pending;
  try {
    const res = await client().get('/orders/pending');
    pending = res.data.orders;
  } catch (err) {
    console.error('[print-bridge] could not fetch pending orders:', err.message);
    return;
  }

  for (const order of pending) {
    try {
      await printReceipt(order, order.items, printerSettings);
      console.log(`[print-bridge] printed order ${order.id}${order.table_number ? ` (table ${order.table_number})` : ''}`);
    } catch (err) {
      // Acked below regardless — an order the printer keeps rejecting
      // (wrong IP, powered off, out of paper) would otherwise be
      // re-pulled and re-fail every cycle forever. Loud local log is
      // the only failure surface right now; piping this back to
      // admin-app as a visible alert would be a good next step.
      console.error(`[print-bridge] FAILED to print order ${order.id}: ${err.message} — check printer_ip/printer_port in admin-app and that the printer is powered on and on the same network.`);
    }

    try {
      await client().post(`/orders/${order.id}/ack`);
    } catch (err) {
      console.error(`[print-bridge] ack failed for order ${order.id}, will retry next cycle:`, err.message);
    }
  }

  // On-demand receipts (payment confirmation) — separate queue from
  // the kitchen-ticket orders above, only ever has something in it
  // right after staff tap "confirm payment" in admin-app.
  let printJobs;
  try {
    const res = await client().get('/print-jobs/pending');
    printJobs = res.data.print_jobs;
  } catch (err) {
    console.error('[print-bridge] could not fetch pending print jobs:', err.message);
    return;
  }

  for (const job of printJobs) {
    try {
      await printImageFromUrl(job.image_url, printerSettings);
      console.log(`[print-bridge] printed receipt image, job ${job.id}`);
      await client().post(`/print-jobs/${job.id}/ack`, { success: true });
    } catch (err) {
      console.error(`[print-bridge] FAILED to print receipt image, job ${job.id}: ${err.message}`);
      await client().post(`/print-jobs/${job.id}/ack`, { success: false, error: err.message }).catch(() => {});
    }
  }
}

console.log(`[print-bridge] starting, polling every ${config.pollIntervalMs}ms against ${config.cloud.baseUrl}`);
pollOnce();
setInterval(pollOnce, config.pollIntervalMs);
