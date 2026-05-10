// Renders a "More like this" section near the bottom of the recipe page,
// listing recipes that share tags / category / cuisine with the current
// recipe. Pure runtime: scores every other recipe by overlap and takes
// the top N. Filters out building-block recipes (sauces, spice mixes,
// stocks etc.) because suggesting "Garam Masala" next to a curry isn't
// useful — we want full meals to surface.

import { state } from '../state.js';
import { cardHtml } from '../cards.js';
import { recipeBlockedByAllergens } from '../allergens.js';

const SIMILAR_LIMIT = 4;

// Tags that don't say much about the recipe's character (almost every
// vegan dish is also dairy-free; nearly every meal has the meals tag);
// we drop them when computing tag-overlap scores so the genuinely
// distinctive tags (curry, asian, beef, etc.) drive the ranking.
const BORING_TAGS = new Set([
  'meals', 'gluten-free', 'dairy-free', 'vegetarian', 'vegan',
  'dessert', 'baking', 'sides',
]);

const NON_DISH_TOP = new Set([
  'base-ingredients', 'sauces', 'coulis', 'sponge',
  'spices', 'spice-mixes', 'stocks', 'vinaigrette',
]);
const NON_DISH_PATH = /(?:^|\/)(?:spices|spice-mixes|sauces-pickles|pastes|base|stocks)(?:\/|$)/i;

export function insertSimilarRecipes(body, recipe) {
  if (body.querySelector('.similar-recipes')) return;
  const candidates = scoreCandidates(recipe);
  if (!candidates.length) return;

  const cards = candidates.map(c => cardHtml(c.recipe, true)).join('');
  const section = document.createElement('section');
  section.className = 'section similar-recipes';
  section.innerHTML = `
    <div class="section-head">
      <h2 class="section-title">More like this</h2>
      <span class="section-meta">${candidates.length}</span>
    </div>
    <div class="card-grid">${cards}</div>
  `;
  body.appendChild(section);
}

function scoreCandidates(recipe) {
  const myTags = new Set(recipe.tags || []);
  const myCat = recipe.categoryPath || '';
  const myCuisine = pathSegment(recipe.path, 1, 'cuisine');
  const myTopLevel = (recipe.path || '').split('/')[0] || '';

  const scored = [];
  for (const r of state.flatRecipes) {
    if (r.slug === recipe.slug) continue;
    if (recipeBlockedByAllergens(r)) continue;
    // Skip building-block recipes so we don't recommend a sauce as a
    // "similar" alternative for a finished meal.
    const top = (r.path || '').split('/')[0];
    if (NON_DISH_TOP.has(top)) continue;
    if (NON_DISH_PATH.test(r.path || '')) continue;

    let score = 0;
    for (const t of r.tags || []) {
      if (!myTags.has(t)) continue;
      score += BORING_TAGS.has(t) ? 1 : 5;
    }
    if (score === 0) continue;

    if (r.categoryPath === myCat) score += 4;
    const theirCuisine = pathSegment(r.path, 1, 'cuisine');
    if (myCuisine && theirCuisine && myCuisine === theirCuisine) score += 2;
    if (top === myTopLevel) score += 1;

    scored.push({ recipe: r, score });
  }

  scored.sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title));
  return scored.slice(0, SIMILAR_LIMIT);
}

// Returns the path segment at index `idx` only when the segment at the
// previous index matches `parentSlug`. Used to extract a recipe's
// cuisine name (the segment after "cuisine/") without false-matching
// recipes that happen to live at depth 1 outside cuisine/.
function pathSegment(path, idx, parentSlug) {
  if (!path) return '';
  const parts = path.split('/');
  if (idx <= 0 || idx >= parts.length) return '';
  if (parentSlug && parts[idx - 1] !== parentSlug) return '';
  return parts[idx];
}
