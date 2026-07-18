const fs = require('fs');
const path = require('path');
require('dotenv').config();

// scripts/register.js writes this file once, at first setup. It takes
// priority over .env so a device doesn't need its credentials hand-
// copied into .env after registering.
const CRED_PATH = path.join(__dirname, '..', 'hub-credentials.json');
const credentials = fs.existsSync(CRED_PATH)
  ? JSON.parse(fs.readFileSync(CRED_PATH, 'utf8'))
  : {};

module.exports = {
  hubId: credentials.hub_id || process.env.HUB_ID || null,
  storeId: credentials.store_id || process.env.STORE_ID || null,
  tenantId: credentials.tenant_id || process.env.TENANT_ID || null,
  apiKey: credentials.api_key || process.env.HUB_API_KEY || null,

  cloud: {
    baseUrl: process.env.CLOUD_API_URL || 'http://localhost:3000',
    timeoutMs: Number(process.env.CLOUD_TIMEOUT_MS || 3000),
    retryCount: Number(process.env.RETRY_COUNT || 2),
    retryBackoffMs: Number(process.env.RETRY_BACKOFF_MS || 1000),
  },

  sync: {
    drainIntervalMs: Number(process.env.SYNC_DRAIN_INTERVAL_MS || 15000),
  },

  server: {
    port: Number(process.env.HUB_PORT || 4000),
  },

  printer: {
    type: process.env.PRINTER_TYPE || 'epson',
    target: process.env.PRINTER_TARGET || '',
    hasCashDrawer: process.env.PRINTER_HAS_CASH_DRAWER === 'true',
  },
};
