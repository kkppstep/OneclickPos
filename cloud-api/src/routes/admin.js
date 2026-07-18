const express = require('express');
const db = require('../db');

const router = express.Router();

// ---------- Tenants ----------
router.post('/admin/tenants', async (req, res) => {
  const { business_name, contact_email, contact_phone } = req.body;
  if (!business_name) return res.status(400).json({ error: 'business_name_required' });
  const { rows } = await db.query(
    `INSERT INTO tenants (id, business_name, contact_email, contact_phone)
     VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *`,
    [business_name, contact_email || null, contact_phone || null]
  );
  res.status(201).json(rows[0]);
});

router.get('/admin/tenants', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM tenants ORDER BY created_at DESC');
  res.json({ tenants: rows });
});

// ---------- Stores ----------
router.post('/admin/stores', async (req, res) => {
  const { tenant_id, name, address, township, region_state, kbzpay_qr_url } = req.body;
  if (!tenant_id || !name) return res.status(400).json({ error: 'tenant_id_and_name_required' });
  const { rows } = await db.query(
    `INSERT INTO stores (id, tenant_id, name, address, township, region_state, kbzpay_qr_url)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *`,
    [tenant_id, name, address || null, township || null, region_state || null, kbzpay_qr_url || null]
  );
  res.status(201).json(rows[0]);
});

router.get('/admin/stores', async (req, res) => {
  const { tenant_id } = req.query;
  const { rows } = tenant_id
    ? await db.query('SELECT * FROM stores WHERE tenant_id = $1 ORDER BY created_at DESC', [tenant_id])
    : await db.query('SELECT * FROM stores ORDER BY created_at DESC');
  res.json({ stores: rows });
});

// ---------- Categories ----------
router.post('/admin/categories', async (req, res) => {
  const { tenant_id, name, sort_order } = req.body;
  if (!tenant_id || !name) return res.status(400).json({ error: 'tenant_id_and_name_required' });
  const { rows } = await db.query(
    `INSERT INTO categories (id, tenant_id, name, sort_order)
     VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *`,
    [tenant_id, name, sort_order || 0]
  );
  res.status(201).json(rows[0]);
});

router.get('/admin/categories', async (req, res) => {
  const { tenant_id } = req.query;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id_required' });
  const { rows } = await db.query(
    'SELECT * FROM categories WHERE tenant_id = $1 ORDER BY sort_order, name',
    [tenant_id]
  );
  res.json({ categories: rows });
});

// ---------- Products ----------
router.post('/admin/products', async (req, res) => {
  const { tenant_id, category_id, name, price, cost, sku, barcode } = req.body;
  if (!tenant_id || !name || price === undefined) {
    return res.status(400).json({ error: 'tenant_id_name_price_required' });
  }
  const { rows } = await db.query(
    `INSERT INTO products (id, tenant_id, category_id, name, sku, barcode, price, cost, is_active)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
    [tenant_id, category_id || null, name, sku || null, barcode || null, price, cost || null]
  );
  res.status(201).json(rows[0]);
});

router.get('/admin/products', async (req, res) => {
  const { tenant_id } = req.query;
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id_required' });
  const { rows } = await db.query('SELECT * FROM products WHERE tenant_id = $1 ORDER BY name', [tenant_id]);
  res.json({ products: rows });
});

router.patch('/admin/products/:id', async (req, res) => {
  const { name, price, is_active, category_id } = req.body;
  const { rows } = await db.query(
    `UPDATE products SET
       name = COALESCE($2, name),
       price = COALESCE($3, price),
       is_active = COALESCE($4, is_active),
       category_id = COALESCE($5, category_id),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, name, price, is_active, category_id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'product_not_found' });
  res.json(rows[0]);
});

// ---------- Orders (read-only, so an owner can see recent activity) ----------
router.get('/admin/orders', async (req, res) => {
  const { store_id } = req.query;
  if (!store_id) return res.status(400).json({ error: 'store_id_required' });
  const { rows } = await db.query(
    `SELECT id, table_number, channel, status, total, sync_status, created_at
     FROM orders WHERE store_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [store_id]
  );
  res.json({ orders: rows });
});

module.exports = router;
