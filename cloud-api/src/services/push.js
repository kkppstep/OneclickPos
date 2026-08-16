// ============================================================
// Push notifications — new-order alerts for the admin mobile app.
//
// Entirely best-effort and entirely optional: every exported function
// swallows its own errors, and if FIREBASE_SERVICE_ACCOUNT isn't set
// at all (see config.js), notifyStore() just returns immediately.
// Nothing else in this API depends on push working, so an unconfigured
// or misbehaving Firebase project can never break order creation.
//
// Setup (skip this and everything above still works, minus push):
//   1. console.firebase.google.com -> create a project -> add an
//      Android app with the same package name as
//      admin-mobile-app/capacitor.config.json's "appId".
//   2. Project settings -> Service accounts -> Generate new private
//      key. Paste the whole downloaded JSON file as the
//      FIREBASE_SERVICE_ACCOUNT env var (one line, or however your
//      host handles multi-line secrets).
// ============================================================
const db = require('../db');
const config = require('../config');

let _app; // undefined = not yet attempted, null = unavailable, object = ready
function getFirebaseApp() {
  if (_app !== undefined) return _app;

  if (!config.firebaseServiceAccount) {
    console.warn('[push] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled.');
    _app = null;
    return _app;
  }

  try {
    // Required lazily so a deploy that never sets
    // FIREBASE_SERVICE_ACCOUNT doesn't need firebase-admin to even
    // load cleanly.
    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(config.firebaseServiceAccount);
    _app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (err) {
    console.error('[push] failed to initialize firebase-admin — check FIREBASE_SERVICE_ACCOUNT is valid JSON:', err.message);
    _app = null;
  }
  return _app;
}

// Every device belonging to a user who holds one of `roles` at
// storeId. Mirrors the same store_users join middleware/roles.js uses
// for requireStoreRole, so "who gets notified" always matches "who's
// allowed to see this" without needing to duplicate role data here.
async function tokensForStoreRoles(storeId, roles) {
  const { rows } = await db.query(
    `SELECT DISTINCT dpt.token
     FROM device_push_tokens dpt
     JOIN store_users su ON su.user_id = dpt.user_id
     WHERE su.store_id = $1 AND su.role = ANY($2)`,
    [storeId, roles]
  );
  return rows.map((r) => r.token);
}

async function pruneTokens(tokens) {
  if (tokens.length === 0) return;
  await db.query('DELETE FROM device_push_tokens WHERE token = ANY($1)', [tokens]).catch((err) => {
    console.error('[push] token cleanup failed (non-fatal):', err.message);
  });
}

// notifyStore(storeId, ['owner', 'manager'], { title, body, data })
// data values must end up as strings — FCM's "data" payload is
// string-only — so anything passed through here gets stringified.
async function notifyStore(storeId, roles, { title, body, data = {} }) {
  try {
    const app = getFirebaseApp();
    if (!app) return;

    const tokens = await tokensForStoreRoles(storeId, roles);
    if (tokens.length === 0) return;

    const admin = require('firebase-admin');
    const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));

    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          channelId: 'admin_orders_high',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: 'public',
        },
      },
    });

    // Tokens FCM reports as dead (app uninstalled, reinstalled with a
    // new token, etc.) get cleaned up so this list doesn't grow
    // stale forever.
    const deadTokens = [];
    result.responses.forEach((r, i) => {
      const code = r.error?.code;
      if (!r.success && (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token')) {
        deadTokens.push(tokens[i]);
      }
    });
    await pruneTokens(deadTokens);
  } catch (err) {
    // Never let a push failure affect the order/payment request that
    // triggered it.
    console.error('[push] notifyStore failed (non-fatal):', err.message);
  }
}

module.exports = { notifyStore };
