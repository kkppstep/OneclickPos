# Admin / owner dashboard

A static, framework-free dashboard for setting up stores, catalog, hub
devices, and table QR codes -- and viewing recent orders.

**Two genuinely separate apps live in this folder, on purpose:**

- `/` (this folder's `index.html` + `app.js`) — the shop-owner app.
  Nothing about the platform-admin console is visible or reachable
  from here — no button, no link, no hint it exists.
- `/platform/` (`platform/index.html` + `platform/platform.js`) — the
  platform-admin console (you, the operator). Separate login, separate
  token, separate JavaScript file. Reaching it means typing the URL
  directly (e.g. `https://your-admin-app.vercel.app/platform/`), not
  clicking anything in the owner app.

They share this one Vercel deployment (and `styles.css`, and the
`/api/config` endpoint) purely for deploy convenience — there's no
code-level connection between them beyond that.

## ⚠️ Required one-time setup: Google sign-in

Owner sign-up/sign-in works via Google, and it needs external
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
   field automatically. For local testing with `vercel dev`, copy
   `.env.example` to `.env`.
2. Open the deployed page and click **Sign in with Google**. A
   first-time sign-in automatically creates a new tenant (business)
   with a placeholder name and makes that Google account its owner —
   no key, no separate signup form. Rename the business from the
   **Business** tab afterward.
3. New businesses start with the extra features (Staff, Live Orders,
   Analytics) **locked** — a platform admin has to turn them on. This
   is intentional, not a bug: see "Feature permissions" below.

## Platform admin (you, the operator)

Go directly to `/platform/` (not linked from anywhere in the owner
app). There's no sign-up screen here by design — your account is
created by running `create-platform-admin.sql` directly against the
database (see the root README).

1. **Tenants & accounts** — every business on the platform:
   - A subscription status dropdown (`trial`/`active`/`past_due`/
     `suspended`/`cancelled`). Setting `suspended`/`cancelled` actually
     blocks that tenant's staff from logging in — not just a label.
   - **Feature permissions** — checkboxes for `live_orders`,
     `analytics`, `staff_management`. This is what actually shows or
     hides those tabs in the owner sidebar, and it's enforced on the
     matching API endpoints too (a determined owner poking the API
     directly still gets blocked, not just hidden buttons).
   - **Manage accounts** (expandable per tenant) — every individual
     user under that tenant, their store roles, and controls to
     deactivate one specific account or reset its password (works even
     for Google-only accounts, as an emergency access grant).
2. **Plans** — define subscription plans (price, billing cycle, max
   stores). This is billing/descriptive data only — it's the Tenants
   screen's feature checkboxes that actually gate anything, not a
   tenant's assigned plan.

## Day-to-day use (shop owner)

1. Create a store (you become its `owner` automatically), then
   categories and products. With a store selected, the Products tab
   also shows a "Mark sold out"/"Mark available" toggle per item —
   manual, per store, not stock-counted.
2. **Hub setup** generates a one-time provisioning code for each
   physical hub device (see `local-hub/README.md`).
3. **Table QR codes** generates a scannable QR per table, pointing at
   the customer ordering app with that store and table baked in.
4. **Staff** *(if enabled for your tenant)* — add manager/cashier/
   kitchen_staff logins for this store (owner-only). You set their
   initial password directly; there's no invite-link flow yet.
5. **Live orders** *(if enabled)* — the working view for staff during
   service: open orders with items and any special-request notes, a
   "Confirm payment" button for pending KBZPay orders, and "Mark
   completed." Polls every 5 seconds. **Order history** (always
   available) is the separate read-only past-orders list.
6. **Analytics** *(if enabled)* — daily revenue chart, order
   count/average, and top 10 best sellers by quantity, over
   7/30/90-day ranges.

## Auth

Two real logins, kept fully apart — different apps, different tokens,
different secrets: shop owner/staff (Google or email/password,
`POST /auth/login` / `/auth/google-exchange`) and platform admin
(`POST /platform/auth/login`). Role checks (owner/manager/etc.) happen
server-side per store, read fresh from `store_users` on every
request; feature permissions (`feature_overrides`) are read fresh from
the tenant on every gated request too — see `cloud-api`'s README for
both.

## Deploying

Static site, but includes a small serverless function (`api/config.js`)
for real environment-variable config — deploy as a proper Vercel
project (`vercel deploy`), not a plain static host drag-and-drop, so
that function (and the nested `/platform/` route) actually work.
