const express = require('express');
const config = require('./config');
require('./db'); // creates local schema on first boot if missing
const ordersRouter = require('./routes/orders');
const { loadStoreSettings } = require('./services/settings');
const { drain } = require('./services/syncQueue');
const { pullPendingOrders } = require('./services/pullDown');

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
  // up, and pull cloud-origin (customer self-order) orders down.
  const timeoutMs = settings.cloud_timeout_ms || config.cloud.timeoutMs;
  setInterval(() => {
    drain(timeoutMs).catch((err) => console.error('[sync] drain error:', err.message));
    pullPendingOrders(timeoutMs).catch((err) => console.error('[sync] pulldown error:', err.message));
  }, config.sync.drainIntervalMs);
}

start();
