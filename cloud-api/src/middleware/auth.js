const crypto = require('crypto');
const db = require('../db');

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Every hub-facing route requires a valid hub API key. Looks up the
// hub by hashed key, joins to its store to get tenant_id, and stamps
// req.hub so downstream routes can scope queries and reject
// cross-store payloads.
async function authenticateHub(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  try {
    const keyHash = hashApiKey(token);
    const { rows } = await db.query(
      `SELECT hubs.id, hubs.store_id, stores.tenant_id
       FROM hubs JOIN stores ON stores.id = hubs.store_id
       WHERE hubs.api_key_hash = $1`,
      [keyHash]
    );
    const hub = rows[0];
    if (!hub) return res.status(401).json({ error: 'invalid_api_key' });

    // Cheap online/offline signal — updated on every authenticated call,
    // not just a dedicated heartbeat endpoint.
    db.query('UPDATE hubs SET status = $1, last_seen_at = now() WHERE id = $2', ['online', hub.id])
      .catch((err) => console.error('[auth] failed to update hub status:', err.message));

    req.hub = hub;
    next();
  } catch (err) {
    console.error('[auth] lookup failed:', err.message);
    res.status(500).json({ error: 'auth_lookup_failed' });
  }
}

module.exports = { authenticateHub, hashApiKey };
