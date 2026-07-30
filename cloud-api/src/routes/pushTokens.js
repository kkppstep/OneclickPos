// ============================================================
// Device push-token registration for the admin mobile app.
// See src/services/push.js for how these get used at send time.
// ============================================================
const express = require('express');
const db = require('../db');
const { authenticateUser } = require('../middleware/userAuth');

const router = express.Router();

// POST /admin/push-tokens — called once right after login, and again
// any time the app's PushNotifications 'registration' listener fires
// (FCM rotates tokens occasionally). Upserts on (user_id, token), so
// re-registering the same token on every app open is a harmless
// no-op rather than a growing pile of duplicate rows.
router.post('/admin/push-tokens', authenticateUser, async (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ error: 'token_required' });

  await db.query(
    `INSERT INTO device_push_tokens (id, user_id, token, platform, last_seen_at)
     VALUES (gen_random_uuid(), $1, $2, $3, now())
     ON CONFLICT (user_id, token) DO UPDATE SET last_seen_at = now(), platform = excluded.platform`,
    [req.user.id, token, platform === 'ios' ? 'ios' : 'android']
  );
  res.status(201).json({ registered: true });
});

// DELETE /admin/push-tokens/:token — called on logout so a shared or
// signed-out device stops receiving that user's order alerts.
router.delete('/admin/push-tokens/:token', authenticateUser, async (req, res) => {
  await db.query('DELETE FROM device_push_tokens WHERE user_id = $1 AND token = $2', [req.user.id, req.params.token]);
  res.json({ deleted: true });
});

module.exports = router;
