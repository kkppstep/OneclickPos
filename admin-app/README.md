# Admin / owner dashboard

A static, framework-free dashboard for setting up stores, catalog, hub
devices, and table QR codes -- and viewing recent orders.

## First-time setup (once per new business)

1. In the Vercel project's Environment Variables, set `CLOUD_API_BASE`
   to your deployed `cloud-api` URL — a serverless function
   (`api/config.js`) reads it and pre-fills the Log in screen's URL
   field automatically. Same place/pattern as `cloud-api`'s
   `DATABASE_URL`; change it there and redeploy, no code edits needed.
   For local testing with `vercel dev`, copy `.env.example` to `.env`.
2. Open the deployed page, go to **Log in**, and use the "First time
   setting up a new business?" section: enter the platform operator's
   `PLATFORM_API_KEY` plus the business and owner's details. This
   creates the tenant and its first owner user.
3. Log in with that owner email/password. From here on, no platform
   key is ever needed again -- everything is scoped to the logged-in
   user's own tenant automatically.

## Day-to-day use

4. Create a store (you become its `owner` automatically), then
   categories and products. With a store selected, the Products tab
   also shows a "Mark sold out"/"Mark available" toggle per item —
   manual, per store, not stock-counted.
5. **Hub setup** generates a one-time provisioning code for each
   physical hub device (see `local-hub/README.md`).
6. **Table QR codes** generates a scannable QR per table, pointing at
   the customer ordering app with that store and table baked in.
7. **Staff** — add manager/cashier/kitchen_staff logins for this store
   (owner-only). You set their initial password directly; there's no
   invite-link flow yet, so share it with them out of band.
8. **Live orders** — the working view for staff during service: open
   orders with items and any special-request notes, a "Confirm payment"
   button for pending KBZPay orders, and "Mark completed." Polls every
   5 seconds. **Order history** is the separate read-only past-orders list.
9. **Analytics** — daily revenue chart, order count/average, and top
   10 best sellers by quantity, over 7/30/90-day ranges.

## Auth

Real login now (`POST /auth/login`, JWT-based), not a shared key.
Role checks (owner/manager/etc.) happen server-side per store, read
fresh from `store_users` on every request -- see cloud-api's README.
The old single-admin-key model is gone except for the one tenant-
bootstrap step above.

## Deploying

Static site, no build step -- deploy the folder as-is (Vercel, Netlify,
or any static host). It just calls whichever cloud API URL you enter
on the Log in screen.
