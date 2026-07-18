const axios = require('axios');
const db = require('../db');
const config = require('../config');

function getCached(key) {
  const row = db.prepare('SELECT value FROM hub_settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}

function setCached(key, value) {
  db.prepare(`
    INSERT INTO hub_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value));
}

// Pulls this store's configured timeout/retry values from the cloud
// on startup (cloud_timeout_ms is per-store, see stores table).
// Three-tier fallback: fresh from cloud -> last cached value ->
// hardcoded env defaults. This runs once at boot, so a generous
// one-time timeout is fine here even though normal order traffic
// uses the much shorter per-store timeout.
async function loadStoreSettings() {
  const bootstrapTimeoutMs = 5000;
  try {
    const res = await axios.get(
      `${config.cloud.baseUrl}/stores/${config.storeId}/settings`,
      { headers: { Authorization: `Bearer ${config.apiKey}` }, timeout: bootstrapTimeoutMs }
    );
    setCached('store_settings', res.data);
    return res.data;
  } catch (err) {
    const cached = getCached('store_settings');
    if (cached) {
      console.warn('[settings] cloud unreachable at startup, using cached store settings');
      return cached;
    }
    console.warn('[settings] cloud unreachable and no cache, using env defaults');
    return {
      cloud_timeout_ms: config.cloud.timeoutMs,
      retry_count: config.cloud.retryCount,
      retry_backoff_ms: config.cloud.retryBackoffMs,
    };
  }
}

module.exports = { loadStoreSettings, getCached, setCached };
