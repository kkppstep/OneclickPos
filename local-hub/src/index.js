const express = require('express');
const config = require('./config');
require('./db'); // creates local schema on first boot if missing
const ordersRouter = require('./routes/orders');
const { loadStoreSettings } = require('./services/settings');
const { drain } = require('./services/syncQueue');
const { pullPendingOrders, pullPendingPrintJobs } = require('./services/pullDown');

async function start() {
  const settings = await loadStoreSettings();

  const app = express();
  app.use(express.json());
  app.use(ordersRouter);

  app.get('/health', (req, res) => res.json({ status: 'ok', hubId: config.hubId }));

  app.listen(config.server.port, () => {
    console.log(`[hub] listening on :${config.server.port}`);
  });

  // Two-way sync on the same timer: push local (fallback-path) orders
  // up, pull cloud-origin (customer self-order) orders down, and
  // refresh store settings (including printer config, so a change in
  // admin-app takes effect within one cycle instead of needing a
  // device restart).
  const timeoutMs = settings.cloud_timeout_ms || config.cloud.timeoutMs;
  setInterval(() => {
    drain(timeoutMs).catch((err) => console.error('[sync] drain error:', err.message));
    pullPendingOrders(timeoutMs).catch((err) => console.error('[sync] pulldown error:', err.message));
    pullPendingPrintJobs(timeoutMs).catch((err) => console.error('[sync] print-jobs error:', err.message));
    loadStoreSettings().catch((err) => console.error('[settings] refresh error:', err.message));
  }, config.sync.drainIntervalMs);
}

start();
