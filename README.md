# POS platform (Myanmar-ready, offline-resilient)

Four pieces, three deployment targets:

| Folder | What it is | Deploys to |
|---|---|---|
| `schema.sql` | Full Postgres schema | run once against your database |
| `cloud-api/` | Order intake, catalog, admin API | **Vercel** (serverless) |
| `customer-app/` | QR-scan ordering page (menu, cart, checkout) | **Vercel** (static) |
| `admin-app/` | Owner/admin dashboard | **Vercel** (static) |
| `mobile-app/` | Capacitor iOS wrapper around `customer-app` | Xcode / App Store (optional, secondary channel — see its README) |
| `local-hub/` | Store-side service — prints receipts, drives the cash drawer, keeps the store working through internet outages | **NOT Vercel** — runs on a small PC or Raspberry Pi physically inside each store |

`local-hub` can't be serverless: it needs a persistent local database
and a real connection to store hardware (printer, cash drawer). It's a
separate, always-on deployment per store, not part of the web deploy.

## Deployment order

1. **Database** — create a Postgres database (Neon, Supabase, or
   self-hosted) and run `schema.sql` against it. If you deploy `cloud-api`
   to Vercel, use a connection-pooling endpoint (e.g. Supabase's
   pgbouncer URL) as `DATABASE_URL` — see `cloud-api/src/db.js`.

2. **`cloud-api`** — `vercel deploy` from inside `cloud-api/`. Set
   `DATABASE_URL`, `PLATFORM_API_KEY`, and `JWT_SECRET` as environment
   variables in the Vercel project. Also enable **Blob storage**
   (project's Storage tab → Create Database → Blob) so the
   drag-and-drop image/audio uploads work — this auto-injects
   `BLOB_READ_WRITE_TOKEN`, nothing to configure manually. Note the
   deployed URL.

3. **`admin-app`** — `vercel deploy` from inside `admin-app/`. In that
   Vercel project's Environment Variables, set `CLOUD_API_BASE` to your
   `cloud-api` URL from step 2 — a serverless function reads it and
   pre-fills the Log in screen automatically (same mechanism as
   `cloud-api`'s own env vars; change it and redeploy, no code edits).
   Open the deployed page, go to **Log in**, and use the "first time
   setting up a new business?" section with your `PLATFORM_API_KEY` to
   create your first tenant and owner login. From then on, log in
   normally — no platform key needed again.

4. **`customer-app`** — `vercel deploy` from inside `customer-app/`,
   then set `CLOUD_API_BASE` the same way in that project's Environment
   Variables. Note this URL — you'll enter it into `admin-app`'s
   **Table QR codes** tab the first time you generate one.

5. **`local-hub`** — for each physical store: copy this folder onto a
   small PC or Raspberry Pi on the store's network, `cp .env.example .env`
   and fill in `STORE_ID` + printer target, then generate a provisioning
   code from `admin-app`'s **Hub setup** tab and run
   `node scripts/register.js <code>`. See `local-hub/README.md`.

## What still needs work before this is production-ready

Each folder's own README has a "not yet implemented" section — the
short version: adding staff beyond a tenant's first owner (no invite
UI yet), rate limiting on the two public customer-facing endpoints,
and order voids/refunds with audit logging. Real login (owner/manager/
staff, JWT-based, per-store roles) and the core resilient-ordering loop
(customer places an order → cloud or local hub, whichever is
reachable → printed at the counter → synced when back online) are
both built and wired end to end.
