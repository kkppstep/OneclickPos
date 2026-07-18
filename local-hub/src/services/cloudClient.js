const axios = require('axios');
const config = require('../config');

function client(timeoutMs) {
  return axios.create({
    baseURL: config.cloud.baseUrl,
    timeout: timeoutMs,
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
}

// Tries the cloud once, respecting the store's configured timeout.
// Returns a plain {ok, ...} shape instead of throwing, so callers
// (routes/orders.js, services/syncQueue.js) don't need try/catch —
// a timeout here is an expected, ordinary outcome, not an error.
async function trySubmitOrder(order, timeoutMs) {
  try {
    const res = await client(timeoutMs).post('/orders', order);
    return { ok: true, data: res.data };
  } catch (err) {
    const reason = err.code === 'ECONNABORTED' ? 'timeout' : (err.response ? 'rejected' : 'network');
    return { ok: false, reason, error: err.message };
  }
}

module.exports = { trySubmitOrder, client };
