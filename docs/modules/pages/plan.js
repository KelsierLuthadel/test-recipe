// Meal plan page (#/plan). Calendar-style: a month grid where each
// cell is a date. Clicking a cell opens a detail panel below the
// calendar showing that day's meals plus a single-day shopping list
// and a recipe drawer to drag from. With nothing selected, the
// shopping list aggregates the whole visible month.
//
// Storage is per-date free-form lists of recipe slugs. Drag-and-drop
// uses HTML5 DnD: drag from the drawer onto a calendar cell to add;
// drag a planned card to another cell to move; drag within the day
// detail panel to reorder. On touch the X-remove button covers
// delete.

import { state, setContent, els } from '../state.js';
import * as storage from '../storage.js';
import { escapeHtml, escapeAttr } from '../util/dom.js';
import { recipeHash, planHash, navigate } from '../routes.js';
import { rawUrl } from '../manifest.js';
import {
  loadDayPlan,
  saveDayPlan,
  addToDay,
  removeFromDay,
  reorderInDay,
  moveBetweenDays,
  clearDay,
  clearMonth,
  totalForDates,
  plannedDatesInMonth,
} from '../plan.js';
import { AISLE_KEYS, AISLE_LABELS, aisleFor } from '../aisles.js';
import {
  isoMonthKey,
  isoDateKey,
  isValidIsoMonth,
  isValidIsoDate,
  monthOfDate,
  addMonths,
  monthLabel,
  monthGridDays,
  datesInMonth,
  dateLongLabel,
  isCurrentMonth,
  isToday,
  WEEKDAY_HEADERS,
} from '../util/iso-date.js';

// Clicking anywhere outside the calendar (except on a button, link, or
// form control) deselects the current day and switches back to month
// view. Installed once on the persistent #content element so it
// survives renderPlan().
let outsideClickInstalled = false;
function installOutsideClickHandler() {
  if (outsideClickInstalled) return;
  outsideClickInstalled = true;
  els.content.addEventListener('click', (e) => {
    if (!els.content.querySelector('.plan-page')) return;
    const route = state.route || {};
    if (!isValidIsoDate(route.date)) return;
    // Don't fire when the click is inside the calendar itself (cells
    // already navigate via their hrefs) or on something that does its
    // own thing (anchors, buttons, inputs, labels).
    if (e.target.closest('.plan-cal')) return;
    if (e.target.closest('a, button, input, label, select, textarea')) return;
    e.preventDefault();
    navigate(planHash({ month: monthOfDate(route.date) }));
  });
}

