# print-bridge

For stores that don't run a full `local-hub` (no on-site PC/Raspberry
Pi taking orders) but still want a receipt to print automatically for
every order — a generic 80mm Wi-Fi/Ethernet ESC/POS printer (Xprinter,
ZJiang, and most other budget network thermal printers all work,
since they implement the Epson command set), reachable over the same
local network as this bridge.

## Why this exists, not just local-hub

A web browser can't open a raw TCP socket to a printer's local IP —
that's a hard platform restriction, not a missing feature, so
admin-app itself can never print directly no matter what. Something
still has to sit on the same local network as the printer and speak
its protocol. `local-hub` already does this, but it's a much bigger
piece of software — it also takes orders from a local terminal, keeps
an offline order queue, drives a cash drawer, and needs its own
SQLite database. If none of that applies to how a store operates —
orders only ever come in through the customer QR menu — running all
of it just to get a receipt printed is a lot of unnecessary moving
parts. print-bridge is the same idea with everything but the printing
stripped out: register once, then loop — check for orders that
haven't been printed yet, print them, mark them done.

It registers as a `hub` the exact same way local-hub does (same
provisioning code, same "Hub setup" tab in admin-app) and calls the
same `GET /orders/pending` / `POST /orders/:id/ack` endpoints
local-hub uses to pull down customer-QR orders it didn't originate
locally. A store should run *either* local-hub *or* print-bridge, not
both — whichever one polls first for a given order claims it.

## Setup

1. In admin-app → Hub setup, set the printer's IP/port and turn
   printing on, then generate a pairing code.
2. On any always-on computer on the same network as the printer:
   ```bash
   npm install
   STORE_ID=<your store id> node scripts/register.js <code from step 1>
   ```
3. `npm start` — leave it running. It checks for new orders every 5
   seconds (`POLL_INTERVAL_MS` in `.env`) and prints each one once.

## Known limitation

If a print fails (printer off, wrong IP, out of paper), it's still
marked delivered rather than retried forever, and the only record of
that failure right now is this program's own console log — there's
no visible alert in admin-app yet if a receipt silently didn't print.
Worth closing that gap before leaning on this for a busy service.
