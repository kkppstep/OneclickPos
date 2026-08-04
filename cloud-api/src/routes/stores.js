const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /stores/:id/settings — a hub calls this once at boot (and
// print-bridge on every poll cycle, since it has no other config
// source) to learn its configured cloud_timeout_ms / retry_count /
// retry_backoff_ms plus printer connection details — the latter set
// from admin-app's Hub setup tab rather than a local .env, so a
// shop owner can change the printer's IP without touching the device.
router.get('/stores/:id/settings', async (req, res) => {
  if (req.params.id !== req.hub.store_id) {
    return res.status(403).json({ error: 'store_mismatch' });
  }

  const { rows } = await db.query(
    `SELECT cloud_timeout_ms, retry_count, retry_backoff_ms,
            printer_enabled, printer_ip, printer_port, printer_model, printer_has_cash_drawer
     FROM stores WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'store_not_found' });

  res.json(rows[0]);
});

module.exports = router;