export function renderPlan() {
  const route = state.route || {};
  const requestedDate = isValidIsoDate(route.date) ? route.date : null;
  const requestedMonth = requestedDate
    ? monthOfDate(requestedDate)
    : (isValidIsoMonth(route.month) ? route.month : isoMonthKey());

  const monthIso = requestedMonth;
  const selectedDate = requestedDate;

  const cells = monthGridDays(monthIso);
  const monthDates = datesInMonth(monthIso);
  const monthMealsCount = totalForDates(monthDates);
  const drawerHtml = renderPlanDrawer();
  const monthGridHtml = renderMonthGrid(cells, selectedDate);
  const detailHtml = selectedDate ? renderDayDetail(selectedDate) : '';
  const shoppingHtml = selectedDate
    ? renderShoppingList(loadDayPlan(selectedDate), `Shopping list for ${dateLongLabel(selectedDate)}`)
    : (monthMealsCount > 0
      ? renderShoppingList(monthSlugs(monthDates), `Shopping list for ${monthLabel(monthIso)}`)
      : renderShoppingPlaceholder());

  const prevMonthHash = planHash({ month: addMonths(monthIso, -1) });
  const nextMonthHash = planHash({ month: addMonths(monthIso, 1) });
  const todayMonthHash = planHash();
  const isThisMonth = isCurrentMonth(monthIso);
  const subText = selectedDate
    ? `Viewing ${dateLongLabel(selectedDate)}. Drag a recipe from the drawer below into the day, or click another date in the calendar to switch.`
    : (monthMealsCount
      ? `${monthMealsCount} meal${monthMealsCount === 1 ? '' : 's'} planned this month. Click a date to plan or review it.`
      : 'Click a date to start planning, then drag recipes from the drawer below.');

  setContent(`
    <div class="fade-in plan-page" data-month="${escapeAttr(monthIso)}">
      <header class="page-header">
        <div class="page-eyebrow">${isThisMonth ? 'This month' : 'Calendar'}</div>
        <h1 class="page-title">Meal plan</h1>
        <p class="page-sub">${subText}</p>
      </header>

      <div class="plan-month-nav" role="toolbar" aria-label="Month navigation">
        <a class="plan-month-nav-btn" href="${prevMonthHash}" aria-label="Previous month">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        </a>
        <h2 class="plan-month-nav-label">${escapeHtml(monthLabel(monthIso))}</h2>
        <a class="plan-month-nav-btn" href="${nextMonthHash}" aria-label="Next month">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><polyline points="9 6 15 12 9 18"/></svg>
        </a>
        ${isThisMonth ? '' : `<a class="plan-month-nav-today" href="${todayMonthHash}">Today</a>`}
        ${monthMealsCount ? `<button type="button" class="plan-clear-btn" id="plan-clear-month-btn">Clear month</button>` : ''}
      </div>

      ${monthGridHtml}

      ${detailHtml}

      ${drawerHtml}

      <aside class="plan-aside">${shoppingHtml}</aside>
    </div>
  `);

  bindPlanActions(monthIso, selectedDate);
  bindPlanDrawer(monthIso, selectedDate);
  installOutsideClickHandler();
}

// Calendar grid: weekday headers + 35/42 date cells.
function renderMonthGrid(cells, selectedDate) {
  const headerHtml = WEEKDAY_HEADERS.map(d =>
    `<div class="plan-cal-header">${escapeHtml(d)}</div>`,
  ).join('');
  const cellsHtml = cells.map(c => renderCell(c, selectedDate)).join('');
  return `
    <div class="plan-cal" role="grid">
      <div class="plan-cal-row plan-cal-row-head">${headerHtml}</div>
      <div class="plan-cal-grid">${cellsHtml}</div>
    </div>
  `;
}

function renderCell(c, selectedDate) {
  const list = loadDayPlan(c.iso);
  const count = list.length;
  const classes = [
    'plan-cal-cell',
    c.inMonth ? 'is-in-month' : 'is-out-month',
    c.isToday ? 'is-today' : '',
    selectedDate === c.iso ? 'is-selected' : '',
    count ? 'has-meals' : '',
  ].filter(Boolean).join(' ');
  const href = planHash({ date: c.iso });
  const badge = count
    ? `<span class="plan-cal-cell-count">${count}</span>`
    : '';
  return `<a class="${classes}" href="${href}" data-date="${escapeAttr(c.iso)}" role="gridcell" aria-label="${escapeAttr(`${c.day} — ${count} meal${count === 1 ? '' : 's'} planned`)}">
    <span class="plan-cal-cell-day">${c.day}</span>
    ${badge}
  </a>`;
}

