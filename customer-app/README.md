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
  instead of always falling back to green's. **Only applies to
  Standard layout** — see below.
- **layout** — `standard` (scrolling card list, accent-colorable per
  above) or `stage`.

**Stage** is a full split-screen redesign: a left/top panel holds one
dish at a time in a 3D-tilting circular frame (mouse-tilt on desktop,
device-gyroscope on mobile, toggleable), with its name and description
typed on letter by letter; tapping the plate opens a fullscreen,
swipeable lightbox across the entire menu. The right/bottom panel is a
two-column glass card grid, grouped by category with the same
scroll-spy pill nav as Standard. Small synthesized click/chime sounds
(`src/lib/sound.js`, pure Web Audio oscillators, no audio files) play
on selection and add-to-cart, independent of a store's real
`ambient_audio_url` track (which still plays via the same toggle,
just relocated into Stage's control cluster instead of a floating
button).

Stage's purple/indigo/amber palette, glass panels, and glow effects
are **fixed** — deliberately not wired to a store's preset/accent or
custom background, since the shadows/rings/badges throughout are
tuned specifically for this look. A store on Stage gets this exact
look regardless of its preset selection. Only `layout` is read for
Stage stores; `preset`/`primary_color`/`background_image_url`/
`gradient_from`/`gradient_to` are ignored. Cinzel + Padauk are still
lazy-loaded only when a store is actually on Stage.

A `custom` preset on **Standard** layout can also set a background
image or gradient (`background_image_url` wins if both are set — same
rule the admin-app hint text describes).

## Payment

Two methods, matching what the menu endpoint provides: cash (pay at
the table, no QR) and KBZPay (shows the store's static QR code,
customer scans and pays via their own KBZPay app). There's no payment
gateway integration here — placing the order records a `payments` row
with `status: 'pending'`; reconciling that against what actually came
in is a staff/admin-app job, not this page's. Table number always
comes read-only from the QR code's `?table=` param — there's
deliberately no way for a customer to retype it and risk an order
going to the wrong table.

## Structure

```
src/
  App.jsx              orchestrates data loading, theme, both layouts
  lib/
    api.js              fetchMenu, submitOrder (cloud → local-hub fallback)
    theme.js             preset/shade resolution, background, lazy fonts
    color.js              hex/HSL helpers for deriving custom shades
    config.js               reads CLOUD_API_BASE, ?store=/?table=
    sound.js                 synthesized select/success sounds (Stage only)
  context/CartContext.jsx  cart state (add/remove/qty), shared via useCart()
  hooks/
    useMenu.js            fetch + loading/error state + flattened lookups
    useScrollSpy.js        active-category tracking, scoped to a root element
    useAmbientAudio.js      shared play/pause logic for a store's real track
    useOnlineStatus.js       navigator.onLine, for Stage's status dot
  components/
    Header.jsx / MenuSection.jsx / ProductCard.jsx     Standard layout
    StageControls.jsx        table badge, music/gyro/steam toggles, cart button
    CategoryPills.jsx          Stage's segmented pill nav
    MenuGridSection.jsx          Stage's 2-col glass card grid, per category
    InteractiveStage.jsx           Stage's hero: tilt, typewriter, steam
    DishModal.jsx                    fullscreen swipeable lightbox
    ProductModal.jsx        Standard's qty + notes modal, adds to cart
    CheckoutModal.jsx       review → payment → submit → confirmation
                             (drawer + small glass panels on Stage,
                             one centered modal on Standard)
    CartBar.jsx              floating summary, opens checkout
    Modal.jsx                 shared dialog shell — center or right-drawer
                               variant, both with backdrop/esc/scroll-lock
```

## Known gaps

- No offline queue — if both the cloud and local hub are unreachable,
  the order just fails with a message to try again. The hub's own
  pull-when-back-online sync (mentioned in the top-level README) is
  separate infrastructure this page doesn't attempt to replace.
- Payment status is always recorded as `pending`; nothing here marks
  it `paid`.

## Intentionally not carried over from the Stage design reference

Stage's look and interactions come from a reference mockup, but three
things in it were deliberately not replicated:

- A customer-facing "POS API Config" control that let anyone typing at
  the page repoint `CLOUD_API_BASE` to an arbitrary URL, stored in
  `localStorage`. Real config still only comes from the server-set
  `CLOUD_API_BASE` env var (`api/config.js`) — customers can't change
  where orders go.
- A flat "Presentation Surcharge" added to every order total. There's
  no such fee anywhere in the real schema/admin-app; adding one here
  would have silently overcharged customers for something not actually
  configured.
- An editable table number (tap-to-retype via a prompt). Table number
  is read-only from the QR code's `?table=` param, since a customer
  changing it risks their order going to the wrong table.
