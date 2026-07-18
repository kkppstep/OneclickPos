# POS platform (Myanmar-ready, offline-resilient)

Four pieces, three deployment targets:

| Folder | What it is | Deploys to |
|---|---|---|
| `schema.sql` | Full Postgres schema | run once against your database |
| `cloud-api/` | Order intake, catalog, admin API | **Vercel** (serverless) |
| `customer-app/` | QR-scan ordering page (menu, cart, checkout) | **Vercel** (static) |
| `admin-app/` | Owner/admin dashboard | **Vercel** (static) |
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
   `DATABASE_URL` and `ADMIN_API_KEY` as environment variables in the
   Vercel project. Note the deployed URL.

3. **`admin-app`** — `vercel deploy` from inside `admin-app/` (or drag
   the folder into the Vercel dashboard — it's static, no build step).
   Open it, go to **Connection**, and enter the `cloud-api` URL and your
   `ADMIN_API_KEY`.

4. **`customer-app`** — before deploying, set `CLOUD_API_BASE` at the
   top of `customer-app/app.js` to your `cloud-api` URL. Then
   `vercel deploy` from inside `customer-app/`. Note this URL — you'll
   enter it into `admin-app`'s Connection tab to generate table QR codes.

5. **`local-hub`** — for each physical store: copy this folder onto a
   small PC or Raspberry Pi on the store's network, `cp .env.example .env`
   and fill in `STORE_ID` + printer target, then generate a provisioning
   code from `admin-app`'s **Hub setup** tab and run
   `node scripts/register.js <code>`. See `local-hub/README.md`.

## What still needs work before this is production-ready

Each folder's own README has a "not yet implemented" section — the
short version: real admin/staff login (currently a placeholder shared
key), rate limiting on the two public customer-facing endpoints, and
order voids/refunds with audit logging. The core resilient-ordering
loop (customer places an order → cloud or local hub, whichever is
reachable → printed at the counter → synced when back online) is
built and wired end to end.
