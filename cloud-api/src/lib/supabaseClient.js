const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Uses the service role key (not the anon/public key) — this runs
// server-side only, in routes/uploads.js, never sent to the browser.
const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);

module.exports = supabase;
