// Time parsing and formatting helpers used by recipe cards and the build script's
// search filters. All functions tolerate missing or malformed inputs.

const UNICODE_FRACTIONS = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};
const FRACTION_RE = /(\d+)?\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g;

// Replace any "<integer><unicode-fraction>" or bare unicode fraction with
// its decimal equivalent so downstream regexes can match the digit form.
// "1½" -> "1.5", "½" -> "0.5". Used by time and quantity parsers so a
// recipe that says "Cook Time: 1½ hours" doesn't read as zero.
export function normalizeUnicodeFractions(str) {
  return str.replace(FRACTION_RE, (_, intPart, frac) => {
    const whole = intPart ? parseInt(intPart, 10) : 0;
    return String(whole + UNICODE_FRACTIONS[frac]);
  });
}

// Parse a human-readable duration like "10 minutes", "1 hour 20 minutes",
// "1.5 hours" or "1½ hours" into a whole-number count of minutes.
export function parseToMinutes(str) {
  if (!str) return 0;
  const s = normalizeUnicodeFractions(str);
  let total = 0;
  const hourMatch = s.match(/(\d+(?:\.\d+)?)\s*hour/i);
  const minMatch = s.match(/(\d+(?:\.\d+)?)\s*min/i);
  if (hourMatch) total += parseFloat(hourMatch[1]) * 60;
  if (minMatch) total += parseFloat(minMatch[1]);
  return Math.round(total);
}

// Compact display: "30 min" / "1 hr" / "1 hr 20 min". Returns '' for non-positive
// or missing values, so callers can branch with `if (text)`.
export function shortFormat(minutes) {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

// Long display used in the inferred-time script: "30 minutes", "1 hour",
// "1 hour 20 minutes". Returns null for non-positive minutes.
export function formatMinutes(mins) {
  if (mins <= 0) return null;
  if (mins < 60) return `${mins} minutes`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hWord = h === 1 ? 'hour' : 'hours';
  if (m === 0) return `${h} ${hWord}`;
  return `${h} ${hWord} ${m} minutes`;
}
