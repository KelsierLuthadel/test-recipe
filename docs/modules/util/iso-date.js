// Date and month helpers for the calendar-style meal plan. Plans are
// keyed by ISO date (YYYY-MM-DD); months are addressed as "YYYY-MM".
// All dates are treated as local-day dates (no time component);
// formatting uses the user's locale.

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n) { return String(n).padStart(2, '0'); }

// "YYYY-MM-DD" for a Date, in the user's local timezone (so calendar
// boundaries follow the user's clock, not UTC).
export function isoDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// "YYYY-MM" for a Date.
export function isoMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function isValidIsoDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function isValidIsoMonth(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}$/.test(s);
}

// Parse "YYYY-MM-DD" into a local Date.
export function dateFromIso(iso) {
  if (!isValidIsoDate(iso)) return null;
  const [y, m, d] = iso.split('-').map(n => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

// Parse "YYYY-MM" into a local Date pointing to the 1st of the month.
export function monthFromIso(iso) {
  if (!isValidIsoMonth(iso)) return null;
  const [y, m] = iso.split('-').map(n => parseInt(n, 10));
  return new Date(y, m - 1, 1);
}

// Shift a YYYY-MM by n months (positive = future).
export function addMonths(iso, n) {
  const d = monthFromIso(iso);
  if (!d) return iso;
  d.setMonth(d.getMonth() + n);
  return isoMonthKey(d);
}

// "YYYY-MM" of the month containing this ISO date.
export function monthOfDate(isoDate) {
  if (!isValidIsoDate(isoDate)) return null;
  return isoDate.slice(0, 7);
}

export function isCurrentMonth(iso) {
  return iso === isoMonthKey(new Date());
}

export function isToday(isoDate) {
  return isoDate === isoDateKey(new Date());
}

// Long month label like "May 2026".
export function monthLabel(iso) {
  const d = monthFromIso(iso);
  if (!d) return iso;
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(d);
}

// "Wed 14 May 2026" — used in the day detail panel header.
export function dateLongLabel(isoDate) {
  const d = dateFromIso(isoDate);
  if (!d) return isoDate;
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

// Short label "14 May" — used in cells and the picker.
export function dateShortLabel(isoDate) {
  const d = dateFromIso(isoDate);
  if (!d) return isoDate;
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(d);
}

// "Wed 14 May" — used in the recipe-page picker chips.
export function dateChipLabel(isoDate) {
  const d = dateFromIso(isoDate);
  if (!d) return isoDate;
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

// Weekday header strings ['Mon', 'Tue', ..., 'Sun'] — matches the
// Monday-start grid the calendar uses.
export const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Returns the cell list for a calendar grid covering a given month.
// The grid starts on the Monday before (or on) the 1st of the month and
// ends on the Sunday after (or on) the last day. Each cell is:
//   { iso: "YYYY-MM-DD", day: 14, inMonth: true, isToday: false }
// Always returns either 35 or 42 cells (5 or 6 rows), depending on
// month length and weekday alignment.
export function monthGridDays(monthIso) {
  const start = monthFromIso(monthIso);
  if (!start) return [];
  const monthIdx = start.getMonth();
  const todayIso = isoDateKey(new Date());

  // Work out the Monday on or before the 1st.
  const firstWeekday = start.getDay() || 7; // 1=Mon ... 7=Sun
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - (firstWeekday - 1));

  const cells = [];
  // Up to 42 cells; trim to 35 if the last row is fully out-of-month.
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = isoDateKey(d);
    cells.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === monthIdx,
      isToday: iso === todayIso,
    });
  }
  // If the last row is entirely outside the target month, drop it.
  if (cells.slice(35, 42).every(c => !c.inMonth)) cells.length = 35;
  return cells;
}

// All in-month ISO dates for the given month.
export function datesInMonth(monthIso) {
  const start = monthFromIso(monthIso);
  if (!start) return [];
  const monthIdx = start.getMonth();
  const out = [];
  const d = new Date(start);
  while (d.getMonth() === monthIdx) {
    out.push(isoDateKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Next n days starting today, as ISO date strings. Used by the
// recipe-page picker.
export function nextNDays(n) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(isoDateKey(d));
  }
  return out;
}