// Detail panel for the selected day. Lists each planned recipe with
// drag-reorder + remove. Each card is a small recipe pill so the user
// can re-arrange (or move to another date).
function renderDayDetail(isoDate) {
  const list = loadDayPlan(isoDate);
  const itemsHtml = list.length
    ? list.map((slug, idx) => renderPlannedItem(isoDate, idx, slug)).join('')
    : '<li class="plan-day-empty">No meals planned. Drag a recipe from the drawer below into this day.</li>';
  const goBackHash = planHash({ month: monthOfDate(isoDate) });
  return `
    <section class="plan-day-detail" data-date="${escapeAttr(isoDate)}">
      <header class="plan-day-detail-head">
        <h3 class="plan-day-detail-title">${escapeHtml(dateLongLabel(isoDate))}</h3>
        <div class="plan-day-detail-actions">
          ${list.length ? `<button type="button" class="plan-day-clear-btn" id="plan-day-clear-btn">Clear day</button>` : ''}
          <a class="plan-day-back" href="${goBackHash}">Back to month</a>
        </div>
      </header>
      <ul class="plan-day-list" data-date="${escapeAttr(isoDate)}">${itemsHtml}</ul>
    </section>
  `;
}

function renderPlannedItem(isoDate, index, slug) {
  const r = state.recipeBySlug.get(slug);
  if (!r) return '';
  const imgHtml = r.image
    ? `<img class="plan-day-item-img" src="${escapeAttr(rawUrl(r.image))}" alt="" loading="lazy" draggable="false">`
    : `<span class="plan-day-item-img is-empty" aria-hidden="true"></span>`;
  return `
    <li class="plan-day-item" draggable="true" data-date="${escapeAttr(isoDate)}" data-index="${index}" data-slug="${escapeAttr(slug)}">
      <span class="plan-item-handle" aria-hidden="true">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="2.5" cy="2" r="1.2"/><circle cx="7.5" cy="2" r="1.2"/><circle cx="2.5" cy="7" r="1.2"/><circle cx="7.5" cy="7" r="1.2"/><circle cx="2.5" cy="12" r="1.2"/><circle cx="7.5" cy="12" r="1.2"/></svg>
      </span>
      ${imgHtml}
      <a class="plan-day-item-link" href="${recipeHash(slug)}">${escapeHtml(r.title)}</a>
      <button type="button" class="plan-item-remove" data-date="${escapeAttr(isoDate)}" data-index="${index}" data-slug="${escapeAttr(slug)}" aria-label="Remove ${escapeHtml(r.title)}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </li>
  `;
}

// Aggregate slugs for shopping list. Returns a flat array of slugs
// across the supplied date range (with duplicates kept — a recipe
// cooked twice means doubled ingredients).
function monthSlugs(isoDates) {
  const out = [];
  for (const d of isoDates) {
    const list = loadDayPlan(d);
    for (const s of list) out.push(s);
  }
  return out;
}

function renderShoppingPlaceholder() {
  return `
    <div class="plan-shopping-empty">
      <div class="plan-shopping-empty-title">Shopping list</div>
      <p class="plan-shopping-empty-text">Plan some meals and the shopping list will appear here, grouped by aisle. With a day selected the list narrows to that day's ingredients; otherwise it covers the whole month.</p>
    </div>
  `;
}

