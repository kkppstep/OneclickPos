import { deriveShades } from './color';

// Hand-picked shade sets for the three built-in presets. 'custom'
// isn't listed here on purpose — its shades are derived from the
// store's own primary_color instead (see deriveShades).
export const THEME_PRESETS = {
  green: { accent: '#1B7A3D', dark: '#125C2E', light: '#EAF7EE', pale: '#DCF0E2' },
  cozy: { accent: '#8C4327', dark: '#5C2B18', light: '#FDF6F0', pale: '#F4E7DE' },
  ice: { accent: '#2B7A9E', dark: '#1A4F68', light: '#F0F8FF', pale: '#DDEEFA' },
};

const DEFAULT_THEME = { preset: 'green', layout: 'standard' };

// Normalizes the API's theme_config (preset/layout/primary_color/
// gradient_from/gradient_to/background_image_url) into the shape the
// UI actually consumes: resolved shades + background instructions.
export function resolveTheme(themeConfig) {
  const theme = { ...DEFAULT_THEME, ...(themeConfig || {}) };
  const shades =
    theme.preset === 'custom' && theme.primary_color
      ? deriveShades(theme.primary_color)
      : THEME_PRESETS[theme.preset] || THEME_PRESETS.green;

  let background = null;
  if (theme.preset === 'custom') {
    if (theme.background_image_url) {
      background = { type: 'image', value: theme.background_image_url };
    } else if (theme.gradient_from && theme.gradient_to) {
      background = { type: 'gradient', from: theme.gradient_from, to: theme.gradient_to };
    }
  }

  return {
    layout: theme.layout === 'stage' ? 'stage' : 'standard',
    shades,
    background,
  };
}

// Pushes resolved shades onto :root as CSS custom properties, so both
// Tailwind's arbitrary-value utilities (bg-[var(--accent)]) and the
// few plain-CSS spots (index.css) stay in sync with the active store.
export function applyAccentVars(shades) {
  const root = document.documentElement;
  root.style.setProperty('--accent', shades.accent);
  root.style.setProperty('--accent-dark', shades.dark);
  root.style.setProperty('--accent-light', shades.light);
  root.style.setProperty('--accent-pale', shades.pale);
}

let stageFontsLoaded = false;

// Cinzel (display) + Padauk (Burmese) are real, separate network
// requests, so only load them the first time a store actually uses
// the Stage layout in this session — Standard-layout stores never pay
// for it.
export function ensureStageFontsLoaded() {
  if (stageFontsLoaded) return;
  stageFontsLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Padauk:wght@400;700&display=swap';
  document.head.appendChild(link);
}
