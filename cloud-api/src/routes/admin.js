const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticatePlatform } = require('../middleware/platformAuth');
const { authenticateUser } = require('../middleware/userAuth');
const { requireStoreRole, requireTenantRole } = require('../middleware/roles');

const router = express.Router();

// ---------- Tenant bootstrap ----------
// Platform-gated, one-time: creates a brand-new tenant AND its first
// owner user in the same transaction, since there's no logged-in user
// yet to attach the tenant to.
router.post('/admin/tenants', authenticatePlatform, async (req, res) => {
  const { business_name, contact_email, contact_phone, owner_name, owner_email, owner_password } = req.body;
  if (!business_name || !owner_name || !owner_email || !owner_password) {
    return res.status(400).json({ error: 'business_name_owner_name_owner_email_owner_password_required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const tenantRes = await client.query(
      `INSERT INTO tenants (id, business_name, contact_email, contact_phone)
       VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *`,
      [business_name, contact_email || null, contact_phone || null]
    );
    const tenant = tenantRes.rows[0];

    const passwordHash = await bcrypt.hash(owner_password, 10);
    const userRes = await client.query(
      `INSERT INTO users (id, tenant_id, name, email, password_hash)
       VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id, name, email`,
      [tenant.id, owner_name, owner_email, passwordHash]
    );

    await client.query('COMMIT');
    res.status(201).json({ tenant, owner: userRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'owner_email_already_used' });
    console.error('[admin] tenant bootstrap failed:', err.message);
    res.status(500).json({ error: 'tenant_bootstrap_failed' });
  } finally {
    client.release();
  }
});

// Lets a logged-in user fetch their own tenant's info.
router.get('/admin/tenants/me', authenticateUser, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM tenants WHERE id = $1', [req.user.tenant_id]);
  if (rows.length === 0) return res.status(404).json({ error: 'tenant_not_found' });
  res.json(rows[0]);
});

// ---------- Stores ----------
// Creating a store just requires being logged in; the creator becomes
// its 'owner' in store_users automatically.
router.post('/admin/stores', authenticateUser, async (req, res) => {
  const { name, address, township, region_state, kbzpay_qr_url, ambient_audio_url, ambient_audio_enabled } = req.body;
  if (!name) return res.status(400).json({ error: 'name_required' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const storeRes = await client.query(
      `INSERT INTO stores (id, tenant_id, name, address, township, region_state, kbzpay_qr_url, ambient_audio_url, ambient_audio_enabled)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.user.tenant_id, name, address || null, township || null, region_state || null,
        kbzpay_qr_url || null, ambient_audio_url || null, ambient_audio_enabled || false,
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

// PATCH /admin/stores/:id — owner/manager. First edit endpoint for an
// existing store; covers the settings most likely to change after
// initial setup (payment QR, ambient audio) without needing a full
// store-recreation flow.
router.patch('/admin/stores/:storeId', authenticateUser, requireStoreRole(['owner', 'manager']), async (req, res) => {
  const { name, kbzpay_qr_url, ambient_audio_url, ambient_audio_enabled } = req.body;
  const { rows } = await db.query(
    `UPDATE stores SET
       name = COALESCE($2, name),
       kbzpay_qr_url = COALESCE($3, kbzpay_qr_url),
       ambient_audio_url = COALESCE($4, ambient_audio_url),
       ambient_audio_enabled = COALESCE($5, ambient_audio_enabled),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.storeId, name, kbzpay_qr_url, ambient_audio_url, ambient_audio_enabled]
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

router.get('/admin/products', authenticateUser, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM products WHERE tenant_id = $1 ORDER BY name', [req.user.tenant_id]);
  res.json({ products: rows });
});

router.patch('/admin/products/:id', authenticateUser, requireTenantRole(['owner', 'manager']), async (req, res) => {
  const { name, price, is_active, category_id } = req.body;
  const { rows } = await db.query(
    `UPDATE products SET
       name = COALESCE($3, name),
       price = COALESCE($4, price),
       is_active = COALESCE($5, is_active),
       category_id = COALESCE($6, category_id),
       updated_at = now()
     WHERE id = $1 AND tenant_id = $2 RETURNING *`,
    [req.params.id, req.user.tenant_id, name, price, is_active, category_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'product_not_found' });
  res.json(rows[0]);
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
router.get('/admin/stores/:storeId/live-orders', authenticateUser, requireStoreRole(['owner', 'manager', 'cashier', 'kitchen_staff']), async (req, res) => {
  const ordersRes = await db.query(
    `SELECT id, table_number, channel, status, total, created_at
     FROM orders WHERE store_id = $1 AND status = 'open' ORDER BY created_at ASC`,
    [req.params.storeId]
  );

  const orders = [];
  for (const order of ordersRes.rows) {
    const itemsRes = await db.query(
      'SELECT product_name_snapshot, qty, notes FROM order_items WHERE order_id = $1',
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

module.exports = router;
