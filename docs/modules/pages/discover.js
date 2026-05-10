// Discover page (#/discover). Faceted tag picker: with each tag picked
// the candidate recipe set narrows, and the chip row is recomputed from
// just the candidates so it only ever offers tags that still co-occur.
// Picking 'meals' makes 'dessert' / 'salsa' chips disappear; picking
// 'meat' hides 'vegetarian'; and so on, automatically, without any
// hardcoded taxonomy.

import { state, setContent } from '../state.js';
import { escapeHtml } from '../util/dom.js';
import { cardHtml } from '../cards.js';
import { tagFilterHtml } from '../tags.js';
import { discoverHash } from '../routes.js';
import { visibleRecipes } from '../allergens.js';

export function renderDiscover() {
  const activeTags = Array.isArray(state.route.tags) ? state.route.tags : [];

  // Candidates: recipes that have every selected tag. With no tags
  // picked yet this is the full collection, so the chip row shows
  // every tag the build script knows about.
  const visible = visibleRecipes(state.flatRecipes);
  const candidates = activeTags.length
    ? visible.filter(r =>
        Array.isArray(r.tags) && activeTags.every(t => r.tags.includes(t)),
      )
    : visible;

  // Chip set + counts come from the candidate pool, which is what makes
  // this faceted: tags that no candidate has are dropped automatically.
  // Counts read as "if I add this tag, how many recipes I'd be left with".
  const filterBar = tagFilterHtml(candidates, activeTags, discoverHash);

  const labels = activeTags.join(' + ');
  const eyebrow = activeTags.length ? `Discover · ${labels}` : 'Discover';
  const title = activeTags.length
    ? `${candidates.length} recipe${candidates.length === 1 ? '' : 's'}`
    : 'Find a recipe by tag';
  const sub = activeTags.length
    ? 'Tap a chip to add another filter, or use Clear all below.'
    : `Pick a tag to start narrowing ${candidates.length} recipes. Each pick hides chips that no longer fit.`;
  const clearAllHtml = activeTags.length
    ? `<div class="discover-actions"><a class="discover-clear" href="${discoverHash([])}">Clear all</a></div>`
    : '';

  const cardsHtml = candidates.length
    ? `<div class="card-grid">${candidates.map(r => cardHtml(r, true)).join('')}</div>`
    : `<div class="empty-state"><div class="empty-state-title">No matches</div><p>No recipes match all the selected tags. Remove a chip to broaden the search.</p></div>`;

  setContent(`
    <div class="fade-in">
      <header class="page-header">
        <div class="page-eyebrow">${escapeHtml(eyebrow)}</div>
        <h1 class="page-title">${escapeHtml(title)}</h1>
        <p class="page-sub">${escapeHtml(sub)}</p>
      </header>

      ${filterBar}
      ${clearAllHtml}

      <section class="section">
        ${cardsHtml}
      </section>
    </div>
  `);
}
