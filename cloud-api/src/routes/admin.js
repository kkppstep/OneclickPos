const express = require('express');
const db = require('../db');
const { authenticateUser } = require('../middleware/userAuth');
const { requireStoreRole, requireTenantRole } = require('../middleware/roles');
const { requireFeature } = require('../middleware/features');

const router = express.Router();

// Tenants are created exclusively via Google sign-in now (a first-time
// Google sign-in auto-creates one — see routes/googleAuth.js). No
// manual/key-gated tenant creation exists anymore.

// Lets a logged-in user fetch their own tenant's info.
router.get('/admin/tenants/me', authenticateUser, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM tenants WHERE id = $1', [req.user.tenant_id]);
  if (rows.length === 0) return res.status(404).json({ error: 'tenant_not_found' });
  res.json(rows[0]);
});

// PATCH /admin/tenants/me — an owner renaming their own business.
// Deliberately narrow: only business_name/contact_email/contact_phone.
// subscription_status, subscription_plan_id, and feature_overrides
// stay platform-admin-only (see /platform/tenants/:id) — an owner
// can't grant themselves features or reactivate a suspended account
// through this endpoint.
router.patch('/admin/tenants/me', authenticateUser, async (req, res) => {
  const { business_name, contact_email, contact_phone } = req.body;
  const { rows } = await db.query(
    `UPDATE tenants SET
       business_name = COALESCE($2, business_name),
       contact_email = COALESCE($3, contact_email),
       contact_phone = COALESCE($4, contact_phone),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.user.tenant_id, business_name || null, contact_email || null, contact_phone || null]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'tenant_not_found' });
  res.json(rows[0]);
});

// ---------- Stores ----------
// Creating a store just requires being logged in; the creator becomes
// its 'owner' in store_users automatically.
router.post('/admin/stores', authenticateUser, async (req, res) => {
  const { name, address, township, region_state, logo_url, kbzpay_qr_url, ambient_audio_url, ambient_audio_enabled, theme_config } = req.body;
  if (!name) return res.status(400).json({ error: 'name_required' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const storeRes = await client.query(
      `INSERT INTO stores (id, tenant_id, name, address, township, region_state, logo_url, kbzpay_qr_url, ambient_audio_url, ambient_audio_enabled, theme_config)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, '{"preset":"green"}'::jsonb)) RETURNING *`,
      [
        req.user.tenant_id, name, address || null, township || null, region_state || null, logo_url || null,
        kbzpay_qr_url || null, ambient_audio_url || null, ambient_audio_enabled || false,
        theme_config ? JSON.stringify(theme_config) : null,
      ]
    );
    await client.query(
      `INSERT INTO store_users (id, user_id, store_id, role) VALUES (gen_random_uuid(), $1, $2, 'owner')`,
      [req.user.id, storeRes.rows[0].id]
    );
    await client.query('COMMIT');
    res.status(201).json(storeRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[admin] store create failed:', err.message);
    res.status(500).json({ error: 'store_create_failed' });
  } finally {
    client.release();
  }
});

// PATCH /admin/stores/:storeId — owner/manager. Covers the settings
// most likely to change after initial setup (logo, payment QR,
// ambient audio, menu theme, printer) without needing a full
// store-recreation flow.
router.patch('/admin/stores/:storeId', authenticateUser, requireStoreRole(['owner', 'manager']), async (req, res) => {
  const {
    name, logo_url, kbzpay_qr_url, ambient_audio_url, ambient_audio_enabled, theme_config,
    printer_enabled, printer_ip, printer_port, printer_model, printer_has_cash_drawer,
  } = req.body;
  const { rows } = await db.query(
    `UPDATE stores SET
       name = COALESCE($2, name),
       logo_url = COALESCE($3, logo_url),
       kbzpay_qr_url = COALESCE($4, kbzpay_qr_url),
       ambient_audio_url = COALESCE($5, ambient_audio_url),
       ambient_audio_enabled = COALESCE($6, ambient_audio_enabled),
       theme_config = COALESCE($7, theme_config),
       printer_enabled = COALESCE($8, printer_enabled),
       printer_ip = COALESCE($9, printer_ip),
       printer_port = COALESCE($10, printer_port),
       printer_model = COALESCE($11, printer_model),
       printer_has_cash_drawer = COALESCE($12, printer_has_cash_drawer),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [
      req.params.storeId, name, logo_url, kbzpay_qr_url, ambient_audio_url, ambient_audio_enabled,
      theme_config ? JSON.stringify(theme_config) : null,
      printer_enabled, printer_ip || null, printer_port || null, printer_model || null, printer_has_cash_drawer,
    ]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'store_not_found' });
  res.json(rows[0]);
});

