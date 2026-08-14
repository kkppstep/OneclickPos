const express = require('express');
const db = require('../db');
const { authenticateUser } = require('../middleware/userAuth');
const { requireStoreRole } = require('../middleware/roles');
const router = express.Router();

const REQUEST_TYPES = new Set(['bill', 'staff']);

// Customer QR/table endpoint. A table can have only one active request
// of each type; the partial unique index makes this race-safe.
router.post('/public/stores/:storeId/service-requests', async (req, res) => {
  const { storeId } = req.params;
  const tableNumber = String(req.body.table_number || '').trim();
  const requestType = String(req.body.request_type || '').trim();
  if (!tableNumber || tableNumber.length > 32) return res.status(400).json({ error: 'valid_table_number_required' });
  if (!REQUEST_TYPES.has(requestType)) return res.status(400).json({ error: 'invalid_request_type' });

  try {
    const store = await db.query('SELECT id FROM stores WHERE id = $1', [storeId]);
    if (store.rows.length === 0) return res.status(404).json({ error: 'store_not_found' });
    const existing = await db.query(
      `SELECT id, status, created_at FROM service_requests
       WHERE store_id = $1 AND table_number = $2 AND request_type = $3
         AND status IN ('new', 'acknowledged')
       ORDER BY created_at DESC LIMIT 1`,
      [storeId, tableNumber, requestType]
    );
    if (existing.rows[0]) return res.status(200).json({ request: existing.rows[0], already_active: true });
    const { rows } = await db.query(
      `INSERT INTO service_requests (store_id, table_number, request_type)
       VALUES ($1, $2, $3)
       RETURNING id, store_id, table_number, request_type, status, created_at`,
      [storeId, tableNumber, requestType]
    );
    res.status(201).json({ request: rows[0] });
  } catch (err) {
    // A concurrent duplicate is safe to treat as already active.
    if (err.code === '23505') return res.status(200).json({ already_active: true });
    console.error('[service-requests] public create failed:', err.message);
    res.status(500).json({ error: 'service_request_failed' });
  }
});

// Admin live queue. Owners, managers and cashiers can handle requests.
router.get('/admin/stores/:storeId/service-requests', authenticateUser, requireStoreRole(['owner', 'manager', 'cashier']), async (req, res) => {
  const { rows } = await db.query(
    `SELECT sr.id, sr.store_id, sr.table_number, sr.request_type, sr.status,
            sr.created_at, sr.acknowledged_at, sr.resolved_at,
            au.name AS acknowledged_by_name, ru.name AS resolved_by_name
     FROM service_requests sr
     LEFT JOIN users au ON au.id = sr.acknowledged_by
     LEFT JOIN users ru ON ru.id = sr.resolved_by
     WHERE sr.store_id = $1 AND sr.status IN ('new', 'acknowledged')
     ORDER BY sr.created_at ASC`,
    [req.params.storeId]
  );
  res.json({ requests: rows });
});

router.post('/admin/service-requests/:id/acknowledge', authenticateUser, async (req, res) => {
  const found = await db.query('SELECT store_id, tenant_id FROM service_requests sr JOIN stores s ON s.id = sr.store_id WHERE sr.id = $1', [req.params.id]);
  const row = found.rows[0];
  if (!row || row.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'request_not_found' });
  const role = await db.query('SELECT role FROM store_users WHERE user_id = $1 AND store_id = $2', [req.user.id, row.store_id]);
  if (!['owner', 'manager', 'cashier'].includes(role.rows[0]?.role)) return res.status(403).json({ error: 'insufficient_role' });
  const updated = await db.query(
    `UPDATE service_requests SET status = 'acknowledged', acknowledged_at = now(), acknowledged_by = $1
     WHERE id = $2 AND status = 'new' RETURNING *`,
    [req.user.id, req.params.id]
  );
  res.json({ request: updated.rows[0] || { id: req.params.id, status: 'acknowledged' } });
});

router.post('/admin/service-requests/:id/resolve', authenticateUser, async (req, res) => {
  const found = await db.query('SELECT store_id, tenant_id FROM service_requests sr JOIN stores s ON s.id = sr.store_id WHERE sr.id = $1', [req.params.id]);
  const row = found.rows[0];
  if (!row || row.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'request_not_found' });
  const role = await db.query('SELECT role FROM store_users WHERE user_id = $1 AND store_id = $2', [req.user.id, row.store_id]);
  if (!['owner', 'manager', 'cashier'].includes(role.rows[0]?.role)) return res.status(403).json({ error: 'insufficient_role' });
  const updated = await db.query(
    `UPDATE service_requests SET status = 'resolved', resolved_at = now(), resolved_by = $1
     WHERE id = $2 AND status IN ('new', 'acknowledged') RETURNING *`,
    [req.user.id, req.params.id]
  );
  res.json({ request: updated.rows[0] || { id: req.params.id, status: 'resolved' } });
});

module.exports = router;
