# landing-page

The marketing site — QR-on-the-table story animation, Gold/Platinum
pricing, English + Burmese. Static files only (no build step, no
backend, no database) — same "plain HTML/CSS/JS, load libraries from
a CDN" approach `admin-app` already uses, just for a new, separate
site rather than a new part of the product itself.

## Before this goes live — two things to fix

1. **Pricing.** Open `content.js` and search for `FIXME PRICE` (4
   places — Gold and Platinum, in both languages). These are
   deliberately obvious placeholders, not real numbers, since you
   said actual pricing is still being set. Replace with real MMK
   figures whenever that's decided — nothing else needs to change.
2. **Sign-up link.** Also in `content.js`, `ADMIN_SIGNUP_URL` — set it
   to wherever your admin app is actually deployed. Every CTA button
   ("Get Gold", "Get Platinum", "Sign in", the final CTA) uses this
   one constant.

## Editing content

Everything you'd want to change — headlines, pricing copy, feature
lists, button text, in both languages — lives in `content.js`. Nothing
else needs touching for a copy change. The English and Burmese
versions are separate objects (`CONTENT.en` / `CONTENT.mm`) with the
same shape, so adding a plan or a feature line means adding it to both.

**On the Burmese text specifically:** it was drafted by Claude, not a
native speaker. It reads as correct, coherent Burmese as far as I can
verify, but for something customer-facing like this, it's worth a
native-speaker pass before it goes live — tone and word choice matter
a lot in marketing copy in a way that's hard for me to fully judge.

## How the pieces fit together

- `index.html` — structure. Section content that's just text uses
  `data-i18n="path.into.content.js"` attributes; `app.js` walks those
  and fills them in. Pricing cards aren't in the HTML at all — they're
  rendered from `content.js`'s `pricing.plans` arrays, so the EN/MM
  feature lists can't drift out of sync with each other structurally
  (only the words differ).
- `styles.css` — design tokens at the top (`:root`), same palette as
  `admin-app/styles.css`. Burmese automatically switches to the Padauk
  font via the `:lang(my)` selector — no JS needed for that part.
- `app.js` — three jobs: language switching, rendering the pricing
  cards, and the scroll animation.
- `content.js` — everything editable. See above.

## The scroll animation, and why it's two different things

On wider screens (900px+), the story section pins in place and scrubs
horizontally as you scroll — GSAP's `ScrollTrigger.matchMedia()`
(their own recommended pattern for exactly this) is what decides which
version runs, and re-decides automatically if the window crosses that
width. On phones, pinning + horizontal scroll-jacking reads as janky
on touch and eats a lot of a small screen's scroll budget, so it falls
back to a plain stacked layout — each frame just fades in normally as
you scroll past it. Same content and animations either way, different
delivery mechanism.

If you add a 6th story frame later: duplicate a `.story-frame` block
in `index.html`, add its `frames[5]` entry to *both* languages in
`content.js`, and add a `case 5:` to `choreographFrame()` in `app.js`
for whatever should animate in. Everything else (the pin distance, the
progress dots, the mobile fallback) adapts automatically since it's
all driven by `frames.length`.

## Running it locally

No build step — but opening `index.html` directly via `file://` will
have the Google Fonts `<link>` and GSAP `<script>` tags work fine
(they're just remote URLs), so that alone is enough to look at it.
For anything that behaves differently over `file://` vs a real origin,
any static server works, e.g. from this folder:

```
npx serve .
```

## Deploying

Static files, so any static host works — point Vercel, Netlify, or
similar at this folder as its own project (separate from `admin-app`'s
deployment). No environment variables, no serverless functions, no
database connection — the whole site is these four files plus fonts
and GSAP loaded from their CDNs.

## Design tokens, if you're extending this later

- Colors: `--ink` `#1B1512`, `--red` `#A6301F`, `--gold` `#C79A44`,
  `--ivory` `#F6EFE0` — all in `styles.css`'s `:root`, same values as
  `admin-app/styles.css`.
- Type: Fraunces (headlines), Inter (body/English UI), Padauk
  (Burmese, both) — loaded via the Google Fonts `<link>` in
  `index.html`.
