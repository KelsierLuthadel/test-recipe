// Time parsing and formatting helpers used by recipe cards and the build script's
// search filters. All functions tolerate missing or malformed inputs.

// Parse a human-readable duration like "10 minutes", "1 hour 20 minutes",
// "1.5 hours" or "1½ hours" into a whole-number count of minutes.
export function parseToMinutes(str) {
  if (!str) return 0;
  let total = 0;
  const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*hour/i);
  const minMatch = str.match(/(\d+(?:\.\d+)?)\s*min/i);
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
