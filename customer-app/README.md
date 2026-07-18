# Customer ordering page

A single, static, framework-free page — loads fast on weak connections and
needs no install. Opened by scanning a table's QR code, which points at:

```
https://order.yourpos.com/?store=<store_id>&table=<table_number>
```

Each table gets its own QR code (same URL, different `table` value).

## How it decides where to send the order

1. **Load the menu** — always from the cloud (`GET /public/stores/:id/menu`).
   There's no local fallback for this step: until the cloud responds, the
   page doesn't know the local hub's LAN address to fall back to.
2. **Submit the order** — tries the cloud first
   (`POST /public/stores/:id/orders`), which works over store wifi with a
   working internet connection, or the customer's own mobile data.
   If that call fails or times out, it falls back to posting straight to
   the local hub (`POST {local_hub_url}/orders`) over the store's LAN —
   this only succeeds if the customer's phone is on the store's own wifi.
   A customer on pure mobile data has no LAN path, but doesn't need one:
   their connection is independent of the store's, so it usually still
   works during a store-side outage.

## Payment

Cash is always available and is marked `confirmed` immediately. If the
store has a KBZPay QR configured (`kbzpay_qr_url` from the menu response),
it's offered as a second option: the customer scans it with their own
KBZPay app, and the order is submitted with that payment marked `pending`
— staff confirm it manually at the counter (`confirmed_by: staff_override`
in `schema.sql`). No webhook, no live confirmation.

## Design

Palette and structure draw from Myanmar lacquerware — ink black, a single
lacquer-red accent, a gold hairline dividing sections — kept to four colors
so the accent stays legible. Type is the system font stack on purpose, not
a placeholder: this page runs over the same unreliable connections the
rest of the platform is built around, so it loads zero font files.

## Not yet implemented / dependencies

This page assumes two cloud endpoints that don't exist yet:

- `GET /public/stores/:id/menu` — should return
  `{ categories: [{ id, name, products: [{ id, name, price }] }], local_hub_url, kbzpay_qr_url }`.
- `POST /public/stores/:id/orders` — the public, lightly-protected sibling
  of the hub-authenticated `/orders` route in `cloud-api/`.

Also assumes the local hub's existing `POST /orders` route (already built
in `local-hub/`) accepts orders from this page's payload shape — it's
close to what the terminal already sends, but add `table_number` and
`channel` handling there if they're not accounted for yet.

Replace `CLOUD_API_BASE` in `app.js` with your deployed API origin before
generating table QR codes.
