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