// Only stores this user actually has a role at, not the whole tenant —
// relevant once a tenant has staff who only work certain locations.
router.get('/admin/stores', authenticateUser, async (req, res) => {
  const { rows } = await db.query(
    `SELECT s.*, su.role AS my_role FROM stores s
     JOIN store_users su ON su.store_id = s.id
     WHERE s.tenant_id = $1 AND su.user_id = $2
     ORDER BY s.created_at DESC`,
    [req.user.tenant_id, req.user.id]
  );
  res.json({ stores: rows });
});

// ---------- Categories ----------
router.post('/admin/categories', authenticateUser, requireTenantRole(['owner', 'manager']), async (req, res) => {
  const { name, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'name_required' });
  const { rows } = await db.query(
    `INSERT INTO categories (id, tenant_id, name, sort_order) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *`,
    [req.user.tenant_id, name, sort_order || 0]
  );
  res.status(201).json(rows[0]);
});

router.get('/admin/categories', authenticateUser, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM categories WHERE tenant_id = $1 ORDER BY sort_order, name',
    [req.user.tenant_id]
  );
  res.json({ categories: rows });
});

router.patch('/admin/categories/:id', authenticateUser, requireTenantRole(['owner', 'manager']), async (req, res) => {
  const { name, sort_order } = req.body;
  const { rows } = await db.query(
    `UPDATE categories SET
       name = COALESCE($3, name),
       sort_order = COALESCE($4, sort_order)
     WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [req.params.id, req.user.tenant_id, name || null, sort_order === undefined ? null : sort_order]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'category_not_found' });
  res.json(rows[0]);
});

// Safe to hard-delete unconditionally — products.category_id is
// ON DELETE SET NULL, so any products in this category just become
// uncategorized rather than blocking the delete.
router.delete('/admin/categories/:id', authenticateUser, requireTenantRole(['owner', 'manager']), async (req, res) => {
  const { rows } = await db.query(
    'DELETE FROM categories WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [req.params.id, req.user.tenant_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'category_not_found' });
  res.json({ id: req.params.id, deleted: true });
});

// ---------- Products ----------
router.post('/admin/products', authenticateUser, requireTenantRole(['owner', 'manager']), async (req, res) => {
  const { category_id, name, description, image_url, price, cost, sku, barcode } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'name_and_price_required' });
  const { rows } = await db.query(
    `INSERT INTO products (id, tenant_id, category_id, name, description, image_url, sku, barcode, price, cost, is_active)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING *`,
    [req.user.tenant_id, category_id || null, name, description || null, image_url || null, sku || null, barcode || null, price, cost || null]
  );
  res.status(201).json(rows[0]);
});

// Plain tenant-wide list. Pass ?store_id= to also get each product's
// availability at that specific store (a product can be marked out of
// stock at one branch and still available at another).
router.get('/admin/products', authenticateUser, async (req, res) => {
  const { store_id } = req.query;
  const { rows } = store_id
    ? await db.query(
        `SELECT p.*, COALESCE(i.is_available, true) AS is_available
         FROM products p
         LEFT JOIN inventory i ON i.product_id = p.id AND i.store_id = $2
         WHERE p.tenant_id = $1 ORDER BY p.name`,
        [req.user.tenant_id, store_id]
      )
    : await db.query('SELECT * FROM products WHERE tenant_id = $1 ORDER BY name', [req.user.tenant_id]);
  res.json({ products: rows });
});

// PATCH /admin/stores/:storeId/products/:productId/availability —
// owner/manager. Upserts into inventory since a row may not exist yet
// (missing row means "available" by default).
router.patch(
  '/admin/stores/:storeId/products/:productId/availability',
  authenticateUser,
  requireStoreRole(['owner', 'manager']),
  async (req, res) => {
    const { is_available } = req.body;
    if (typeof is_available !== 'boolean') return res.status(400).json({ error: 'is_available_boolean_required' });

    await db.query(
      `INSERT INTO inventory (id, product_id, store_id, is_available, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, now())
       ON CONFLICT (product_id, store_id) DO UPDATE SET is_available = excluded.is_available, updated_at = now()`,
      [req.params.productId, req.params.storeId, is_available]
    );
    res.json({ product_id: req.params.productId, store_id: req.params.storeId, is_available });
  }
);

router.patch('/admin/products/:id', authenticateUser, requireTenantRole(['owner', 'manager']), async (req, res) => {
  const { name, description, image_url, sku, barcode, price, cost, is_active, category_id } = req.body;
  const { rows } = await db.query(
    `UPDATE products SET
       name = COALESCE($3, name),
       description = COALESCE($4, description),
       image_url = COALESCE($5, image_url),
       sku = COALESCE($6, sku),
       barcode = COALESCE($7, barcode),
       price = COALESCE($8, price),
       cost = COALESCE($9, cost),
       is_active = COALESCE($10, is_active),
       category_id = COALESCE($11, category_id),
       updated_at = now()
     WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [req.params.id, req.user.tenant_id, name, description, image_url, sku, barcode, price, cost, is_active, category_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'product_not_found' });
  res.json(rows[0]);
});

