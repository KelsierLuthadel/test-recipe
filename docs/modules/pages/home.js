// Home page (#/). Personalised section bar (favourites / recent /
// top-rated / notes / cooked, gated by state.homeSections), the category
// grid and 8 random featured cards. Tag-based filtering lives on the
// Discover page (#/discover); legacy #/?tag= URLs redirect there.

import { state, setContent } from '../state.js';
import * as storage from '../storage.js';
import { escapeHtml } from '../util/dom.js';
import { cardHtml, catTileHtml, pickFeatured } from '../cards.js';
import { navigate, discoverHash } from '../routes.js';

const HOME_CARD_LIMIT = 4;

export function renderHome() {
  const m = state.manifest;

  // Old #/?tag=... URLs (and any external links) redirect to discover so
  // the picker is the one place tag filtering happens.
  const activeTags = Array.isArray(state.route.tags) ? state.route.tags : [];
  if (activeTags.length) {
    navigate(discoverHash(activeTags));
    return;
  }

  const tiles = m.categories.map(c => catTileHtml(c)).join('');
  const enabled = state.homeSections;

  function sectionHtml(id, title, recipes, viewAllHref) {
    if (!enabled.has(id) || !recipes.length) return '';
    const shown = recipes.slice(0, HOME_CARD_LIMIT);
    const overflow = recipes.length - shown.length;
    const meta = overflow > 0
      ? `<span class="section-meta">${recipes.length} <a href="${viewAllHref}">View all</a></span>`
      : `<span class="section-meta">${recipes.length}</span>`;
    return `
      <section class="section">
        <div class="section-head"><h2 class="section-title">${escapeHtml(title)}</h2>${meta}</div>
        <div class="card-grid">${shown.map(r => cardHtml(r, true)).join('')}</div>
      </section>
    `;
  }

  const favRecipes = [...state.favourites]
    .map(slug => state.recipeBySlug.get(slug))
    .filter(Boolean);

  const recentRecipesAll = state.recent
    .map(slug => state.recipeBySlug.get(slug))
    .filter(Boolean)
    .filter(r => !state.favourites.has(r.slug));

  const ratingsMap = state.ratings || {};
  const topRatedRecipes = Object.entries(ratingsMap)
    .filter(([, v]) => v >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => state.recipeBySlug.get(slug))
    .filter(Boolean);

  const notesRecipes = [...state.notesSlugs]
    .map(slug => state.recipeBySlug.get(slug))
    .filter(Boolean);

  const cookedMap = storage.cooked.load();
  const cookedRecipes = Object.entries(cookedMap)
    .sort((a, b) => {
      const da = a[1] && a[1].last ? Date.parse(a[1].last) : 0;
      const db = b[1] && b[1].last ? Date.parse(b[1].last) : 0;
      return db - da;
    })
    .map(([slug]) => state.recipeBySlug.get(slug))
    .filter(Boolean);

  const favSection      = sectionHtml('favourites', 'Your favourites',     favRecipes,      '#/favourites');
  const recentSection   = sectionHtml('recent',     'Recently viewed',     recentRecipesAll, '#/recent');
  const topRatedSection = sectionHtml('top-rated',  'Top rated',           topRatedRecipes, '#/top-rated');
  const notesSection    = sectionHtml('notes',      'Recipes with notes',  notesRecipes,    '#/notes');
  const cookedSection   = sectionHtml('cooked',     'Cooked',              cookedRecipes,   '#/cooked');

  const featured = pickFeatured(8);
  const cardsHtml = featured.map(r => cardHtml(r, true)).join('');

  setContent(`
    <div class="fade-in">
      <header class="page-header">
        <div class="page-eyebrow">Open-source recipes</div>
        <h1 class="page-title">Recipes, gathered and given.</h1>
        <p class="page-sub">${m.totalRecipes} recipes across ${m.categories.length} categories. Browse the sidebar, search by name, or pick a category below.</p>
      </header>

      ${favSection}
      ${recentSection}
      ${topRatedSection}
      ${notesSection}
      ${cookedSection}

      <section class="section" aria-labelledby="cat-section">
        <div class="section-head"><h2 class="section-title" id="cat-section">Categories</h2><span class="section-meta">${m.categories.length} sections</span></div>
        <div class="cat-grid">${tiles}</div>
      </section>

      <section class="section" aria-labelledby="featured-section">
        <div class="section-head"><h2 class="section-title" id="featured-section">A taste of the collection</h2></div>
        <div class="card-grid">${cardsHtml}</div>
      </section>
    </div>
  `);
}
