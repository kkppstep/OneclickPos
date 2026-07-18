const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// POST /hubs/register — called once by a brand-new hub device, before
// it has any credentials at all. Gated by a short-lived provisioning
// code (issued via admin/stores/:id/provisioning-codes) instead of a
// hub API key, since the device doesn't have one yet.
//
// The generated api_key is returned in plaintext exactly once — only
// its SHA-256 hash is ever persisted. If it's lost, the device needs a
// fresh provisioning code and a new hub row, there's no recovery path.
router.post('/hubs/register', async (req, res) => {
  const { store_id, provisioning_code, device_name } = req.body;
  if (!store_id || !provisioning_code || !device_name) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const codeRow = await client.query(
      `SELECT id FROM provisioning_codes
       WHERE store_id = $1 AND code = $2 AND status = 'pending' AND expires_at > now()
       FOR UPDATE`,
      [store_id, provisioning_code]
    );
    if (codeRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(401).json({ error: 'invalid_or_expired_code' });
    }

    const storeRow = await client.query('SELECT tenant_id FROM stores WHERE id = $1', [store_id]);
    if (storeRow.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'store_not_found' });
    }

    const apiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyHash = hashApiKey(apiKey);

    const hubRow = await client.query(
      `INSERT INTO hubs (id, store_id, device_name, api_key_hash, status, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'offline', now())
       RETURNING id`,
      [store_id, device_name, apiKeyHash]
    );

    await client.query(
      `UPDATE provisioning_codes SET status = 'used', used_by_hub_id = $1 WHERE id = $2`,
      [hubRow.rows[0].id, codeRow.rows[0].id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      hub_id: hubRow.rows[0].id,
      tenant_id: storeRow.rows[0].tenant_id,
      store_id,
      api_key: apiKey,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[hubs] registration failed:', err.message);
    res.status(500).json({ error: 'registration_failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
