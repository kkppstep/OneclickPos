const { Pool } = require('pg');
const config = require('./config');

// Small default max — on Vercel, each serverless invocation can end up
// holding its own pool, so a large per-instance limit multiplies fast.
// Use a pooler (e.g. Supabase/Neon's pgbouncer endpoint) as
// DATABASE_URL in production rather than raising this.
const pool = new Pool({ connectionString: config.databaseUrl, max: Number(process.env.PG_POOL_MAX || 5) });

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
