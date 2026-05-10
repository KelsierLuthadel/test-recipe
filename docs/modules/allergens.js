// Shared allergen helpers. Patterns kept here mirror the regex set in
// scripts/build-manifest.mjs (which sets recipe.allergens at build time)
// so the recipe page can highlight matching words client-side without
// re-deriving the allergen list. Keep the two in sync if you add a new
// allergen or rename one.
//
// User prefs live in state.allergens: { hide: [keys], highlight: bool }.
// `hide` removes blocked recipes from every list page; `highlight` wraps
// matching ingredient words in <mark class="allergen-mark"> on the recipe
// detail page so users can still spot them when looking at a recipe.

import { state } from './state.js';
import * as storage from './storage.js';

export const ALLERGEN_KEYS = [
  'gluten',
  'dairy',
  'eggs',
  'tree-nuts',
  'peanuts',
  'soy',
  'sesame',
  'fish',
  'shellfish',
  'mustard',
  'celery',
  'garlic',
];

export const ALLERGEN_LABELS = {
  gluten:      'Gluten',
  dairy:       'Dairy',
  eggs:        'Eggs',
  'tree-nuts': 'Tree nuts',
  peanuts:     'Peanuts',
  soy:         'Soy',
  sesame:      'Sesame',
  fish:        'Fish',
  shellfish:   'Shellfish',
  mustard:     'Mustard',
  celery:      'Celery',
  garlic:      'Garlic',
};

// Patterns used to highlight matching words inline on the recipe page.
// Source-of-truth for build-time detection lives in build-manifest.mjs;
// this is a runtime-only mirror so the marker DOM walker has something
// to highlight against. `g` flag because we replace each match.
export const ALLERGEN_HIGHLIGHT_PATTERNS = {
  gluten:      /\b(?:wheat|flour|bread(?:s|crumbs?)?|pasta|noodles?|spaghetti|fettuccine|tagliatelle|penne|fusilli|ravioli|tortellini|gnocchi|lasagne|lasagna|barley|bulgur|couscous|semolina|farro|rye|seitan|pastry|pita|filo|phyllo|cracker|biscuit|cake)\b/gi,
  dairy:       /\b(?:milk|buttermilk|butter|cream|cr[eè]me|yogurt|yoghurt|cheese|paneer|ghee|kefir|quark|skyr|curds?|whey|casein|lactose|feta|mozzarella|parmesan|ricotta|mascarpone|cheddar|brie|gruy[èe]re|halloumi|stilton|gorgonzola|cr[eè]me\s+fra[îi]che)\b/gi,
  eggs:        /\beggs?\b/gi,
  'tree-nuts': /\b(?:almonds?|walnuts?|pecans?|pistachios?|cashews?|hazelnuts?|macadamias?|brazil\s+nuts?|pine\s+nuts?|chestnuts?|frangipane|marzipan|nutella|praline)\b/gi,
  peanuts:     /\b(?:peanuts?|groundnuts?|peanut\s+butter|satay)\b/gi,
  soy:         /\b(?:soy|soya|soybeans?|tofu|edamame|tempeh|miso|natto|tamari)\b/gi,
  sesame:      /\b(?:sesame|tahini|gomashio|halva)\b/gi,
  fish:        /\b(?:fish(?:\s+sauce)?|salmon|tuna|cod|trout|mackerel|haddock|plaice|sole|sea[\s-]?bass|bream|snapper|anchov(?:y|ies)|sardines?|kippers?|monkfish|halibut|pollock|herring|nuoc\s+mam)\b/gi,
  shellfish:   /\b(?:shrimps?|prawns?|crabs?|lobsters?|crayfish|crawfish|scallops?|mussels?|clams?|oysters?|squid|octopus|calamari|langoustines?)\b/gi,
  mustard:     /\b(?:mustards?)\b/gi,
  celery:      /\b(?:celery|celeriac)\b/gi,
  garlic:      /\bgarlic\b/gi,
};

// Returns true when the recipe contains any of the user-hidden allergens.
// Used by every list page to filter out recipes the user has blocked.
export function recipeBlockedByAllergens(recipe) {
  const hide = state.allergens && state.allergens.hide;
  if (!hide || !hide.length) return false;
  const a = recipe.allergens;
  if (!Array.isArray(a) || !a.length) return false;
  return a.some(k => hide.includes(k));
}

// Filter helper. Keeps recipes whose allergen list does NOT intersect
// the user's hidden set.
export function visibleRecipes(arr) {
  if (!Array.isArray(arr)) return [];
  if (!state.allergens || !state.allergens.hide.length) return arr;
  return arr.filter(r => !recipeBlockedByAllergens(r));
}

export function setHide(allergen, on) {
  const next = { ...state.allergens };
  const set = new Set(next.hide);
  if (on) set.add(allergen);
  else set.delete(allergen);
  next.hide = [...set];
  state.allergens = next;
  storage.allergens.save(next);
}

export function setHighlight(on) {
  const next = { ...state.allergens, highlight: !!on };
  state.allergens = next;
  storage.allergens.save(next);
  applyHighlightClass();
}

// Reflects state.allergens.highlight onto <html> so CSS can show the
// inline marks only when the user has opted in. Lives on documentElement
// (not body) so the pre-paint inline script can set it before paint.
export function applyHighlightClass() {
  if (typeof document === 'undefined') return;
  const on = !!(state.allergens && state.allergens.highlight);
  document.documentElement.classList.toggle('allergens-highlighted', on);
}