// A product that's never been ordered deletes cleanly. One that has
// order history can't — order_items.product_id has no ON DELETE
// clause (RESTRICT), on purpose, so a sale never loses its record of
// what was actually sold. Rather than surface that as a confusing
// foreign-key error, catch it (Postgres 23503) and deactivate instead
// — same end result the owner wants (gone from the menu), without
// touching order history.
router.delete('/admin/products/:id', authenticateUser, requireTenantRole(['owner', 'manager']), async (req, res) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.id, req.user.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'product_not_found' });
    res.json({ id: req.params.id, deleted: true });
  } catch (err) {
    if (err.code === '23503') {
      const { rows } = await db.query(
        `UPDATE products SET is_active = false, updated_at = now() WHERE id = $1 AND tenant_id = $2 RETURNING id`,
        [req.params.id, req.user.tenant_id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'product_not_found' });
      return res.json({ id: req.params.id, deleted: false, deactivated: true });
    }
    console.error('[admin] product delete failed:', err.message);
    res.status(500).json({ error: 'product_delete_failed' });
  }
});

// ---------- Orders ----------
// Plain list (history) -- used by the Orders tab.
router.get('/admin/orders', authenticateUser, requireStoreRole(['owner', 'manager']), async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, table_number, channel, status, total, sync_status, created_at
     FROM orders WHERE store_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.query.store_id]
  );
  res.json({ orders: rows });
});

// Live view -- open orders only, with items/notes/payment status
// included, for the kitchen/staff order screen. Any assigned role can
// view (not just owner/manager), since kitchen staff need this too.
router.get('/admin/stores/:storeId/live-orders', authenticateUser, requireFeature('live_orders'), requireStoreRole(['owner', 'manager', 'cashier', 'kitchen_staff']), async (req, res) => {
  const ordersRes = await db.query(
    `SELECT id, table_number, channel, status, total, prepared_at, created_at
     FROM orders WHERE store_id = $1 AND status = 'open' ORDER BY created_at ASC`,
    [req.params.storeId]
  );

  const orders = [];
  for (const order of ordersRes.rows) {
    const itemsRes = await db.query(
      'SELECT product_name_snapshot, qty, unit_price, line_total, notes FROM order_items WHERE order_id = $1',
      [order.id]
    );
    const paymentsRes = await db.query(
      'SELECT method, status FROM payments WHERE order_id = $1',
      [order.id]
    );
    orders.push({ ...order, items: itemsRes.rows, payments: paymentsRes.rows });
  }

  res.json({ orders });
});

// POST /admin/stores/:storeId/print-jobs — any assigned role. Body:
// { image_url }. image_url should already exist (upload the receipt
// PNG via POST /admin/uploads first) — this just queues it for
// whichever hub or print-bridge is running for the store to pick up
// on its next poll.
router.post('/admin/stores/:storeId/print-jobs', authenticateUser, requireStoreRole(['owner', 'manager', 'cashier', 'kitchen_staff']), async (req, res) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: 'image_url_required' });

  const { rows } = await db.query(
    `INSERT INTO print_jobs (id, store_id, image_url) VALUES (gen_random_uuid(), $1, $2) RETURNING *`,
    [req.params.storeId, image_url]
  );
  res.status(201).json(rows[0]);
});

module.exports = router;
