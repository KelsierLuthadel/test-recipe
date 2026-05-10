// Search results page (#/s?q=…). The query lands here via state.route.query.
// searchRecipes() ranks recipes against the query — title hits score highest,
// then overview, then ingredient lines.

import { state, setContent } from '../state.js';
import { cardHtml } from '../cards.js';
import { escapeHtml } from '../util/dom.js';
import { visibleRecipes } from '../allergens.js';

function searchRecipes(q) {
  const needle = q.toLowerCase();
  const tokens = needle.split(/\s+/).filter(Boolean);
  const out = [];
  for (const r of visibleRecipes(state.flatRecipes)) {
    const title = (r.title || '').toLowerCase();
    const overview = (r.overview || '').toLowerCase();
    const path = (r.path || '').toLowerCase();
    const ingredients = (r.ingredients || '').toLowerCase();
    const haystack = `${title} ${overview} ${path} ${ingredients}`;
    if (!tokens.every(t => haystack.includes(t))) continue;
    let score = 0;
    if (title.includes(needle)) score += 60;
    if (title.startsWith(needle)) score += 30;
    tokens.forEach(t => {
      if (title.includes(t)) score += 10;
      if (overview.includes(t)) score += 3;
      if (ingredients.includes(t)) score += 2;
    });
    out.push({ recipe: r, score });
  }
  out.sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title));
  return out.slice(0, 100);
}

export function renderSearch(query) {
  const q = (query || '').trim();
  if (!q) {
    setContent(`
      <div class="fade-in">
        <header class="page-header">
          <div class="page-eyebrow">Search</div>
          <h1 class="page-title">Find a recipe</h1>
          <p class="page-sub">Type a recipe name, ingredient, or cuisine into the search box.</p>
        </header>
      </div>
    `);
    return;
  }
  const results = searchRecipes(q);
  const cardsHtml = results.length
    ? results.map(r => cardHtml(r.recipe, true, q)).join('')
    : `<div class="empty-state"><div class="empty-state-title">No matches</div><p>Try a shorter or different query.</p></div>`;

  setContent(`
    <div class="fade-in">
      <header class="page-header">
        <div class="page-eyebrow">Search results</div>
        <h1 class="page-title">${escapeHtml(q)}</h1>
        <div class="search-info">${results.length} match${results.length === 1 ? '' : 'es'}</div>
      </header>
      <div class="card-grid">${results.length ? cardsHtml : ''}</div>
      ${results.length ? '' : cardsHtml}
    </div>
  `);
}
