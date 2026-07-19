const express = require('express');
const supabase = require('../lib/supabaseClient');
const { authenticateUser } = require('../middleware/userAuth');
const { requireTenantRole } = require('../middleware/roles');

const router = express.Router();

const MAX_BYTES = 5 * 1024 * 1024; // 5MB safety cap
const BUCKET = 'uploads'; // must exist in Supabase Storage and be set Public — see README

// POST /admin/uploads — owner/manager. Accepts a base64-encoded file
// (simpler than multipart parsing in a serverless function) and
// returns a public URL from Supabase Storage, which the dashboard
// drops straight into image_url / ambient_audio_url / kbzpay_qr_url.
router.post('/admin/uploads', authenticateUser, requireTenantRole(['owner', 'manager']), async (req, res) => {
  const { filename, contentType, data } = req.body;
  if (!filename || !data) return res.status(400).json({ error: 'filename_and_data_required' });

  const buffer = Buffer.from(data, 'base64');
  if (buffer.length > MAX_BYTES) return res.status(413).json({ error: 'file_too_large_5mb_limit' });

  const path = `${req.user.tenant_id}/${Date.now()}-${filename}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: contentType || 'application/octet-stream',
    upsert: false,
  });
  if (uploadError) {
    console.error('[uploads] supabase upload failed:', uploadError.message);
    return res.status(500).json({ error: 'upload_failed', detail: uploadError.message });
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  res.status(201).json({ url: publicUrlData.publicUrl });
});

module.exports = router;
