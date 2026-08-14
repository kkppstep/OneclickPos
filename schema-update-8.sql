-- Customer-to-staff service requests, such as requesting the bill.
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('bill', 'staff')),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_service_requests_store_status
  ON service_requests (store_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_requests_one_active_per_table_type
  ON service_requests (store_id, table_number, request_type)
  WHERE status IN ('new', 'acknowledged');
