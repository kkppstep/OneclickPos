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

## Ambient music

Set by the owner in the admin dashboard (Stores → Edit settings) as a
URL to a small hosted audio file — there's no upload/hosting built
here, just a link, same pattern as the KBZPay QR image. Only plays if
the store has it enabled (`ambient_audio_enabled`).

Browsers block autoplay-with-sound until the user has interacted with
the page, so it starts on the customer's first tap rather than on
load, at a quiet default volume (35%), looping. A small toggle button
lets them mute it; that choice is remembered for the browsing session.

**Keep the file small**: since it loops, a short clip works fine —
15–30 seconds at 96–128kbps MP3/OGG typically lands well under 500KB,
which matters given the same connectivity constraints the rest of this
app is built around. A multi-minute high-bitrate track defeats the
"small MB" goal and will be slow to start on weak connections.

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

Replace CLOUD_API_BASE in app.js with your deployed API origin before
generating table QR codes.
