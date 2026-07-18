const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const CRED_PATH = path.join(__dirname, '..', 'hub-credentials.json');

// Run once per device: node scripts/register.js <provisioning_code> [device_name]
// STORE_ID and CLOUD_API_URL come from .env. On success, writes the
// issued hub_id/api_key to hub-credentials.json, which config.js reads
// on every future boot — this script never needs to run again unless
// the device is re-provisioned.
async function main() {
  const storeId = process.env.STORE_ID;
  const provisioningCode = process.argv[2];
  const deviceName = process.argv[3] || os.hostname();
  const cloudUrl = process.env.CLOUD_API_URL || 'http://localhost:3000';

  if (!storeId || !provisioningCode) {
    console.error('Usage: STORE_ID=<uuid> node scripts/register.js <provisioning_code> [device_name]');
    process.exit(1);
  }

  if (fs.existsSync(CRED_PATH)) {
    console.error(`${CRED_PATH} already exists — delete it first if you really want to re-register this device.`);
    process.exit(1);
  }

  try {
    const res = await axios.post(`${cloudUrl}/hubs/register`, {
      store_id: storeId,
      provisioning_code: provisioningCode,
      device_name: deviceName,
    });

    const { hub_id, tenant_id, api_key } = res.data;
    fs.writeFileSync(CRED_PATH, JSON.stringify({ hub_id, tenant_id, store_id: storeId, api_key }, null, 2));

    console.log(`Registered as hub ${hub_id}.`);
    console.log(`Credentials saved to ${CRED_PATH} — this file is the device's only copy of its api_key.`);
  } catch (err) {
    console.error('Registration failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

main();
