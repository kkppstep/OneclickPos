# Admin / owner dashboard

A static, framework-free dashboard for setting up tenants, stores,
catalog, hub devices, and table QR codes — and viewing recent orders.

## Setup

1. Open the deployed page (or `index.html` locally).
2. On the **Connection** tab, enter your deployed cloud API URL and the
   `ADMIN_API_KEY` you set in `cloud-api`'s environment.
3. Create a tenant, then a store under it, then categories and products.
4. Use **Hub setup** to generate a one-time provisioning code for each
   physical hub device (see `local-hub/README.md` for the device side).
5. Use **Table QR codes** to generate a scannable QR per table, pointing
   at the customer ordering app with that store and table baked in.

## Auth caveat

This uses the same placeholder `ADMIN_API_KEY` shared-secret as
`cloud-api`'s admin routes — fine for one operator standing the system
up, not fine for multiple staff with different permission levels. Real
admin accounts are a separate piece of work (see cloud-api's README).

## Deploying

Static site, no build step — deploy the folder as-is (Vercel, Netlify,
or any static host). Nothing in here needs to run on the same host as
`cloud-api` or `customer-app`; it just calls the cloud API's URL you
enter in Connection.
