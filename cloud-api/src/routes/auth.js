const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

const router = express.Router();

// POST /auth/login — public. Returns a JWT plus the list of stores
// this user has a role at, so the dashboard can offer a store picker
// right after login instead of a second round-trip.
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'invalid_credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'invalid_credentials' });

  const storesRes = await db.query(
    `SELECT su.store_id, su.role, s.name AS store_name
     FROM store_users su JOIN stores s ON s.id = su.store_id
     WHERE su.user_id = $1`,
    [user.id]
  );

  const token = jwt.sign({ sub: user.id, tenant_id: user.tenant_id }, config.jwtSecret, { expiresIn: '12h' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, tenant_id: user.tenant_id },
    stores: storesRes.rows,
  });
});

module.exports = router;
