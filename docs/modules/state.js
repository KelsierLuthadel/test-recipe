// Shared singleton state for the app: DOM element refs, the manifest-derived
// `state` object, and small mutators that touch it. Everything that mutates state
// goes through this module so callers don't reach into localStorage directly.

import * as storage from './storage.js';
import { RECENT_LIMIT } from './storage.js';

export const els = {
  sidebar: document.getElementById('sidebar'),
  sidebarNav: document.getElementById('sidebar-nav'),
  scrim: document.getElementById('sidebar-scrim'),
  menuToggle: document.getElementById('menu-toggle'),
  sidebarClose: document.getElementById('sidebar-close'),
  breadcrumb: document.getElementById('breadcrumb'),
  content: document.getElementById('content'),
  searchInput: document.getElementById('search-input'),
  repoLink: document.getElementById('repo-link'),
  manifestStats: document.getElementById('manifest-stats'),
  cardTpl: document.getElementById('tpl-recipe-card'),
};

export const HOME_SECTION_DEFS = [
  { id: 'favourites', label: 'Favourites',         defaultOn: true,  href: '#/favourites' },
  { id: 'recent',     label: 'Recently viewed',    defaultOn: true,  href: '#/recent' },
  { id: 'top-rated',  label: 'Top rated',          defaultOn: true,  href: '#/top-rated' },
  { id: 'notes',      label: 'Recipes with notes', defaultOn: false, href: '#/notes' },
  { id: 'cooked',     label: 'Cooked',             defaultOn: false, href: '#/cooked' },
];

export function loadHomeSections() {
  const stored = storage.homeSections.load();
  if (stored) return stored;
  return new Set(HOME_SECTION_DEFS.filter(s => s.defaultOn).map(s => s.id));
}
export function saveHomeSections() {
  storage.homeSections.save(state.homeSections);
}

export const state = {
  manifest: null,
  flatRecipes: [],
  nodeByPath: new Map(),     // path -> category node
  recipeBySlug: new Map(),   // slug -> recipe
  recipeContent: new Map(),  // slug -> rendered markdown promise/string
  expanded: new Set(),       // category paths whose nav children are open
  favourites: storage.favourites.load(),
  recent: storage.recent.load(),
  ratings: storage.ratings.load(),
  notesSlugs: storage.notes.allSlugs(),
  homeSections: loadHomeSections(),
  route: { name: 'home' },
};

export function toggleFavourite(slug) {
  if (state.favourites.has(slug)) state.favourites.delete(slug);
  else state.favourites.add(slug);
  storage.favourites.save(state.favourites);
}

export function getCooked(slug) {
  return storage.cooked.load()[slug] || null;
}
export function toggleCooked(slug) {
  const map = storage.cooked.load();
  if (map[slug]) delete map[slug];
  else map[slug] = { last: new Date().toISOString() };
  storage.cooked.save(map);
  return map[slug] || null;
}

export function getRating(slug) {
  const map = storage.ratings.load();
  const v = parseInt(map[slug], 10);
  return Number.isFinite(v) && v >= 1 && v <= 5 ? v : 0;
}
export function setRating(slug, value) {
  const map = storage.ratings.load();
  if (!Number.isFinite(value) || value <= 0 || value > 5) delete map[slug];
  else map[slug] = value;
  storage.ratings.save(map);
  state.ratings = map;
}

export function recordRecent(slug) {
  state.recent = [slug, ...state.recent.filter(s => s !== slug)].slice(0, RECENT_LIMIT);
  storage.recent.save(state.recent);
}

// Replaces the main #content area's HTML and scrolls to top. Every page render
// terminates in this call so any in-flight scroll position is reset.
export function setContent(html) {
  els.content.innerHTML = html;
  els.content.scrollTop = 0;
  window.scrollTo(0, 0);
}
