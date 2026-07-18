# Admin / owner dashboard

A static, framework-free dashboard for setting up stores, catalog, hub
devices, and table QR codes -- and viewing recent orders.

## First-time setup (once per new business)

1. Open the deployed page, go to **Log in**, and use the "First time
   setting up a new business?" section: enter the platform operator's
   `PLATFORM_API_KEY` plus the business and owner's details. This
   creates the tenant and its first owner user.
2. Log in with that owner email/password. From here on, no platform
   key is ever needed again -- everything is scoped to the logged-in
   user's own tenant automatically.

## Day-to-day use

3. Create a store (you become its `owner` automatically), then
   categories and products.
4. **Hub setup** generates a one-time provisioning code for each
   physical hub device (see `local-hub/README.md`).
5. **Table QR codes** generates a scannable QR per table, pointing at
   the customer ordering app with that store and table baked in.
6. Add other staff (manager/cashier/kitchen_staff roles) -- not yet
   exposed in this UI; see cloud-api's README for the gap.

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
