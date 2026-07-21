# Customer ordering page

Bootstrap-based, mobile-first, image-led menu. Opened by scanning a
table's QR code:

```
https://order.yourpos.com/?store=<store_id>&table=<table_number>
```

## UX

- Sticky top bar with a horizontally-scrollable row of category pills.
  Tapping a pill smooth-scrolls to that section; scrolling manually
  updates the active pill automatically (IntersectionObserver), so
  browsing works either by tapping or by scrolling -- "easy scroll
  between sub-menus."
- One product card per row: image on top, name, short description,
  price, and a + button. All products for all categories are on one
  continuously scrollable page -- the category pills are navigation
  shortcuts, not separate pages.
- Tapping a card opens a modal: larger image, description, a quantity
  stepper, and a free-text comment field ("more sweet", "less spicy",
  etc.) -- saved as `notes` on that order line and printed on the
  kitchen ticket.
- Adding an item shows a floating green bar at the bottom with the
  running item count and total. Tapping it opens the cart, then payment
  (cash or KBZPay QR), then a confirmation screen.

## Menu theme

Two independent choices, set by the owner in admin-app (Stores →
create or Edit settings):

- **Color**: preset (Green/Cozy/Ice) or Custom with their own accent
  color, background gradient, or background image (drag-and-drop
  upload, same mechanism as product photos). Applied at runtime via
  CSS custom properties — this is a no-build static page, so there's
  no per-store build step to bake colors in at deploy time.
- **Layout**: Standard (the default scrolling card list) or **Stage**
  — a dark, premium "hero dish" presentation with a large circular
  plate view, gradient-gold pricing, and a lightweight CSS steam
  effect. Tapping any card in the grid below updates the hero; the
  hero's "Add to order" button opens the exact same product modal as
  the standard layout, so quantity/notes/payment/local-hub-fallback
  logic is identical between both layouts — nothing about ordering
  changes, only the presentation.

Stage layout lazy-loads two Google Fonts (Cinzel for display text,
Padauk for Burmese) only when a store actually uses it — stores on the
Standard layout never pay for that extra request. Deliberately doesn't
include a canvas particle simulation, gyroscope tilt, or a typewriter
text animation like some design references for this kind of view do —
those add real weight and complexity (permission prompts, per-frame
JS) for very little payoff on a page whose whole job is "let someone
order food quickly on a weak connection."

## Ambient music

Set by the owner in admin-app (Stores → create or Edit settings) —
now via drag-and-drop upload, not a pasted URL. Only plays if the
store has it enabled (`ambient_audio_enabled`).

Autoplay-with-sound is a browser platform policy, not something any
site can force. Playback is attempted immediately on load (succeeds on
desktop browsers, PWAs, and returning visitors with high engagement)
and falls back to starting on the customer's first tap if that's
blocked — quiet default volume (35%), looping. A small toggle button
lets them mute it; that choice is remembered for the session.

**Keep the file small**: since it loops, a short clip works fine —
15–30 seconds at 96–128kbps MP3/OGG typically lands well under 500KB,
which matters given the same connectivity constraints the rest of this
app is built around. A multi-minute high-bitrate track defeats the
"small MB" goal and will be slow to start on weak connections.

## Availability

Items an owner marks sold out (Products tab, per store) stay visible
on the menu rather than disappearing — grayed out with a "Sold out"
badge and no add button — so customers aren't left wondering where a
usually-available item went.

## Dependencies

- `product.image_url` and `product.description` -- added to `schema.sql`
  and the admin dashboard's product form. Products created before this
  change will render with a plain placeholder image and no description
  until edited.
- `order_items.notes` -- added to `schema.sql`, both cloud order routes,
  and the local hub, so a customer's comment survives all the way to
  the printed ticket.
- `GET /public/stores/:id/menu` and `POST /public/stores/:id/orders` --
  same cloud endpoints as before, now also returning/accepting
  `description`, `image_url`, and `notes`.

## Design

Green theme as specified -- a single accent green (#1B7A3D) with a pale
tint for image placeholders, kept to two shades plus neutral text so
the accent stays legible. Bootstrap 5 (CDN, no build step) for layout
primitives and the modal/dialog behavior; custom CSS on top for the
card, pill, and cart-bar look. Fast-loading images: cards use
loading="lazy" so only visible rows fetch images as the customer
scrolls, and a lightweight inline SVG placeholder (no network request)
covers products without an image yet.

The cloud API URL is set via a real environment variable
(`CLOUD_API_BASE`), not hardcoded in a committed file. A serverless
function (`api/config.js`) reads it and serves it to the page. Set it
in the Vercel project's Environment Variables — same place/pattern as
`cloud-api`'s `DATABASE_URL` — and it takes effect on redeploy, no code
edits needed. For local testing with `vercel dev`, copy `.env.example`
to `.env` and it's picked up automatically.
