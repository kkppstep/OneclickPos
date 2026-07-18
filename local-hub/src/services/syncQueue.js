const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { trySubmitOrder } = require('./cloudClient');

function enqueue(entityType, entityId, operation, payload) {
  db.prepare(`
    INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
  `).run(uuidv4(), entityType, entityId, operation, JSON.stringify(payload));
}

// Drains pending items back to the cloud. Called on a timer from
// index.js, which is what recovers automatically once an outage
// ends — no manual "resync" button needed at the counter. Each item
// gets its own timeout attempt so one stubborn record can't block
// the rest of the queue.
async function drain(timeoutMs) {
  const pending = db.prepare(`
    SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 20
  `).all();

  for (const item of pending) {
    const payload = JSON.parse(item.payload);
    let result;

    if (item.entity_type === 'order') {
      result = await trySubmitOrder(payload, timeoutMs);
    } else {
      // extend here for 'payment', 'inventory', etc. as those flows are added
      result = { ok: false, reason: 'unsupported_entity_type' };
    }

    if (result.ok) {
      db.prepare(`UPDATE sync_queue SET status = 'synced', last_attempt_at = datetime('now') WHERE id = ?`)
        .run(item.id);
      if (item.entity_type === 'order') {
        db.prepare(`UPDATE orders SET sync_status = 'synced', synced_at = datetime('now') WHERE id = ?`)
          .run(item.entity_id);
      }
    } else {
      const attempts = item.attempts + 1;
      db.prepare(`
        UPDATE sync_queue
        SET attempts = ?, last_attempt_at = datetime('now'), last_error = ?
        WHERE id = ?
      `).run(attempts, result.error || result.reason, item.id);
    }
  }
}

module.exports = { enqueue, drain };
