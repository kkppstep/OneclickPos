# POS cloud API

Receives synced/pending orders from store hubs and serves each store's
sync configuration. Run against a Postgres database created from
`schema.sql` (in the project root, alongside `local-hub/`).

## Endpoints

- `GET /health` — no auth, basic liveness check.
- `POST /admin/stores/:storeId/provisioning-codes` — admin-authenticated.
  Issues a short-lived (default 30 min), single-use code for setting up
  a new hub device at that store.
- `POST /hubs/register` — public, gated by a valid provisioning code
  instead of a hub API key (the device doesn't have one yet). Creates
  the `hubs` row and returns `hub_id` + `api_key` in plaintext exactly
  once — only the key's hash is ever stored.
- `GET /public/stores/:storeId/menu` — public, unauthenticated. Called
  by the customer ordering page after a QR scan. Returns the menu
  grouped by category, the store's KBZPay QR (if configured), and the
  store's hub LAN address for the customer app's offline fallback.
  No rate limiting yet — worth adding before this is exposed for real,
  since it's the one endpoint with zero auth by design.
- `POST /public/stores/:storeId/orders` — public, unauthenticated.
  Idempotent on `id` like the hub-authenticated version. Always sets
  `origin = 'cloud'` and leaves `delivered_to_hub_at` NULL — the
  store's hub hasn't seen the order yet, and won't until it's pulled
  down.
- `GET /orders/pending` / `POST /orders/:id/ack` — hub-authenticated.
  The pull-down half of the sync loop: a hub asks for any customer
  orders waiting for it, then acks each one once it's saved and printed.
- `/admin/*` (tenants, stores, categories, products, orders) —
  admin-authenticated CRUD for setting up and monitoring the platform.
  See `src/routes/admin.js` for the full list.

## Deploying to Vercel

```
vercel deploy
```

`vercel.json` routes every request through `api/index.js`, which
re-exports the same Express app used for local dev (`src/app.js`) — no
duplicate route definitions to maintain. Set `DATABASE_URL` and
`ADMIN_API_KEY` as Vercel environment variables. Use a connection
pooler (e.g. Supabase or Neon's pgbouncer endpoint) for `DATABASE_URL`
in production — see the comment in `src/db.js`.
- `GET /stores/:id/settings` — hub-authenticated. Returns
  `cloud_timeout_ms`, `retry_count`, `retry_backoff_ms` for that store.
  Called once by the hub at boot and cached locally.
- `POST /orders` — hub-authenticated. Idempotent on `id`: if the same
  order id arrives twice (e.g. the hub's earlier attempt actually
  succeeded but the response never reached it in time), the second call
  returns `200 already_recorded` instead of erroring or duplicating.

## Auth

Two separate schemes, deliberately not shared:

- **Hub auth** — every hub carries a bearer API key issued at
  registration. The cloud stores only its SHA-256 hash
  (`hubs.api_key_hash`) and compares against that — see
  `src/middleware/auth.js`.
- **Admin auth** — a placeholder shared-secret (`ADMIN_API_KEY`) gates
  provisioning-code creation. This is a stand-in for real admin
  accounts (owner/manager login) and should not go to production as-is
  — see the comment in `src/middleware/adminAuth.js`.

## Setup

```
cp .env.example .env
# point DATABASE_URL at a Postgres instance with schema.sql applied
npm install
npm start
```

## Not yet implemented (next steps)

- Real admin authentication to replace the `ADMIN_API_KEY` placeholder
  with per-user accounts and permissions.
- Rate limiting on the two public endpoints.
- Order edits/voids/refunds and the audit-log writes described in
  `schema.sql`'s `audit_log` table — currently nothing writes to it.
- Payment webhook support — deliberately skipped for now, since
  KBZPay/WavePay/CBPay don't offer reliable webhook confirmation for
  small merchants in Myanmar. The `staff_override` path is primary.