// Group ingredient counts by aisle and render a tickable list. `slugs`
// is a flat array; duplicates are preserved (so a recipe cooked twice
// counts twice).
function renderShoppingList(slugs, titleText) {
  const counts = new Map();
  for (const slug of slugs) {
    const recipe = state.recipeBySlug.get(slug);
    if (!recipe || !Array.isArray(recipe.ingredientNames)) continue;
    for (const name of recipe.ingredientNames) {
      if (!counts.has(name)) counts.set(name, { name, occurrences: 0, recipes: new Set() });
      const entry = counts.get(name);
      entry.occurrences += 1;
      entry.recipes.add(recipe.title);
    }
  }
  if (!counts.size) return renderShoppingPlaceholder();

  const ticks = storage.shoppingTicks.load();
  const byAisle = new Map();
  for (const aisle of AISLE_KEYS) byAisle.set(aisle, []);
  for (const e of counts.values()) {
    byAisle.get(aisleFor(e.name)).push(e);
  }
  for (const list of byAisle.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  const totalItems = counts.size;

  const sectionsHtml = AISLE_KEYS.map(aisle => {
    const list = byAisle.get(aisle);
    if (!list.length) return '';
    const itemsHtml = list.map(e => {
      const titles = [...e.recipes];
      const fromLine = titles.length === 1
        ? titles[0]
        : `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]}`;
      const count = e.occurrences > 1 ? ` <span class="plan-shopping-count">x${e.occurrences}</span>` : '';
      const ticked = ticks.has(e.name);
      const id = `tick-${aisle}-${e.name.replace(/[^a-z0-9]/gi, '-')}`;
      return `<li class="plan-shopping-item ${ticked ? 'is-ticked' : ''}">
        <input type="checkbox" id="${escapeAttr(id)}" class="plan-shopping-tick" data-name="${escapeAttr(e.name)}" ${ticked ? 'checked' : ''} aria-label="Mark ${escapeAttr(displayName(e.name))} as bought">
        <label for="${escapeAttr(id)}" class="plan-shopping-body">
          <span class="plan-shopping-name">${escapeHtml(displayName(e.name))}${count}</span>
          <span class="plan-shopping-from">${escapeHtml(fromLine)}</span>
        </label>
      </li>`;
    }).join('');
    return `
      <div class="plan-shopping-aisle" data-aisle="${escapeAttr(aisle)}">
        <h3 class="plan-shopping-aisle-label">${escapeHtml(AISLE_LABELS[aisle])} <span class="plan-shopping-aisle-count">${list.length}</span></h3>
        <ul class="plan-shopping-list">${itemsHtml}</ul>
      </div>
    `;
  }).join('');

  return `
    <section class="section">
      <div class="section-head">
        <h2 class="section-title">${escapeHtml(titleText || 'Shopping list')}</h2>
        <span class="section-meta">${totalItems} item${totalItems === 1 ? '' : 's'}</span>
      </div>
      <p class="page-meta plan-shopping-note">Grouped by supermarket aisle. Tick items as you shop — your progress is saved in this browser.</p>
      ${sectionsHtml}
      <div class="plan-shopping-actions">
        <button type="button" class="plan-shopping-reset-btn" id="plan-shopping-reset-btn">Reset ticks</button>
        <button type="button" class="plan-shopping-copy-btn" id="plan-shopping-copy-btn">Copy as text</button>
      </div>
    </section>
  `;
}

function displayName(canon) {
  if (!canon) return '';
  return canon.charAt(0).toUpperCase() + canon.slice(1);
}

// --- Drawer (recipe source) -------------------------------------------------

const DRAWER_TABS = [
  { id: 'recent', label: 'Recent' },
  { id: 'favourites', label: 'Favourites' },
  { id: 'all', label: 'All' },
];
let drawerTab = 'recent';
let drawerQuery = '';

const NON_MEAL_TOP = new Set([
  'base-ingredients', 'sauces', 'coulis', 'sponge', 'salsa',
  'spices', 'spice-mixes', 'stocks', 'vinaigrette',
]);
const NON_MEAL_PATH = /(?:^|\/)(?:spices|spice-mixes|sauces-pickles|pastes|base|stocks|coulis)(?:\/|$)/i;
function isMealRecipe(r) {
  const top = (r.path || '').split('/')[0];
  if (NON_MEAL_TOP.has(top)) return false;
  if (NON_MEAL_PATH.test(r.path || '')) return false;
  return true;
}

function renderPlanDrawer() {
  const tabsHtml = DRAWER_TABS.map(t =>
    `<button type="button" class="plan-drawer-tab ${drawerTab === t.id ? 'is-active' : ''}" data-tab="${escapeAttr(t.id)}" aria-pressed="${drawerTab === t.id}">${escapeHtml(t.label)}</button>`,
  ).join('');
  const recipes = drawerCandidates();
  const cardsHtml = recipes.length
    ? recipes.slice(0, 60).map(r => renderDrawerCard(r)).join('')
    : `<span class="plan-drawer-empty">${drawerEmptyText()}</span>`;
  const searchHtml = drawerTab === 'all'
    ? `<input type="search" id="plan-drawer-search" class="plan-drawer-search" placeholder="Search ${state.flatRecipes.length} recipes" value="${escapeAttr(drawerQuery)}" autocomplete="off">`
    : '';
  return `
    <div class="plan-drawer" aria-label="Recipe drawer">
      <div class="plan-drawer-head">
        <span class="plan-drawer-title">Drag a recipe onto a date</span>
        <div class="plan-drawer-tabs" role="tablist">${tabsHtml}</div>
      </div>
      ${searchHtml}
      <div class="plan-drawer-strip" id="plan-drawer-strip">${cardsHtml}</div>
    </div>
  `;
}

function drawerCandidates() {
  if (drawerTab === 'recent') {
    return state.recent.map(s => state.recipeBySlug.get(s)).filter(Boolean);
  }
  if (drawerTab === 'favourites') {
    return [...state.favourites].map(s => state.recipeBySlug.get(s)).filter(Boolean);
  }
  const q = drawerQuery.trim().toLowerCase();
  if (!q) {
    const seen = new Set();
    const out = [];
    const push = r => { if (r && isMealRecipe(r) && !seen.has(r.slug)) { seen.add(r.slug); out.push(r); } };
    state.recent.slice(0, 8).forEach(s => push(state.recipeBySlug.get(s)));
    [...state.favourites].slice(0, 8).forEach(s => push(state.recipeBySlug.get(s)));
    Object.entries(state.ratings || {})
      .filter(([, v]) => v >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([s]) => push(state.recipeBySlug.get(s)));
    return out;
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  const out = [];
  for (const r of state.flatRecipes) {
    if (!isMealRecipe(r)) continue;
    const hay = (r.title + ' ' + (r.overview || '') + ' ' + (r.tags || []).join(' ')).toLowerCase();
    if (tokens.every(t => hay.includes(t))) out.push(r);
    if (out.length >= 60) break;
  }
  return out;
}

function drawerEmptyText() {
  if (drawerTab === 'recent') return 'No recently-viewed recipes yet. Open a few first.';
  if (drawerTab === 'favourites') return 'No favourites yet. Tap the heart on any recipe.';
  return drawerQuery ? 'No matches.' : 'Type to search.';
}

function renderDrawerCard(r) {
  const imgHtml = r.image
    ? `<img class="plan-drawer-card-img" src="${escapeAttr(rawUrl(r.image))}" alt="" loading="lazy" draggable="false">`
    : `<span class="plan-drawer-card-img is-empty" aria-hidden="true"></span>`;
  return `<div class="plan-drawer-card" draggable="true" role="button" tabindex="0" data-source="drawer" data-slug="${escapeAttr(r.slug)}" title="${escapeAttr(r.title)}" aria-label="Drag ${escapeAttr(r.title)} into a date">
    ${imgHtml}
    <span class="plan-drawer-card-title">${escapeHtml(r.title)}</span>
  </div>`;
}

function bindPlanDrawer(monthIso, selectedDate) {
  const drawer = els.content.querySelector('.plan-drawer');
  if (!drawer) return;

  drawer.querySelectorAll('.plan-drawer-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      drawerTab = btn.dataset.tab;
      drawerQuery = '';
      const fresh = renderPlanDrawer();
      const wrap = document.createElement('div');
      wrap.innerHTML = fresh;
      drawer.replaceWith(wrap.firstElementChild);
      bindPlanDrawer(monthIso, selectedDate);
    });
  });

  const search = drawer.querySelector('#plan-drawer-search');
  if (search) {
    let timer = null;
    search.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        drawerQuery = search.value;
        const strip = drawer.querySelector('#plan-drawer-strip');
        const recipes = drawerCandidates();
        strip.innerHTML = recipes.length
          ? recipes.slice(0, 60).map(r => renderDrawerCard(r)).join('')
          : `<span class="plan-drawer-empty">${drawerEmptyText()}</span>`;
        bindDrawerCards(drawer);
      }, 90);
    });
    search.focus();
    search.setSelectionRange(search.value.length, search.value.length);
  }

  bindDrawerCards(drawer);
}

