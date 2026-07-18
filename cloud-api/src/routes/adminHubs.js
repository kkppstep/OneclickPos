const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function generateCode(length = 8) {
  return crypto.randomBytes(length).toString('base64url').replace(/[^A-Z0-9]/gi, '').slice(0, length).toUpperCase();
}

// POST /admin/stores/:storeId/provisioning-codes — an admin (store
// owner/manager) calls this from the dashboard when physically setting
// up a new hub device. The returned code is short-lived and single-use,
// safe to read aloud or type in during setup.
router.post('/admin/stores/:storeId/provisioning-codes', async (req, res) => {
  const { storeId } = req.params;
  const expiresInMinutes = Number(req.body.expires_in_minutes || 30);

  const store = await db.query('SELECT id FROM stores WHERE id = $1', [storeId]);
  if (store.rows.length === 0) return res.status(404).json({ error: 'store_not_found' });

  const code = generateCode();
  const { rows } = await db.query(
    `INSERT INTO provisioning_codes (id, store_id, code, status, expires_at, created_at)
     VALUES (gen_random_uuid(), $1, $2, 'pending', now() + ($3 || ' minutes')::interval, now())
     RETURNING code, expires_at`,
    [storeId, code, String(expiresInMinutes)]
  );

  res.status(201).json(rows[0]);
});

module.exports = router;
