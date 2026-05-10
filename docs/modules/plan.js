// Per-date meal plan. Each date (ISO YYYY-MM-DD) holds an ordered list
// of recipe slugs — free-form, no lunch/dinner labels. The calendar
// plan page reads and writes through these helpers; the older recipe
// page picker continues to work via the same loadDayPlan / addToDay /
// removeFromDay primitives.
//
// Storage:
//   storage.planDates.load() -> { "2026-05-14": ["slug1", "slug2"], ... }
//
// Migration: on first read, if planDates is empty, the old per-week
// shape (storage.planWeeks) is folded forward — for each (week, day,
// slot) pair, the actual ISO date is computed and slugs are appended in
// (lunch, dinner) order. The legacy single-week key is also picked up
// if present and assumed to be the current week.

import * as storage from './storage.js';
import { isoWeekKey, dateForIsoWeekDay } from './util/iso-week.js';
import { isoDateKey } from './util/iso-date.js';

// Kept as exports for back-compat: a couple of modules still import them.
// They're no longer used to key the plan data, but the names appear in
// other UIs (e.g. weekday labels in the picker fallback).
export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};
export const DAY_LABELS_SHORT = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

function emit() {
  try { window.dispatchEvent(new CustomEvent('plan:changed')); } catch {}
}

// One-time migration from per-week (and legacy single-key) plans into
// the new per-date map. Runs once per page load.
let migrationDone = false;
function migrateLegacyOnce() {
  if (migrationDone) return;
  migrationDone = true;
  const existing = storage.planDates.load();
  if (Object.keys(existing).length > 0) return;

  const all = storage.planWeeks.load();
  // If planWeeks is empty, fall back to the legacy single-week key —
  // pretend it lives in the current ISO week.
  let weeks = all;
  if (!weeks || Object.keys(weeks).length === 0) {
    const legacy = storage.plan.load();
    if (legacy && typeof legacy === 'object' && Object.keys(legacy).length > 0) {
      weeks = { [isoWeekKey()]: legacy };
    }
  }

  if (!weeks || Object.keys(weeks).length === 0) return;

  const out = {};
  for (const [weekIso, weekShape] of Object.entries(weeks)) {
    if (!weekShape || typeof weekShape !== 'object') continue;
    for (const dayName of DAYS) {
      const dayData = weekShape[dayName];
      if (!dayData) continue;
      const date = dateForIsoWeekDay(weekIso, dayName);
      if (!date) continue;
      const iso = isoDateKey(date);
      const slugs = [];
      if (Array.isArray(dayData)) {
        slugs.push(...dayData);
      } else if (typeof dayData === 'object') {
        if (Array.isArray(dayData.lunch)) slugs.push(...dayData.lunch);
        if (Array.isArray(dayData.dinner)) slugs.push(...dayData.dinner);
      }
      if (!slugs.length) continue;
      if (!out[iso]) out[iso] = [];
      for (const s of slugs) if (!out[iso].includes(s)) out[iso].push(s);
    }
  }

  if (Object.keys(out).length) storage.planDates.save(out);
}

// Returns the ordered slug list for a date. Always an array (empty when
// nothing planned).
export function loadDayPlan(isoDate) {
  migrateLegacyOnce();
  return storage.planDates.loadDate(isoDate);
}

// Replace the entire list for a date. Pass [] (or skip) to clear.
export function saveDayPlan(isoDate, list) {
  storage.planDates.saveDate(isoDate, list || []);
  emit();
}

// Append a slug to a date (no-op if already present). Returns true on add.
export function addToDay(isoDate, slug) {
  const list = loadDayPlan(isoDate);
  if (list.includes(slug)) return false;
  list.push(slug);
  saveDayPlan(isoDate, list);
  return true;
}

// Toggle a slug on a date. Returns true if the slug is present after.
export function toggleOnDay(isoDate, slug) {
  const list = loadDayPlan(isoDate);
  const idx = list.indexOf(slug);
  if (idx === -1) {
    list.push(slug);
    saveDayPlan(isoDate, list);
    return true;
  }
  list.splice(idx, 1);
  saveDayPlan(isoDate, list);
  return false;
}

// Remove every occurrence of a slug from a date. With `index` supplied,
// remove the entry at that index instead (allows duplicates if ever
// permitted).
export function removeFromDay(isoDate, slug, index) {
  const list = loadDayPlan(isoDate);
  if (typeof index === 'number' && list[index] === slug) {
    list.splice(index, 1);
  } else {
    const idx = list.indexOf(slug);
    if (idx === -1) return;
    list.splice(idx, 1);
  }
  saveDayPlan(isoDate, list);
}

// Reorder within a single day by moving the entry at fromIdx to toIdx.
export function reorderInDay(isoDate, fromIdx, toIdx) {
  const list = loadDayPlan(isoDate);
  if (fromIdx < 0 || fromIdx >= list.length) return;
  const clamped = Math.max(0, Math.min(toIdx, list.length - 1));
  if (clamped === fromIdx) return;
  const [slug] = list.splice(fromIdx, 1);
  list.splice(clamped, 0, slug);
  saveDayPlan(isoDate, list);
}

// Move a slug from one date to another. If the destination already has
// it, the source is removed (acts like a deduplicated move).
export function moveBetweenDays(fromIso, fromIdx, toIso, slug) {
  if (fromIso === toIso) return;
  const fromList = loadDayPlan(fromIso);
  if (typeof fromIdx === 'number' && fromList[fromIdx] === slug) {
    fromList.splice(fromIdx, 1);
  } else {
    const i = fromList.indexOf(slug);
    if (i !== -1) fromList.splice(i, 1);
  }
  saveDayPlan(fromIso, fromList);
  const toList = loadDayPlan(toIso);
  if (!toList.includes(slug)) toList.push(slug);
  saveDayPlan(toIso, toList);
}

export function clearDay(isoDate) {
  saveDayPlan(isoDate, []);
}

// Wipe every date whose ISO string starts with the given month prefix
// ("YYYY-MM").
export function clearMonth(monthIso) {
  const all = storage.planDates.load();
  let changed = false;
  for (const k of Object.keys(all)) {
    if (k.startsWith(monthIso + '-')) {
      delete all[k];
      changed = true;
    }
  }
  if (changed) {
    storage.planDates.save(all);
    emit();
  }
}

// Total slugs planned across the supplied list of ISO date strings.
export function totalForDates(isoDates) {
  let n = 0;
  for (const d of isoDates) n += loadDayPlan(d).length;
  return n;
}

// All ISO dates that have at least one planned recipe within the month.
// Used by the calendar to know which cells to render with a count badge.
export function plannedDatesInMonth(monthIso) {
  migrateLegacyOnce();
  const all = storage.planDates.load();
  return Object.keys(all)
    .filter(k => k.startsWith(monthIso + '-') && all[k] && all[k].length > 0)
    .sort();
}

// Look up a slug across the whole plan. Returns the array of ISO dates
// it appears on.
export function datesContaining(slug) {
  migrateLegacyOnce();
  const all = storage.planDates.load();
  const out = [];
  for (const [iso, list] of Object.entries(all)) {
    if (Array.isArray(list) && list.includes(slug)) out.push(iso);
  }
  out.sort();
  return out;
}
