const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /stores/:id/settings — a hub calls this once at boot to learn its
// configured cloud_timeout_ms / retry_count / retry_backoff_ms (stored
// per-store since outage severity varies a lot by region).
router.get('/stores/:id/settings', async (req, res) => {
  if (req.params.id !== req.hub.store_id) {
    return res.status(403).json({ error: 'store_mismatch' });
  }

  const { rows } = await db.query(
    'SELECT cloud_timeout_ms, retry_count, retry_backoff_ms FROM stores WHERE id = $1',
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'store_not_found' });

  res.json(rows[0]);
});

module.exports = router;
