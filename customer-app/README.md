# customer-app

QR-scan ordering page for OneclickPos. A customer scans the code on
their table, browses the menu, builds a cart, and places a real order
that lands in the kitchen — no app install.

Rebuilt from the previous static Bootstrap/vanilla-JS version into
React + Vite + Tailwind. Functionally, the biggest change isn't the
framework — it's that the page now actually talks to `cloud-api`. The
old version only ever showed two hardcoded demo products and a fake
"order submitted" alert; this one fetches the real menu and posts real
orders (with a local-hub fallback if the cloud is unreachable).

## Setup

```bash
npm install
npm run dev
```

`npm run dev` runs plain Vite — no Vercel functions, so `api/config.js`
never executes. Copy `.env.example` to `.env.local` and point
`VITE_CLOUD_API_BASE` at a running `cloud-api` instance to get real
data locally. Without it, the menu will show the "couldn't load" error
screen, which is expected.

To test the actual `/api/config` path (the same one production uses),
run `vercel dev` instead, with `CLOUD_API_BASE` set in your Vercel
project's environment variables.

Either way, open the page with `?store=<a real store id>` in the URL —
without it you'll see the "missing table code" screen. Add `&table=5`
to also exercise the table badge.

## Deploying

Same as before: a Vercel project with `CLOUD_API_BASE` set in
Settings → Environment Variables, pointed at your deployed `cloud-api`.
`vercel.json` sets the build command and output directory explicitly,
so Vercel doesn't need to guess. Changing `CLOUD_API_BASE` still just
needs a redeploy, not a rebuild-from-source — `api/config.js` reads it
at request time.

**If this replaces the old static customer-app in an existing Vercel
project**, double check the project's build settings picked up
`vercel.json`'s `buildCommand`/`outputDirectory` rather than leftover
"no build" settings from before.

**mobile-app's `capacitor.config.json`** currently points `webDir` at
`../customer-app` directly (the old raw static folder). Once this
version is what ships, that needs to point at `../customer-app/dist`
(the build output) instead, and `npx cap sync` needs to run after
`npm run build`.

## How a session starts

A table's QR code encodes `https://your-domain.com/?store=<store
id>&table=<table number>`. `table` is optional — a counter/takeaway
code can omit it. The page reads both from the URL on load, fetches
`GET /public/stores/:storeId/menu`, and renders from there. Nothing is
hardcoded per-store; the same deployment serves every store.

## Layouts and theme

A store's `theme_config` (set in admin-app) controls two independent
things:

- **preset** — `green` (default) / `cozy` / `ice` / `custom`. Presets
  are hand-picked accent + shade sets (`src/lib/theme.js`); `custom`
  derives the same shade set from the store's own `primary_color` so
  an arbitrary brand color still gets a coherent dark/light/pale trio
  instead of always falling back to green's.
- **layout** — `standard` (scrolling card list) or `stage` (a
  single animated hero dish with a tap-to-swap grid below it, for
  stores that want something more premium-feeling). Stage lazy-loads
  its two Google Fonts (Cinzel, Padauk) only when a store actually
  uses it.

A `custom` preset can also set a background image or gradient
(`background_image_url` wins if both are set — same rule the
admin-app hint text describes).

## Payment

Two methods, matching what the menu endpoint provides: cash (pay at
the table, no QR) and KBZPay (shows the store's static QR code,
customer scans and pays via their own KBZPay app). There's no payment
gateway integration here — placing the order records a `payments` row
with `status: 'pending'`; reconciling that against what actually came
in is a staff/admin-app job, not this page's.

## Structure

```
src/
  App.jsx              orchestrates data loading, theme, both layouts
  lib/
    api.js              fetchMenu, submitOrder (cloud → local-hub fallback)
    theme.js             preset/shade resolution, background, lazy fonts
    color.js              hex/HSL helpers for deriving custom shades
    config.js               reads CLOUD_API_BASE, ?store=/?table=
  context/CartContext.jsx  cart state (add/remove/qty), shared via useCart()
  hooks/
    useMenu.js            fetch + loading/error state + flattened lookups
    useScrollSpy.js        active-category tracking for Standard layout
  components/
    Header.jsx              brand, table badge, category pills
    MenuSection.jsx / ProductCard.jsx      Standard layout
    StageHero.jsx / InteractiveStage.jsx   Stage layout (tilt, typewriter, steam)
    ProductModal.jsx        qty + notes, adds to cart
    CheckoutModal.jsx       review → payment → submit → confirmation
    CartBar.jsx              floating summary, opens checkout
    Modal.jsx                 shared dialog (backdrop, esc, scroll-lock)
```

## Known gaps

- No offline queue — if both the cloud and local hub are unreachable,
  the order just fails with a message to try again. The hub's own
  pull-when-back-online sync (mentioned in the top-level README) is
  separate infrastructure this page doesn't attempt to replace.
- Payment status is always recorded as `pending`; nothing here marks
  it `paid`.
