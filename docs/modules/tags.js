// Recipe tag taxonomy: short labels for the flags we surface in the UI
// plus the chip-row HTML used at the top of category, home, and search
// pages so users can toggle filters in/out of the URL.

import { escapeHtml } from './util/dom.js';

export const TAG_LABELS = {
  // diet
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  'gluten-free': 'Gluten-free',
  'dairy-free': 'Dairy-free',
  // course / category
  meals: 'Meals',
  asian: 'Asian',
  baking: 'Baking',
  sides: 'Sides',
  salsa: 'Salsa',
  dessert: 'Dessert',
  curry: 'Curry',
  // prep / method
  quick: 'Quick',
  complex: 'Complex',
  'make-ahead': 'Make-ahead',
  'one-pan': 'One pan',
  'no-cook': 'No cook',
  // main ingredient
  meat: 'Meat',
  chicken: 'Chicken',
  beef: 'Beef',
  pork: 'Pork',
  lamb: 'Lamb',
  duck: 'Duck',
  fish: 'Fish',
  prawn: 'Prawn',
  salmon: 'Salmon',
  spicy: 'Spicy',
  // building blocks
  spices: 'Spices',
  pastes: 'Pastes',
};
// Display order for the chip row. Tags not in this list are tucked at
// the end alphabetically.
export const TAG_ORDER = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free',
  'meals', 'asian', 'baking', 'sides', 'salsa', 'dessert', 'curry',
  'quick', 'complex', 'make-ahead', 'one-pan', 'no-cook',
  'meat', 'chicken', 'beef', 'pork', 'lamb', 'duck',
  'fish', 'prawn', 'salmon',
  'spicy',
  'spices', 'pastes',
];

// Group taxonomy for the chip filter bar. Each group renders as its own
// row with a label and a slightly different accent so the user can
// quickly scan by intent. Tags not assigned here fall into 'other' and
// land at the bottom (lets newly-introduced build tags surface without
// a code change).
export const TAG_GROUP_ORDER = ['diet', 'course', 'ingredient', 'other'];
export const TAG_GROUP_LABELS = {
  diet:       'Diet & speed',
  course:     'Course & method',
  ingredient: 'Ingredients',
  other:      'Other',
};
export const TAG_GROUPS = {
  // diet / speed / dietary constraints - green tint
  vegetarian:    'diet',
  vegan:         'diet',
  'gluten-free': 'diet',
  'dairy-free':  'diet',
  quick:         'diet',
  complex:       'diet',
  spicy:         'diet',

  // course / method / cuisine character - blue tint
  meals:        'course',
  baking:       'course',
  dessert:      'course',
  sides:        'course',
  salsa:        'course',
  curry:        'course',
  asian:        'course',
  'no-cook':    'course',
  'make-ahead': 'course',
  'one-pan':    'course',
  spices:       'course',
  pastes:       'course',

  // protein / main ingredient - red tint
  meat:    'ingredient',
  chicken: 'ingredient',
  beef:    'ingredient',
  pork:    'ingredient',
  lamb:    'ingredient',
  duck:    'ingredient',
  fish:    'ingredient',
  prawn:   'ingredient',
  salmon:  'ingredient',
};

// Build the chip row that lets the user filter the current view by tag.
// hashBuilder(tags) returns the URL for a given list of active tags, so
// the same component works on the category, search, and discover pages.
//
// candidates: the recipe set after applying activeTags (drives counts).
// basePool: the broader recipe set that drives which chips appear.
//   Default = candidates, which means tags absent from the candidate
//   set are dropped (used by discover - keeps the chip row tight).
//   Pass basePool != candidates (e.g. the full category) to keep all
//   chips visible and grey out the ones whose candidate count is 0,
//   so the user sees what the page can offer at a glance.
export function tagFilterHtml(candidates, activeTags, hashBuilder, basePool = candidates) {
  const active = Array.isArray(activeTags) ? activeTags : [];
  const candidateCounts = {};
  for (const r of candidates) for (const t of r.tags || []) candidateCounts[t] = (candidateCounts[t] || 0) + 1;

  // Chip set comes from basePool, which may be wider than candidates.
  // Always include selected tags so the user can see (and remove) them
  // even if they somehow don't appear in basePool.
  const baseTags = new Set();
  for (const r of basePool) for (const t of r.tags || []) baseTags.add(t);
  for (const t of active) baseTags.add(t);

  const known = TAG_ORDER.filter(t => baseTags.has(t));
  // Surface unknown / not-yet-listed tags at the end so a new tag added
  // by the build script shows up automatically without code changes.
  const extra = [...baseTags]
    .filter(t => !TAG_ORDER.includes(t))
    .sort();
  const available = [...known, ...extra];
  if (!available.length) return '';

  // Bucket each available tag into its group. Unknown groups fall under
  // 'other' so the chip still renders.
  const grouped = new Map();
  for (const g of TAG_GROUP_ORDER) grouped.set(g, []);
  for (const t of available) {
    const g = TAG_GROUPS[t] || 'other';
    if (!grouped.has(g)) grouped.set(g, []);
    grouped.get(g).push(t);
  }

  const chipFor = (t) => {
    const isOn = active.includes(t);
    const count = candidateCounts[t] || 0;
    const label = TAG_LABELS[t] || t;
    const group = TAG_GROUPS[t] || 'other';
    // A non-selected chip with 0 candidates can't usefully be added, so
    // we render it as a non-interactive span instead of a link.
    if (!isOn && count === 0) {
      return `<span class="tag-chip is-disabled" data-group="${escapeHtml(group)}" aria-disabled="true">${escapeHtml(label)} <span class="tag-chip-count">0</span></span>`;
    }
    const next = isOn ? active.filter(x => x !== t) : [...active, t];
    return `<a class="tag-chip ${isOn ? 'is-active' : ''}" data-group="${escapeHtml(group)}" href="${hashBuilder(next)}">${escapeHtml(label)} <span class="tag-chip-count">${count}</span></a>`;
  };

  const allChip = `<a class="tag-chip ${active.length === 0 ? 'is-active' : ''}" data-group="all" href="${hashBuilder([])}">All <span class="tag-chip-count">${candidates.length}</span></a>`;

  const groupRows = TAG_GROUP_ORDER
    .map(g => {
      const tags = grouped.get(g) || [];
      if (!tags.length) return '';
      const label = TAG_GROUP_LABELS[g] || g;
      const chips = tags.map(chipFor).join('');
      return `<div class="tag-filter-group" data-group="${escapeHtml(g)}"><span class="tag-filter-group-label">${escapeHtml(label)}</span><div class="tag-filter-group-chips">${chips}</div></div>`;
    })
    .filter(Boolean)
    .join('');

  return `
    <div class="tag-filters" role="toolbar" aria-label="Filter by tag">
      <div class="tag-filter-group tag-filter-group-all"><span class="tag-filter-group-label">Filter</span><div class="tag-filter-group-chips">${allChip}</div></div>
      ${groupRows}
    </div>
  `;
}
