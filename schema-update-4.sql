-- Adds: per-tenant feature permissions (platform admin controlled)
-- and per-account activation (independent of whole-tenant suspension).

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS feature_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
