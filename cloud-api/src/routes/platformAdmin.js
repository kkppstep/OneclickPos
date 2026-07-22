const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { authenticatePlatformAdmin } = require('../middleware/platformAdminAuth');
const { FEATURE_KEYS } = require('../middleware/features');

const router = express.Router();

// GET /platform/features — the canonical list of gate-able feature
// keys, so admin-app's Tenants screen can build its checkboxes from
// one source of truth instead of a hardcoded duplicate list.
router.get('/platform/features', authenticatePlatformAdmin, (req, res) => {
  res.json({ features: FEATURE_KEYS });
});

// ---------- Login ----------
// No bootstrap endpoint here on purpose — platform admin accounts are
// created by inserting directly into platform_admins via SQL (using
// pgcrypto's crypt()/gen_salt('bf'), already enabled in schema.sql),
// not through the API. See the root README for the exact statement.

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

// PATCH /platform/tenants/:id — change subscription status/plan/expiry,
// and/or feature permissions. This is what actually has teeth:
// authenticateUser (middleware/userAuth.js) checks subscription_status
// on every tenant-user request, and middleware/features.js checks
// feature_overrides on the specific gated endpoints (live orders,
// analytics, staff management) — not just hidden in the sidebar.
router.patch('/platform/tenants/:id', authenticatePlatformAdmin, async (req, res) => {
  const { subscription_status, subscription_plan_id, subscription_expires_at, feature_overrides } = req.body;
  const { rows } = await db.query(
    `UPDATE tenants SET
       subscription_status = COALESCE($2, subscription_status),
       subscription_plan_id = COALESCE($3, subscription_plan_id),
       subscription_expires_at = COALESCE($4, subscription_expires_at),
       feature_overrides = COALESCE($5, feature_overrides),
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [
      req.params.id, subscription_status || null, subscription_plan_id || null,
      subscription_expires_at || null, feature_overrides ? JSON.stringify(feature_overrides) : null,
    ]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'tenant_not_found' });
  res.json(rows[0]);
});

// ---------- Individual accounts ----------
// Separate from whole-tenant suspension — lets the platform admin
// deactivate one specific person, or reset their password as an
// emergency access grant regardless of how they normally sign in
// (Google or password).

// GET /platform/tenants/:id/users — every user under one tenant.
router.get('/platform/tenants/:id/users', authenticatePlatformAdmin, async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.auth_provider, u.is_active, u.created_at,
            COALESCE(json_agg(json_build_object('store_id', su.store_id, 'store_name', s.name, 'role', su.role))
                     FILTER (WHERE su.id IS NOT NULL), '[]') AS stores
     FROM users u
     LEFT JOIN store_users su ON su.user_id = u.id
     LEFT JOIN stores s ON s.id = su.store_id
     WHERE u.tenant_id = $1
     GROUP BY u.id ORDER BY u.created_at ASC`,
    [req.params.id]
  );
  res.json({ users: rows });
});

// PATCH /platform/users/:id — { is_active?, new_password? }. Setting a
// new_password works even for a Google-only account (auth_provider
// stays 'google', but a password_hash is now also set) — an
// emergency access path, not a change to their normal sign-in method.
router.patch('/platform/users/:id', authenticatePlatformAdmin, async (req, res) => {
  const { is_active, new_password } = req.body;
  const passwordHash = new_password ? await bcrypt.hash(new_password, 10) : null;

  const { rows } = await db.query(
    `UPDATE users SET
       is_active = COALESCE($2, is_active),
       password_hash = COALESCE($3, password_hash)
     WHERE id = $1 RETURNING id, name, email, is_active, auth_provider`,
    [req.params.id, is_active, passwordHash]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'user_not_found' });
  res.json(rows[0]);
});

// ---------- Subscription plans ----------
// features here is a separate, descriptive JSONB bag for billing/plan
// definitions — the thing actually enforced on every request is
// tenants.feature_overrides (set via PATCH /platform/tenants/:id
// above), which is deliberately simpler: a direct per-tenant toggle
// that doesn't require assigning a plan first.

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
