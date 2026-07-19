# Mobile app (Capacitor / iOS)

Wraps `customer-app/` — the same Bootstrap ordering page used for the
table-QR flow — into a native iOS shell for App Store distribution.

## Worth knowing before building this

The customer ordering page was deliberately designed to need **no
install** — a customer scans a table's QR code and it just opens in
their phone's browser. That's the primary distribution path and should
stay the primary one: most walk-in customers won't install an app to
order once at a restaurant.

A native wrapper makes sense as a *secondary* channel — e.g. a
loyalty/repeat-customer app, or if you want App Store presence for
marketing reasons — not as a replacement for the QR flow. It's the same
web code either way; Capacitor just packages it.

## Setup

Requires a Mac with Xcode installed (iOS builds can't be produced
without one — there's no way around this with Capacitor or any other
iOS tooling).

```
cd mobile-app
npm install
npx cap add ios
npm run sync       # copies customer-app's files into the iOS project
npm run open:ios   # opens the project in Xcode
```

From Xcode: set your Apple Developer signing team, then build/run on a
simulator or device. App Store submission follows Apple's normal
process from there (App Store Connect, screenshots, review) — outside
what Capacitor itself handles.

## Keeping it in sync

Whenever `customer-app/` changes, re-run `npm run sync` before
rebuilding in Xcode — Capacitor copies the web files into the native
project at sync time, it doesn't reference them live.

## Config

`capacitor.config.json`'s `appId` (`com.yourpos.customer`) is a
placeholder — replace it with your actual bundle identifier before
building, since Apple requires this to be unique and it's difficult to
change later without losing your App Store listing continuity.