function bindDrawerCards(drawer) {
  drawer.querySelectorAll('.plan-drawer-card[draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      const payload = { source: 'drawer', slug: card.dataset.slug };
      e.dataTransfer.effectAllowed = 'all';
      try { e.dataTransfer.setData('application/x-plan-item', JSON.stringify(payload)); } catch {}
      try { e.dataTransfer.setData('text/plain', payload.slug); } catch {}
      card.classList.add('is-dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      els.content.querySelectorAll('.plan-cal-cell, .plan-day-list, .plan-day-item').forEach(s => s.classList.remove('is-drop-target'));
    });
  });
}

// --- Bindings -------------------------------------------------------------

function bindPlanActions(monthIso, selectedDate) {
  // Per-item remove
  els.content.querySelectorAll('.plan-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index, 10);
      removeFromDay(btn.dataset.date, btn.dataset.slug, idx);
      renderPlan();
    });
  });

  // Calendar cell drop targets
  bindCellDrops(monthIso, selectedDate);

  // Day-detail drop target (drag onto the list to add to selected day)
  bindDayListDrop(selectedDate);

  // Reorder within day via drag-and-drop on the planned items
  bindPlannedItemDnD(selectedDate);

  // Clear-month
  const clearMonthBtn = document.getElementById('plan-clear-month-btn');
  if (clearMonthBtn) {
    clearMonthBtn.addEventListener('click', () => {
      if (!window.confirm(`Clear every meal from ${monthLabel(monthIso)}?`)) return;
      clearMonth(monthIso);
      renderPlan();
    });
  }

  // Clear-day (when a day is selected)
  const clearDayBtn = document.getElementById('plan-day-clear-btn');
  if (clearDayBtn && selectedDate) {
    clearDayBtn.addEventListener('click', () => {
      if (!window.confirm(`Clear ${dateLongLabel(selectedDate)}?`)) return;
      clearDay(selectedDate);
      renderPlan();
    });
  }

  // Shopping list ticks
  els.content.querySelectorAll('.plan-shopping-tick').forEach(cb => {
    cb.addEventListener('change', () => {
      const ticks = storage.shoppingTicks.load();
      const name = cb.dataset.name;
      if (cb.checked) ticks.add(name);
      else ticks.delete(name);
      storage.shoppingTicks.save(ticks);
      const li = cb.closest('.plan-shopping-item');
      if (li) li.classList.toggle('is-ticked', cb.checked);
    });
  });

  const resetBtn = document.getElementById('plan-shopping-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      storage.shoppingTicks.save(new Set());
      renderPlan();
    });
  }

  const copyBtn = document.getElementById('plan-shopping-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const slugs = selectedDate
        ? loadDayPlan(selectedDate)
        : monthSlugs(datesInMonth(monthIso));
      copyShoppingListText(slugs, copyBtn);
    });
  }
}

