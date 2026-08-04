const fs = require('fs');
const path = require('path');
require('dotenv').config();

// scripts/register.js writes this file once, at first setup.
const CRED_PATH = path.join(__dirname, '..', 'hub-credentials.json');
const credentials = fs.existsSync(CRED_PATH) ? JSON.parse(fs.readFileSync(CRED_PATH, 'utf8')) : {};

module.exports = {
  hubId: credentials.hub_id || null,
  storeId: credentials.store_id || process.env.STORE_ID || null,
  tenantId: credentials.tenant_id || null,
  apiKey: credentials.api_key || null,

  cloud: {
    baseUrl: process.env.CLOUD_API_URL || 'http://localhost:3000',
    timeoutMs: Number(process.env.CLOUD_TIMEOUT_MS || 5000),
  },

  // How often to check for orders that need printing. No local queue
  // to drain here (unlike local-hub) — this is the only loop.
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 5000),
};
