# Admin / owner dashboard

A static, framework-free dashboard for setting up stores, catalog, hub
devices, and table QR codes -- and viewing recent orders. Also serves
as the platform-admin console (toggle in the sidebar) for managing
every tenant on the platform -- a separate login, kept deliberately
apart from shop owner accounts.

## ⚠️ Required one-time setup: Google sign-in

Owner sign-up/sign-in now works via Google, and it needs external
configuration before it'll work -- see `cloud-api/README.md`'s "Required
one-time setup: Google OAuth" section for the exact steps (Google Cloud
Console + Supabase dashboard). Also set `SUPABASE_URL` and
`SUPABASE_ANON_KEY` as Vercel environment variables on **this** project
(admin-app) -- the anon key is Supabase's public client key, safe to
expose in the browser, distinct from the service_role key used
server-side in `cloud-api`.

## First-time setup for a shop owner

1. In the Vercel project's Environment Variables, set `CLOUD_API_BASE`
   to your deployed `cloud-api` URL — a serverless function
   (`api/config.js`) reads it and pre-fills the Log in screen's URL
   field automatically. Same place/pattern as `cloud-api`'s
   `DATABASE_URL`; change it there and redeploy, no code edits needed.
   For local testing with `vercel dev`, copy `.env.example` to `.env`.
2. Open the deployed page and click **Sign in with Google**. A
   first-time sign-in automatically creates a new tenant (business)
   with a placeholder name and makes that Google account its owner —
   no platform key, no separate signup form. Rename the business from
   the **Business** tab afterward.
3. Prefer not to use Google? The "Prefer not to use Google?" card on
   the same screen is a manual alternative, gated by the platform
   operator's `PLATFORM_API_KEY` — creates a tenant + owner with an
   email/password instead.

## Platform admin (you, the operator)

Click **⚙ Platform admin** at the bottom of the sidebar — this swaps
the whole sidebar into a separate mode with its own login, entirely
disconnected from shop-owner accounts.

1. First time: use the "First time — create your platform admin
   account" card, gated by `PLATFORM_API_KEY`. One-time; log in
   normally after that.
2. **Tenants** — every business on the platform, with a status
   dropdown (`trial`/`active`/`past_due`/`suspended`/`cancelled`).
   Setting a tenant to `suspended` or `cancelled` actually blocks that
   tenant's staff from logging in (`cloud-api`'s `authenticateUser`
   checks this on every request) — not just a label.
3. **Plans** — define subscription plans (price, billing cycle, max
   stores). This is data-entry only right now — assigning a tenant to
   a plan doesn't restrict anything yet, including `max_stores`; see
   `cloud-api`'s README for what's not enforced.

## Day-to-day use

1. Create a store (you become its `owner` automatically), then
   categories and products. With a store selected, the Products tab
   also shows a "Mark sold out"/"Mark available" toggle per item —
   manual, per store, not stock-counted.
2. **Hub setup** generates a one-time provisioning code for each
   physical hub device (see `local-hub/README.md`).
3. **Table QR codes** generates a scannable QR per table, pointing at
   the customer ordering app with that store and table baked in.
4. **Staff** — add manager/cashier/kitchen_staff logins for this store
   (owner-only). You set their initial password directly; there's no
   invite-link flow yet, so share it with them out of band.
5. **Live orders** — the working view for staff during service: open
   orders with items and any special-request notes, a "Confirm payment"
   button for pending KBZPay orders, and "Mark completed." Polls every
   5 seconds. **Order history** is the separate read-only past-orders list.
6. **Analytics** — daily revenue chart, order count/average, and top
   10 best sellers by quantity, over 7/30/90-day ranges.

## Auth

Two real logins, kept apart on purpose: shop owner/staff (Google or
email/password, `POST /auth/login` / `/auth/google-exchange`) and
platform admin (`POST /platform/auth/login`, different token, different
secret). Role checks (owner/manager/etc.) happen server-side per store,
read fresh from `store_users` on every request — see cloud-api's
README. The old single-admin-key model only survives as a manual
fallback for tenant/platform-admin bootstrap.

## Deploying

Static site, but now includes a small serverless function
(`api/config.js`) for real environment-variable config — deploy as a
proper Vercel project (`vercel deploy`), not a plain static host drag-
and-drop, so that function actually runs.
