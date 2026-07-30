# admin-mobile-app

Capacitor wrapper that packages `../admin-app/mobile` (a separate,
purpose-built mobile UI — not the desktop dashboard) as an Android app.
Same relationship `../mobile-app` has to `../customer-app`, just for
the admin side and Android instead of iOS.

**Three tabs only, on purpose:**

- **Home** — live orders for the selected store: table/channel, items,
  a "Paid"/"Awaiting payment" status, and Confirm payment / Mark
  completed actions. Polls every 5s while open, plus a push
  notification (see below) for when the app isn't open.
- **Products** — a Products / Categories switch: add, edit, delete,
  and (per store) toggle sold-out, with a tap-to-photograph image
  picker instead of the desktop's URL field.
- **Settings** — Account (business info, current store, order-alert
  toggle, log out), Analytics, and Order history.

Nothing here routes to `/platform` — the platform-operator console
stays desktop-only. Store creation, hub setup, staff management, and
table QR codes also stay desktop-only for now; they're one-time setup
tasks that are easier with a bigger screen. See "Not included" below.

## Local setup

```
cd admin-mobile-app
npm install
npx cap add android      # generates android/ — not committed, see below
npx cap sync android
npx cap open android      # opens Android Studio
```

`android/` is **not** checked into this repo. `npx cap add android`
generates it fresh from `capacitor.config.json` + the npm dependencies
above every time — CI does the same thing (see the workflow below).
This avoids committing a large, mostly-generated native project and
having it drift from what `@capacitor/cli` would produce. If you'd
rather commit it (e.g. once you add custom native code), that's a
one-time decision to make later — nothing here depends on it staying
uncommitted.

By default the app talks to whatever Cloud API URL you type into the
login screen (saved on-device after that). To ship a build that's
pre-filled with your real API out of the box, set it once — see
"Repository variable" below — instead of hand-editing
`../admin-app/mobile/config.js`.

## Push notifications (order alerts) — optional

Skip this whole section and the app still works — the Home tab just
relies on its 5s poll instead of a push alert while backgrounded.

1. [Firebase console](https://console.firebase.google.com) → create a
   project → **Add app → Android**, package name `com.yourpos.admin`
   (must match `capacitor.config.json`'s `appId` exactly).
2. Download the generated `google-services.json`.
3. Also do the cloud-api half of this — see its README's "Optional
   one-time setup: push notifications" section — so there's actually
   something server-side sending the alert.
4. Base64-encode the file and store it as a GitHub secret:
   ```
   base64 -i google-services.json | tr -d '\n' > encoded.txt
   ```
   Repo → Settings → Secrets and variables → Actions → New repository
   secret → name it `GOOGLE_SERVICES_JSON_BASE64`, paste the contents
   of `encoded.txt`.

Without this secret, the workflow below still builds a working APK —
it just skips the Firebase wiring, and `PushNotifications.register()`
in the app will fail quietly (caught, no crash) since there's no
Firebase project behind it yet.

## Repository variable (recommended, not required)

Settings → Secrets and variables → Actions → Variables → New
repository variable → `CLOUD_API_BASE` → your deployed cloud-api URL
(e.g. `https://your-api.vercel.app`). The workflow writes this into
`config.js` before building, so the app opens already pointed at your
API. Skip it and the login screen's manual field still works exactly
as before.

## Signed release builds — optional

The workflow always produces a **debug APK** (installable directly,
good enough for your own phone or internal testing) with no extra
setup. For a **signed release** (needed for the Play Store), add these
secrets and the workflow's release job picks them up automatically:

- `ANDROID_KEYSTORE_BASE64` — `base64 -i your-release-key.jks | tr -d '\n'`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

No keystore yet:
```
keytool -genkeypair -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias admin-app
```
Keep this file and its passwords somewhere safe outside git — losing
it means you can never update the app under the same listing again.

## What's not included (deliberately, for now)

- **Google sign-in.** The desktop dashboard's Google OAuth flow relies
  on a browser redirect that doesn't translate cleanly into a native
  app without extra native OAuth/deep-link plumbing. The mobile app
  signs in with email + password only (same `/auth/login` endpoint).
  A Google-only account (no password set) needs a platform admin to
  set one first — see cloud-api's `PATCH /platform/users/:id`. Ask if
  you'd like native Google sign-in added as a follow-up.
- **Stores, Hub setup, Staff, Table QR codes.** Desktop-only, per the
  3-tabs brief. Create/configure these from the desktop dashboard; the
  mobile app picks up whatever stores your account already has.
- **SKU/barcode fields** on the mobile product form — still fully
  editable from the desktop dashboard, just left off the phone-sized
  quick-add sheet.
- **Custom app icon/splash screen** — ships with Capacitor's defaults
  until you run something like `npx capacitor-assets generate` with
  your own source artwork.
