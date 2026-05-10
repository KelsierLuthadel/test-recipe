// ISO 8601 week helpers for the meal-plan page. Weeks start Monday;
// week 1 of any year is the week containing 4 January.

import { DAYS } from '../plan.js';

// Returns "YYYY-Www" for the given Date (default: now).
export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Returns true when the string looks like "YYYY-Www".
export function isValidIsoWeek(s) {
  return typeof s === 'string' && /^\d{4}-W\d{2}$/.test(s);
}

// Date for a specific weekday within an ISO week. dayName is one of the
// strings in DAYS ('monday' .. 'sunday'); returns null on bad input.
export function dateForIsoWeekDay(iso, dayName) {
  const m = String(iso).match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  const dayIdx = DAYS.indexOf(dayName);
  if (dayIdx === -1) return null;
  // 4 January is always in ISO week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  const result = new Date(week1Monday);
  result.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7 + dayIdx);
  return result;
}

// Shift an ISO week key by a number of weeks (positive = future).
export function addWeeks(iso, n) {
  const monday = dateForIsoWeekDay(iso, 'monday');
  if (!monday) return iso;
  monday.setUTCDate(monday.getUTCDate() + n * 7);
  return isoWeekKey(monday);
}

// Returns true when the supplied iso week is the same as the current
// real-world ISO week.
export function isCurrentWeek(iso) {
  return iso === isoWeekKey(new Date());
}

// Returns "today" as a weekday string ('monday'..'sunday') if it falls
// within the supplied ISO week; otherwise null.
export function todayInIsoWeek(iso) {
  if (!isCurrentWeek(iso)) return null;
  const day = new Date().getDay() || 7;
  return DAYS[day - 1];
}

// Short label like "12-18 May" for a week range. Uses the user's locale.
export function isoWeekRangeLabel(iso) {
  const monday = dateForIsoWeekDay(iso, 'monday');
  const sunday = dateForIsoWeekDay(iso, 'sunday');
  if (!monday || !sunday) return iso;
  const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
  if (monday.getUTCMonth() === sunday.getUTCMonth() && monday.getUTCFullYear() === sunday.getUTCFullYear()) {
    return `${monday.getUTCDate()}–${fmt.format(sunday)}`;
  }
  return `${fmt.format(monday)} – ${fmt.format(sunday)}`;
}

// Day-with-date label like "Mon 12 May".
export function dayLabel(iso, dayName) {
  const d = dateForIsoWeekDay(iso, dayName);
  if (!d) return dayName;
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}
