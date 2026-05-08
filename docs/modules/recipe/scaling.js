// Servings scaler chip + ingredient quantity rescaling.
// The chip's +/- buttons rewrite the leading quantity token of every
// ingredient line. Original innerHTML is snapshotted on first scale so
// successive +/- presses always rescale from the original values, not
// from already-scaled text (which would compound rounding errors).

import { findIngredientItems } from './ingredients.js';

const FRAC_VALUES = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
const FRAC_TARGETS = [
  [0.125, '⅛'], [0.25, '¼'], [0.333, '⅓'], [0.375, '⅜'],
  [0.5, '½'], [0.625, '⅝'], [0.667, '⅔'], [0.75, '¾'], [0.875, '⅞'],
];

// Parse a leading number with optional unicode fraction. Used by the timer
// module too (e.g. "1½ hours" -> 1.5).
export function parseQuantity(s) {
  let total = 0;
  let consumed = false;
  // Try forms in order of specificity so a mixed number like "1 1/2"
  // doesn't get partially eaten as "1" + lookups for unicode fractions.
  const mixedFrac = s.match(/^\s*(\d+)\s+(\d+)\/(\d+)/);
  const fracOnly = s.match(/^\s*(\d+)\/(\d+)/);
  // Accept decimals with or without a leading digit: "0.5", ".5", "1,5".
  const intMatch = s.match(/^\s*(\d+(?:[.,]\d+)?|\.\d+)/);
  if (mixedFrac) {
    const denom = parseInt(mixedFrac[3], 10);
    if (denom > 0) {
      total += parseInt(mixedFrac[1], 10) + parseInt(mixedFrac[2], 10) / denom;
      consumed = true;
    }
  } else if (fracOnly) {
    const denom = parseInt(fracOnly[2], 10);
    if (denom > 0) {
      total += parseInt(fracOnly[1], 10) / denom;
      consumed = true;
    }
  } else if (intMatch) {
    total += parseFloat(intMatch[1].replace(',', '.'));
    consumed = true;
  }
  for (const ch of s) {
    if (FRAC_VALUES[ch] !== undefined) { total += FRAC_VALUES[ch]; consumed = true; }
  }
  return consumed ? total : NaN;
}

export function formatQuantity(n) {
  if (!Number.isFinite(n) || n <= 0) return '0';
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.05) return String(whole);
  if (frac > 0.95) return String(whole + 1);
  for (const [v, sym] of FRAC_TARGETS) {
    if (Math.abs(frac - v) < 0.045) {
      return whole > 0 ? `${whole}${sym}` : sym;
    }
  }
  // No clean fraction — show one decimal.
  return (Math.round(n * 10) / 10).toString();
}

function scaleQuantityToken(token, factor) {
  const range = token.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (range) {
    const a = parseQuantity(range[1]); const b = parseQuantity(range[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return token;
    return formatQuantity(a * factor) + '–' + formatQuantity(b * factor);
  }
  const v = parseQuantity(token);
  if (!Number.isFinite(v)) return token;
  return formatQuantity(v * factor);
}

function scaleIngredientLine(html, factor) {
  return html.replace(
    /^(\s*)((?:\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔⅛⅜⅝⅞])?)(?:\s*[-–]\s*\d+(?:[.,]\d+)?(?:\s*[½¼¾⅓⅔⅛⅜⅝⅞])?)?|[½¼¾⅓⅔⅛⅜⅝⅞])/,
    (full, lead, num) => lead + scaleQuantityToken(num, factor),
  );
}

export function bindServesScaler(body) {
  const chip = body.querySelector('.serves-chip');
  if (!chip) return;
  const original = parseInt(chip.dataset.originalServes, 10);
  if (!Number.isFinite(original) || original <= 0) return;

  // Snapshot the current ingredient HTML so we always rescale from the original.
  findIngredientItems(body).forEach(li => {
    if (!li.dataset.original) li.dataset.original = li.innerHTML;
  });

  const valueEl = chip.querySelector('.serves-value');
  chip.querySelectorAll('.serves-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = parseInt(valueEl.textContent, 10) || original;
      const step = parseInt(btn.dataset.step, 10);
      const next = Math.max(1, current + step);
      if (next === current) return;
      valueEl.textContent = String(next);
      rescaleIngredients(body, next / original);
    });
  });
}

function rescaleIngredients(body, factor) {
  findIngredientItems(body).forEach(li => {
    const orig = li.dataset.original;
    if (!orig) return;
    li.innerHTML = scaleIngredientLine(orig, factor);
  });
}
