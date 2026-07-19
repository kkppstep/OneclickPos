const express = require('express');
const { put } = require('@vercel/blob');
const { authenticateUser } = require('../middleware/userAuth');
const { requireTenantRole } = require('../middleware/roles');

const router = express.Router();

const MAX_BYTES = 5 * 1024 * 1024; // 5MB safety cap — plenty for a product photo or a short ambient loop

// POST /admin/uploads — owner/manager. Accepts a base64-encoded file
// (simpler than multipart parsing in a serverless function) and
// returns a public URL, which the dashboard then drops straight into
// the relevant image_url / ambient_audio_url / kbzpay_qr_url field.
//
// Requires Blob storage enabled on the Vercel project (Storage tab ->
// Create Database -> Blob), which auto-injects BLOB_READ_WRITE_TOKEN.
// Without that env var this endpoint will fail — see README.
router.post('/admin/uploads', authenticateUser, requireTenantRole(['owner', 'manager']), async (req, res) => {
  const { filename, contentType, data } = req.body;
  if (!filename || !data) return res.status(400).json({ error: 'filename_and_data_required' });

  const buffer = Buffer.from(data, 'base64');
  if (buffer.length > MAX_BYTES) return res.status(413).json({ error: 'file_too_large_5mb_limit' });

  try {
    const blob = await put(`${req.user.tenant_id}/${Date.now()}-${filename}`, buffer, {
      access: 'public',
      contentType: contentType || 'application/octet-stream',
    });
    res.status(201).json({ url: blob.url });
  } catch (err) {
    console.error('[uploads] failed:', err.message);
    res.status(500).json({ error: 'upload_failed' });
  }
});

module.exports = router;
