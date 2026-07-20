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

## ⚠️ Required one-time setup: Google OAuth

This is an external dashboard step (Google Cloud Console + Supabase),
not something any deploy command handles — see
`cloud-api/README.md`'s "Required one-time setup: Google OAuth" section
for the exact steps. Do this **before** step 2 below, or owner
sign-in won't work and will fail without an obvious reason why.

## Deployment order

1. **Database** — create a Postgres database (Neon, Supabase, or
   self-hosted) and run `schema.sql` against it. If you deploy `cloud-api`
   to Vercel, use a connection-pooling endpoint (e.g. Supabase's
   pgbouncer URL) as `DATABASE_URL` — see `cloud-api/src/db.js`. Also
   create a Storage bucket named `uploads` in Supabase (Storage → New
   bucket), set to **Public** — this is what drag-and-drop image/audio
   uploads write to.

2. **`cloud-api`** — `vercel deploy` from inside `cloud-api/`. Set
   `DATABASE_URL`, `PLATFORM_API_KEY`, `JWT_SECRET`,
   `PLATFORM_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   and `SUPABASE_JWT_SECRET` as environment variables in the Vercel
   project. Note the deployed URL.

3. **`admin-app`** — `vercel deploy` from inside `admin-app/`. In that
   Vercel project's Environment Variables, set `CLOUD_API_BASE` to your
   `cloud-api` URL from step 2, plus `SUPABASE_URL` and
   `SUPABASE_ANON_KEY` (the public anon key, not service_role — needed
   for the Google sign-in button). A serverless function reads these
   and pre-fills the Log in screen automatically; change them and
   redeploy, no code edits needed.

   Open the deployed page and click **Sign in with Google** to create
   your first business (or use the manual `PLATFORM_API_KEY` fallback
   card if you'd rather not use Google). Separately, click **⚙
   Platform admin** at the bottom of the sidebar to set up your own
   platform-operator account (also gated by `PLATFORM_API_KEY` the
   first time) — this is where you'll manage every tenant's
   subscription status going forward.

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
short version: subscription-plan feature enforcement (plans exist and
can be assigned, but nothing restricts what a tenant on a given plan
can actually do), staff invite links (owner sets passwords directly
right now), rate limiting on the two public customer-facing endpoints,
and order voids/refunds with audit logging. Real login (Google or
password, JWT-based, per-store roles, plus a fully separate
platform-admin layer with actual subscription-suspension enforcement)
and the core resilient-ordering loop (customer places an order →
cloud or local hub, whichever is reachable → printed at the counter →
synced when back online) are both built and wired end to end.