// Calendar cells accept drops from the drawer (add) and from other
// cells / day-list items (move).
function bindCellDrops(monthIso, selectedDate) {
  els.content.querySelectorAll('.plan-cal-cell').forEach(cell => {
    cell.addEventListener('dragenter', (e) => {
      e.preventDefault();
      cell.classList.add('is-drop-target');
    });
    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    cell.addEventListener('dragleave', (e) => {
      if (e.target === cell) cell.classList.remove('is-drop-target');
    });
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('is-drop-target');
      const payload = readDragPayload(e);
      if (!payload || !payload.slug) return;
      const targetDate = cell.dataset.date;
      if (payload.source === 'drawer') {
        addToDay(targetDate, payload.slug);
      } else {
        moveBetweenDays(payload.date, payload.index, targetDate, payload.slug);
      }
      renderPlan();
    });
  });
}

function bindDayListDrop(selectedDate) {
  if (!selectedDate) return;
  const list = els.content.querySelector('.plan-day-list');
  if (!list) return;
  list.addEventListener('dragenter', (e) => {
    e.preventDefault();
    list.classList.add('is-drop-target');
  });
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });
  list.addEventListener('dragleave', (e) => {
    if (e.target === list) list.classList.remove('is-drop-target');
  });
  list.addEventListener('drop', (e) => {
    e.preventDefault();
    list.classList.remove('is-drop-target');
    const payload = readDragPayload(e);
    if (!payload || !payload.slug) return;
    if (payload.source === 'drawer') {
      addToDay(selectedDate, payload.slug);
    } else if (payload.date && payload.date !== selectedDate) {
      moveBetweenDays(payload.date, payload.index, selectedDate, payload.slug);
    }
    renderPlan();
  });
}

