-- Adds: device push-notification tokens for the admin mobile app's
-- "new order" alerts. See schema.sql's own copy of this table for the
-- design note — kept identical, this file just exists so a database
-- that was created before this table was added can catch up.

CREATE TABLE IF NOT EXISTS device_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, token)
);
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user ON device_push_tokens (user_id);
