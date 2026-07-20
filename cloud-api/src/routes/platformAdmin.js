const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { authenticatePlatform } = require('../middleware/platformAuth');
const { authenticatePlatformAdmin } = require('../middleware/platformAdminAuth');

const router = express.Router();

// ---------- Bootstrap & login ----------

// POST /platform/admins — gated by the raw PLATFORM_API_KEY, exactly
// like tenant bootstrap. Used once (or a few times, for additional
// platform staff) to create real accounts, so day-to-day platform
// management doesn't mean typing the shared key in every time.
router.post('/platform/admins', authenticatePlatform, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name_email_password_required' });

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await db.query(
      `INSERT INTO platform_admins (id, name, email, password_hash)
       VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id, name, email`,
      [name, email, passwordHash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'email_already_used' });
    console.error('[platform] admin create failed:', err.message);
    res.status(500).json({ error: 'admin_create_failed' });
  }
});

// POST /platform/auth/login — public. Separate from tenant-user login
// and issued with a separate secret (config.platformJwtSecret).
router.post('/platform/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });

  const { rows } = await db.query('SELECT * FROM platform_admins WHERE email = $1', [email]);
  const admin = rows[0];
  if (!admin) return res.status(401).json({ error: 'invalid_credentials' });

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return res.status(401).json({ error: 'invalid_credentials' });

  const token = jwt.sign({ sub: admin.id }, config.platformJwtSecret, { expiresIn: '12h' });
  res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } });
});

// ---------- Tenants ----------

// GET /platform/tenants — every tenant on the platform, with store
// count, for the operator's overview list.
router.get('/platform/tenants', authenticatePlatformAdmin, async (req, res) => {
  const { rows } = await db.query(
    `SELECT t.*, COUNT(s.id)::int AS store_count
     FROM tenants t LEFT JOIN stores s ON s.tenant_id = t.id
     GROUP BY t.id ORDER BY t.created_at DESC`
  );
  res.json({ tenants: rows });
});

// PATCH /platform/tenants/:id — change subscription status/plan/expiry.
// This is what actually has teeth: authenticateUser (middleware/userAuth.js)
// checks subscription_status on every tenant-user request and blocks
// suspended/cancelled tenants.
router.patch('/platform/tenants/:id', authenticatePlatformAdmin, async (req, res) => {
  const { subscription_status, subscription_plan_id, subscription_expires_at } = req.body;
  const { rows } = await db.query(
    `UPDATE tenants SET
       subscription_status = COALESCE($2, subscription_status),
       subscription_plan_id = COALESCE($3, subscription_plan_id),
       subscription_expires_at = COALESCE($4, subscription_expires_at),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, subscription_status || null, subscription_plan_id || null, subscription_expires_at || null]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'tenant_not_found' });
  res.json(rows[0]);
});

// ---------- Subscription plans ----------
// features is a free-form JSONB bag (e.g. {"analytics": true,
// "max_stores": 3, "ambient_audio": true}) — enforcing individual
// feature flags in specific endpoints is intentionally left as a
// follow-up (see cloud-api README); this is the data model + admin UI
// for defining what plans exist, not a full entitlement system yet.

router.get('/platform/plans', authenticatePlatformAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM subscription_plans ORDER BY price_mmk ASC');
  res.json({ plans: rows });
});

router.post('/platform/plans', authenticatePlatformAdmin, async (req, res) => {
  const { name, price_mmk, billing_cycle, max_stores, max_terminals_per_store, features } = req.body;
  if (!name || price_mmk === undefined || !billing_cycle) {
    return res.status(400).json({ error: 'name_price_mmk_billing_cycle_required' });
  }
  const { rows } = await db.query(
    `INSERT INTO subscription_plans (id, name, price_mmk, billing_cycle, max_stores, max_terminals_per_store, features)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, price_mmk, billing_cycle, max_stores || null, max_terminals_per_store || null, JSON.stringify(features || {})]
  );
  res.status(201).json(rows[0]);
});

router.patch('/platform/plans/:id', authenticatePlatformAdmin, async (req, res) => {
  const { name, price_mmk, max_stores, max_terminals_per_store, features } = req.body;
  const { rows } = await db.query(
    `UPDATE subscription_plans SET
       name = COALESCE($2, name),
       price_mmk = COALESCE($3, price_mmk),
       max_stores = COALESCE($4, max_stores),
       max_terminals_per_store = COALESCE($5, max_terminals_per_store),
       features = COALESCE($6, features)
     WHERE id = $1 RETURNING *`,
    [req.params.id, name, price_mmk, max_stores, max_terminals_per_store, features ? JSON.stringify(features) : null]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'plan_not_found' });
  res.json(rows[0]);
});

module.exports = router;
