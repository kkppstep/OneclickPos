// Local-dev entrypoint. Vercel doesn't use this file — see api/index.js,
// which imports the same app.js without calling .listen() (Vercel
// manages the listener itself for serverless functions).
const config = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`[cloud-api] listening on :${config.port}`);
});
