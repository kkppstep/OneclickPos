# Asset generation prompts

Prompts for an AI image or video generator (Midjourney, DALL-E,
Stable Diffusion, Runway, Kling, Sora, etc.) to produce a background
image and one visual per story step, to use instead of — or behind —
the CSS/SVG scenes currently in `index.html`.

## Keep them consistent — read this first

Six separate generations easily end up looking like six different
photoshoots. The fix: every prompt below ends with the same **style
anchor** line. Keep it word-for-word in each one — that repetition is
what makes them read as one consistent set instead of random stock
photos.

```
STYLE ANCHOR (paste at the end of every prompt):
moody cinematic restaurant photography, near-black background with
warm deep-red and gold accent lighting, soft ivory highlights,
shallow depth of field, subtle 35mm film grain, warm editorial color
grade, no text, no logos, no watermark
```

If your tool supports a reference/character-consistency feature
(Midjourney's `--cref`, Runway's reference image, etc.), generate the
background first, then feed it in as a style reference for the other
five — stronger consistency than repeated text alone.

**Two things AI generators are bad at, heads up:** hands (watch for
extra/warped fingers, regenerate if it looks off) and QR codes (it'll
render something that *looks* like a QR code but won't actually scan
— fine for a marketing photo, not fine if you were hoping to use the
output as a real code).

---

## Background (sits behind the page content)

Wide format (16:9 or 21:9), needs to stay dark/soft enough that white
text stays readable on top of it.

```
A softly blurred, dim interior of a modern Southeast Asian restaurant
at dusk. Warm string lights and candlelight glow amber and deep red
in the background. Empty wooden tables with soft bokeh in the
foreground. A few warm gold highlights catching table edges. No
people in sharp focus. Wide horizontal composition.

moody cinematic restaurant photography, near-black background with
warm deep-red and gold accent lighting, soft ivory highlights,
shallow depth of field, subtle 35mm film grain, warm editorial color
grade, no text, no logos, no watermark
```

---

## Step 1 — QR code on the table

Portrait or square works well here (matches the phone/card shape it's
replacing).

```
Overhead-angled close-up of a small wooden restaurant table at dusk.
A minimalist card standee with a crisp black-and-white QR code sits
in the center. A single warm gold pendant light glows softly above,
casting dramatic warm light and soft shadows. Dark moody restaurant
background, blurred, behind. Cinematic product photography, shallow
depth of field. No people in frame.

moody cinematic restaurant photography, near-black background with
warm deep-red and gold accent lighting, soft ivory highlights,
shallow depth of field, subtle 35mm film grain, warm editorial color
grade, no text, no logos, no watermark
```

## Step 2 — They scan

```
Close-up, over-the-shoulder shot of a hand holding up a smartphone,
camera app open with a viewfinder overlay, aimed down at a QR code
standee on a restaurant table below. Warm golden ambient restaurant
lighting. Shallow depth of field, phone screen sharply in focus.
Moody dark background. Candid, natural gesture — no face needed in
frame.

moody cinematic restaurant photography, near-black background with
warm deep-red and gold accent lighting, soft ivory highlights,
shallow depth of field, subtle 35mm film grain, warm editorial color
grade, no text, no logos, no watermark
```

## Step 3 — They browse and order

```
Close-up of a smartphone screen held at a restaurant table, showing a
clean modern food-ordering app interface with warm-toned food photo
thumbnails and a highlighted order button. A thumb mid-tap on the
screen. Warm ambient restaurant light reflecting softly off the phone
glass. Shallow depth of field, moody dark background.

moody cinematic restaurant photography, near-black background with
warm deep-red and gold accent lighting, soft ivory highlights,
shallow depth of field, subtle 35mm film grain, warm editorial color
grade, no text, no logos, no watermark
```

## Step 4 — Kitchen sees it instantly

```
A small restaurant kitchen at night. A chef's hands pinning a fresh
order ticket onto a rail of hanging tickets above a stainless steel
counter. Steam rising from a wok, soft focus, behind. Warm amber and
deep red kitchen lighting, dramatic shadows. Slight motion blur
suggesting quick, practiced movement. Documentary-style food
photography, energetic.

moody cinematic restaurant photography, near-black background with
warm deep-red and gold accent lighting, soft ivory highlights,
shallow depth of field, subtle 35mm film grain, warm editorial color
grade, no text, no logos, no watermark
```

## Step 5 — Your phone buzzes

```
Close-up of a smartphone resting on a wooden counter, screen lit up
with a soft glowing notification banner in the dark. A warm-toned
restaurant space blurred softly behind. Shallow depth of field, deep
red and gold ambient glow reflected on the phone's edge. Modern,
quiet moment.

moody cinematic restaurant photography, near-black background with
warm deep-red and gold accent lighting, soft ivory highlights,
shallow depth of field, subtle 35mm film grain, warm editorial color
grade, no text, no logos, no watermark
```

---

## If you're generating video instead of stills

Same prompts, two additions: describe one small, specific motion, and
say how long the shot is. Most video models do better with one clear
movement than several at once.

Example — Step 2 becomes:

```
[...same prompt as above...]

Camera slowly pushes in as the phone tilts slightly to frame the QR
code. 3-second shot, subtle handheld motion, steady otherwise.
```

Quick motion ideas per step: **1)** slow push-in on the table, light
flickering gently. **2)** phone rises into frame, brief pause as it
"catches" the code, a thin scan-line could sweep down if your tool
takes that kind of direction. **3)** thumb taps, the button reacts
(brightens/depresses). **4)** ticket swings slightly as it's pinned
up, steam continuously rising. **5)** screen fades from dark to lit as
the notification arrives, phone has a subtle single buzz/shift.

---

## Aspect ratios, if your tool asks

- Background: 16:9 or 21:9
- Steps 1, 4: 4:3 or 3:2 (table/counter shots read better wider)
- Steps 2, 3, 5: 4:5 or 1:1 (phone-centric, portrait-leaning)

These are suggestions, not requirements — match whatever you actually
drop the asset into on the page.