function bindPlannedItemDnD(selectedDate) {
  const items = els.content.querySelectorAll('.plan-day-item[draggable="true"]');
  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      const payload = {
        source: 'planned',
        date: item.dataset.date,
        index: parseInt(item.dataset.index, 10),
        slug: item.dataset.slug,
      };
      e.dataTransfer.effectAllowed = 'all';
      try { e.dataTransfer.setData('application/x-plan-item', JSON.stringify(payload)); } catch {}
      try { e.dataTransfer.setData('text/plain', payload.slug); } catch {}
      item.classList.add('is-dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('is-dragging');
      els.content.querySelectorAll('.plan-day-item').forEach(s => s.classList.remove('is-drop-target'));
    });

    // Each item is also a drop target for in-day reordering.
    item.addEventListener('dragenter', (e) => {
      e.preventDefault();
      item.classList.add('is-drop-target');
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    item.addEventListener('dragleave', (e) => {
      if (e.target === item) item.classList.remove('is-drop-target');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.classList.remove('is-drop-target');
      const payload = readDragPayload(e);
      if (!payload || !payload.slug) return;
      const targetIdx = parseInt(item.dataset.index, 10);
      if (payload.source === 'drawer') {
        addToDay(item.dataset.date, payload.slug);
      } else if (payload.date === item.dataset.date) {
        // Reorder within same day.
        reorderInDay(item.dataset.date, payload.index, targetIdx);
      } else {
        moveBetweenDays(payload.date, payload.index, item.dataset.date, payload.slug);
      }
      renderPlan();
    });
  });
}

function readDragPayload(e) {
  try {
    const raw = e.dataTransfer.getData('application/x-plan-item');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function copyShoppingListText(slugs, btn) {
  const counts = new Map();
  for (const slug of slugs) {
    const r = state.recipeBySlug.get(slug);
    if (!r || !Array.isArray(r.ingredientNames)) continue;
    for (const name of r.ingredientNames) {
      if (!counts.has(name)) counts.set(name, { name, occurrences: 0, recipes: new Set() });
      const entry = counts.get(name);
      entry.occurrences += 1;
      entry.recipes.add(r.title);
    }
  }
  const sorted = [...counts.values()].sort((a, b) =>
    b.occurrences - a.occurrences || a.name.localeCompare(b.name),
  );
  const lines = ['Meal plan shopping list', ''];
  for (const e of sorted) {
    const fromLine = [...e.recipes].join(', ');
    const cnt = e.occurrences > 1 ? ` (x${e.occurrences})` : '';
    lines.push(`- ${displayName(e.name)}${cnt} - ${fromLine}`);
  }
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = 'Copy as text'; }, 1500);
  } catch {
    btn.textContent = 'Copy failed';
    setTimeout(() => { btn.textContent = 'Copy as text'; }, 1500);
  }
}
