const axios = require('axios');
const config = require('./config');

function client() {
  return axios.create({
    baseURL: config.cloud.baseUrl,
    timeout: config.cloud.timeoutMs,
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
}

module.exports = { client };
