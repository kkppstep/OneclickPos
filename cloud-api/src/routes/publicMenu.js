const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /public/stores/:storeId/menu — unauthenticated, customer-facing.
// Called when a customer scans a table's QR code. Returns the store's
// menu grouped by category, plus two pieces of config the customer app
// needs at checkout time:
//   - local_hub_url: where to fall back to if the cloud becomes
//     unreachable mid-session (only reachable if the phone is on the
//     store's own wifi)
//   - kbzpay_qr_url: whether to offer KBZPay as a payment option at all
router.get('/public/stores/:storeId/menu', async (req, res) => {
  const { storeId } = req.params;

  const storeRes = await db.query(
    'SELECT id, tenant_id, kbzpay_qr_url, ambient_audio_url, ambient_audio_enabled FROM stores WHERE id = $1',
    [storeId]
  );
  const store = storeRes.rows[0];
  if (!store) return res.status(404).json({ error: 'store_not_found' });

  // Most-recently-seen hub with a known LAN address. Most stores have
  // exactly one hub; if a store ever has more than one, this just picks
  // whichever has been heard from most recently.
  const hubRes = await db.query(
    `SELECT local_lan_url FROM hubs
     WHERE store_id = $1 AND local_lan_url IS NOT NULL
     ORDER BY last_seen_at DESC NULLS LAST
     LIMIT 1`,
    [storeId]
  );

  // Products/categories are tenant-scoped (shared across a tenant's
  // stores), not store-scoped — see schema.sql. is_active filters out
  // discontinued items without deleting order history that references them.
  const rowsRes = await db.query(
    `SELECT c.id AS category_id, c.name AS category_name, c.sort_order,
            p.id AS product_id, p.name AS product_name, p.description, p.image_url, p.price
     FROM categories c
     JOIN products p ON p.category_id = c.id AND p.tenant_id = c.tenant_id
     WHERE c.tenant_id = $1 AND p.is_active = true
     ORDER BY c.sort_order ASC, c.name ASC, p.name ASC`,
    [store.tenant_id]
  );

  const categoriesById = new Map();
  for (const row of rowsRes.rows) {
    if (!categoriesById.has(row.category_id)) {
      categoriesById.set(row.category_id, {
        id: row.category_id,
        name: row.category_name,
        products: [],
      });
    }
    categoriesById.get(row.category_id).products.push({
      id: row.product_id,
      name: row.product_name,
      description: row.description,
      image_url: row.image_url,
      price: Number(row.price),
    });
  }

  res.json({
    categories: Array.from(categoriesById.values()),
    local_hub_url: hubRes.rows[0]?.local_lan_url || null,
    kbzpay_qr_url: store.kbzpay_qr_url || null,
    ambient_audio_url: store.ambient_audio_enabled ? store.ambient_audio_url : null,
  });
});

module.exports = router;
