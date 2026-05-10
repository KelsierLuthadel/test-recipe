// Theme registry. Each theme has a label for the picker UI, a family
// (light/dark — drives the day/night intuition for the topbar button),
// and a counterpart in the opposite family so the topbar button can
// flip Mint ↔ Midnight, Blush ↔ Plum, Linen ↔ Cast Iron without
// resetting the user's chosen "scheme" each time.

export const THEMES = {
  linen:       { label: 'Linen',     family: 'light', counterpart: 'cast-iron' },
  'cast-iron': { label: 'Cast Iron', family: 'dark',  counterpart: 'linen' },
  mint:        { label: 'Mint',      family: 'light', counterpart: 'midnight' },
  midnight:    { label: 'Midnight',  family: 'dark',  counterpart: 'mint' },
  blush:       { label: 'Blush',     family: 'light', counterpart: 'plum' },
  plum:        { label: 'Plum',      family: 'dark',  counterpart: 'blush' },
};

export const THEME_KEYS = ['linen', 'mint', 'blush', 'cast-iron', 'midnight', 'plum'];
export const DEFAULT_LIGHT = 'linen';
export const DEFAULT_DARK = 'cast-iron';

export function isValidTheme(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(THEMES, name);
}

// Migrate the legacy 'light' / 'dark' values into the new theme keys.
// Used by the pre-paint script and by the storage layer.
export function normaliseTheme(value) {
  if (isValidTheme(value)) return value;
  if (value === 'light') return DEFAULT_LIGHT;
  if (value === 'dark') return DEFAULT_DARK;
  return null;
}

export function counterpartTheme(name) {
  const meta = THEMES[name];
  return meta ? meta.counterpart : DEFAULT_LIGHT;
}

export function familyOfTheme(name) {
  const meta = THEMES[name];
  return meta ? meta.family : 'light';
}
