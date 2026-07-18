# POS local hub

Runs on a small PC or Raspberry Pi inside each store. The terminal app talks
only to this hub (`http://<hub-ip>:4000`), never directly to the cloud.

## What it does

1. Receives an order from the terminal.
2. Tries the cloud API first, with a timeout pulled from this store's
   configured settings (`stores.cloud_timeout_ms`, cached locally after the
   first successful fetch).
3. If the cloud confirms in time, the order is saved locally marked `synced`.
4. If it times out, the order is saved locally marked `pending` and queued
   in `sync_queue`. A background timer retries the queue every
   `SYNC_DRAIN_INTERVAL_MS` until it drains — this is what recovers
   automatically once an outage ends.
5. Either way, the receipt printer and cash drawer are triggered locally,
   immediately, with no dependency on the cloud call's outcome.

## Setup

```
cp .env.example .env
# fill in STORE_ID and your printer's connection target — leave
# HUB_ID / HUB_API_KEY blank, registration fills those in for you
npm install

# One-time: redeem a provisioning code issued by an admin for this
# store (see cloud-api/README.md — POST /admin/stores/:id/provisioning-codes)
STORE_ID=<uuid> node scripts/register.js <PROVISIONING_CODE> "Front counter Pi"

npm start
```

Registration writes `hub-credentials.json` in the project root, which
`src/config.js` reads on every boot — you don't need to copy the issued
`HUB_ID` / `HUB_API_KEY` into `.env` by hand. Keep that file safe; the
`api_key` inside it isn't recoverable from the cloud if it's lost, only
reissuable via a fresh provisioning code.

## Not yet implemented (next steps)

- Payment confirmation endpoints (`/payments/:id/confirm`) for the
  webhook-vs-staff-override flow described in `schema.sql`.
- Inventory sync (pulling product/stock updates down from the cloud so the
  hub can price and validate orders even while offline).
- Barcode scanner input — no server-side code needed, it's keyboard-emulated
  input handled entirely in the terminal app's UI layer.
