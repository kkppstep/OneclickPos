# POS cloud API

Receives synced/pending orders from store hubs, serves each store's
sync configuration, and backs the admin dashboard and customer
ordering page. Run against a Postgres database created from
`schema.sql` (in the project root, alongside `local-hub/`).

## Auth — three separate schemes, deliberately not shared

- **Hub auth** — every hub carries a bearer API key issued at
  registration. The cloud stores only its SHA-256 hash
  (`hubs.api_key_hash`) and compares against that — see
  `src/middleware/auth.js`.
- **User auth** — real login for shop owners/managers/staff. Passwords
  are bcrypt-hashed (`users.password_hash`); `POST /auth/login` returns
  a JWT. Per-store role (owner/manager/cashier/kitchen_staff) is looked
  up fresh from `store_users` on every request rather than baked into
  the token, so revoking someone's access takes effect immediately —
  see `src/middleware/userAuth.js` and `src/middleware/roles.js`.
- **Platform auth** — a single shared secret (`PLATFORM_API_KEY`) gates
  only `POST /admin/tenants`, the one action with no logged-in user to
  attach to yet, since it's what creates a brand-new tenant and its
  first owner user. Only the platform operator (you) uses this; shop
  owners and staff never see or need it.

## Endpoints

- `GET /health` — no auth.
- `POST /auth/login` — public. `{ email, password }` → JWT + the list
  of stores that user has a role at.
- `POST /admin/tenants` — platform-gated. Creates a tenant AND its
  first owner user in one call (there's no logged-in user yet to
  attach it to).
- `GET /admin/tenants/me` — user-authenticated. The caller's own tenant.
- `/admin/stores`, `/admin/categories`, `/admin/products` — user-
  authenticated CRUD, scoped to the caller's own tenant. Category/
  product writes require `owner` or `manager` role at any of the
  tenant's stores; store creation just requires being logged in (the
  creator becomes that store's `owner` automatically).
- `GET /admin/orders?store_id=` — user-authenticated, requires
  `owner`/`manager` at that specific store.
- `POST /admin/stores/:storeId/provisioning-codes` — user-authenticated,
  requires `owner`/`manager` at that store. Issues a short-lived,
  single-use code for setting up a new hub device.
- `/admin/stores/:storeId/staff` (POST/GET/DELETE) — owner-only for
  adding/removing, owner or manager for viewing. Creates a login for a
  manager/cashier/kitchen_staff at that store, or reuses an existing
  user in the same tenant (e.g. staff working two branches).
- `GET /admin/stores/:storeId/live-orders` — any assigned role. Open
  orders only, with items/notes/payment status included — backs the
  kitchen/staff working view.
- `POST /admin/orders/:id/confirm-payment` — owner/manager only. Marks
  pending payments confirmed via staff override, writes to `audit_log`.
- `POST /admin/orders/:id/status` — any assigned role can move an order
  to `completed`; only owner/manager can `void`/`refund`. Writes to
  `audit_log`.
- `POST /hubs/register` — public, gated by a valid provisioning code
  instead of a hub API key (the device doesn't have one yet). Returns
  `hub_id` + `api_key` in plaintext exactly once — only the key's hash
  is ever stored.
- `GET /public/stores/:storeId/menu` — public, unauthenticated. Called
  by the customer ordering page after a QR scan. No rate limiting yet —
  worth adding before this is exposed for real, since it's the one
  endpoint with zero auth by design.
- `POST /public/stores/:storeId/orders` — public, unauthenticated,
  idempotent on `id`. Sets `origin = 'cloud'` and leaves
  `delivered_to_hub_at` NULL until the store's hub pulls it down.
- `GET /orders/pending` / `POST /orders/:id/ack` — hub-authenticated.
  The pull-down half of the sync loop.

## Deploying to Vercel

```
vercel deploy
```

`vercel.json` routes every request through `api/index.js`, which
re-exports the same Express app used for local dev (`src/app.js`) — no
duplicate route definitions to maintain. Set `DATABASE_URL`,
`PLATFORM_API_KEY`, and `JWT_SECRET` as Vercel environment variables.
Use a connection pooler (e.g. Supabase or Neon's pgbouncer endpoint) for
`DATABASE_URL` in production — see the comment in `src/db.js`.

## Not yet implemented (next steps)

- Password reset / self-service invite flow — an owner sets a staff
  member's initial password directly right now rather than sending an
  invite link.
- Rate limiting on the two public endpoints.
- Order edits and refund handling beyond a plain status change to
  `refunded` — no partial refunds or line-item edits yet.
- Payment webhook support — deliberately skipped for now, since
  KBZPay/WavePay/CBPay don't offer reliable webhook confirmation for
  small merchants in Myanmar. The `staff_override` path (now with a
  real UI button in admin-app) is primary.
