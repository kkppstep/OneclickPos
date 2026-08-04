-- On-demand print jobs (payment receipts) — separate from the
-- existing orders/pending flow, which is for kitchen tickets as
-- orders arrive. This is for a specific rendered image, requested by
-- staff at checkout, printed once.
CREATE TABLE IF NOT EXISTS print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id),
    image_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'printed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    printed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_print_jobs_pending ON print_jobs (store_id) WHERE status = 'pending';
