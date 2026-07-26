// Small hex <-> HSL helpers, used only to derive a dark/light/pale
// trio from a store owner's single custom accent color (the presets
// hand-pick all four shades; a custom color only gives us one, so the
// other three are derived rather than left mismatched).
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToHex(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Given one accent hex, derive a darker shade (for headings/hover), a
// very light tint (for the "themed" surface background) and a pale
// tint (for image placeholders) — same relationships the hand-picked
// presets already follow.
export function deriveShades(hex) {
  let rgb;
  try {
    rgb = hexToRgb(hex);
  } catch {
    rgb = { r: 27, g: 122, b: 61 }; // falls back to the green default
  }
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return {
    accent: hex,
    dark: hslToHex(h, clamp01(s + 0.05), clamp01(l * 0.62)),
    light: hslToHex(h, clamp01(s * 0.5), clamp01(0.95)),
    pale: hslToHex(h, clamp01(s * 0.55), clamp01(0.89)),
  };
}
