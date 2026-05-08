// Category page (#/c/<path>). Shows: a back-button to the parent (or home
// if top-level), a header with the category overview, an optional tag-filter
// chip row, sub-section tiles + featured cards if there are children, and a
// final card grid for the recipes that live directly under this category.
//
// The ?tag=… URL parameter is parsed by routes.js and lands here as
// state.route.tags; recipes are filtered to those that have ALL active tags.

import { state, setContent } from '../state.js';
import { categoryNode } from '../manifest.js';
import { categoryHash } from '../routes.js';
import { cardHtml, catTileHtml, pickCategoryFeatured } from '../cards.js';
import { tagFilterHtml } from '../tags.js';
import { escapeHtml } from '../util/dom.js';
import { renderNotFound } from './not-found.js';

function categoryBackButton(path) {
  const parts = path.split('/');
  const arrow = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  if (parts.length < 2) {
    return `<div class="page-back"><a class="back-button" href="#/">${arrow}Back to Home</a></div>`;
  }
  const parent = categoryNode(parts.slice(0, -1).join('/'));
  if (!parent) return '';
  return `<div class="page-back"><a class="back-button" href="${categoryHash(parent.path)}">${arrow}Back to ${escapeHtml(parent.label)}</a></div>`;
}

function parentLabel(path) {
  if (!path) return null;
  const parts = path.split('/');
  if (parts.length < 2) return null;
  const parent = categoryNode(parts.slice(0, -1).join('/'));
  return parent ? parent.label : null;
}

export function renderCategory(path) {
  const node = categoryNode(path);
  if (!node) return renderNotFound(`Category "${path}" not found.`);

  const subTiles = (node.subcategories || []).map(s => catTileHtml(s)).join('');

  const directRecipes = node.recipes || [];
  const activeTags = Array.isArray(state.route.tags) ? state.route.tags : [];
  const filteredRecipes = activeTags.length
    ? directRecipes.filter(r => Array.isArray(r.tags) && activeTags.every(t => r.tags.includes(t)))
    : directRecipes;
  const cardsHtml = filteredRecipes.map(r => cardHtml(r)).join('');

  const subText = `${node.recipeCount} recipe${node.recipeCount === 1 ? '' : 's'} in this section.`;
  const overviewLine = node.overview
    ? `<p class="page-sub">${escapeHtml(node.overview)}</p><p class="page-meta">${subText}</p>`
    : `<p class="page-sub">${subText}</p>`;

  // Faceted: chip row keeps every tag the section can offer, but counts
  // (and clickability) come from the filtered candidate set. Adding a
  // chip that would yield 0 results is greyed out instead of removed.
  const filterBar = directRecipes.length
    ? tagFilterHtml(filteredRecipes, activeTags, tags => categoryHash(path, tags), directRecipes)
    : '';

  let body = `
    <div class="fade-in">
      ${categoryBackButton(path)}
      <header class="page-header">
        <div class="page-eyebrow">${escapeHtml(parentLabel(path) || 'Category')}</div>
        <h1 class="page-title">${escapeHtml(node.label)}</h1>
        ${overviewLine}
      </header>
      ${filterBar}
  `;

  if (subTiles) {
    body += `
      <section class="section">
        <div class="section-head"><h2 class="section-title">Sub-sections</h2><span class="section-meta">${node.subcategories.length}</span></div>
        <div class="cat-grid">${subTiles}</div>
      </section>
    `;

    const featured = pickCategoryFeatured(node, 8);
    if (featured.length) {
      body += `
        <section class="section">
          <div class="section-head"><h2 class="section-title">A taste of ${escapeHtml(node.label)}</h2></div>
          <div class="card-grid">${featured.map(r => cardHtml(r, true)).join('')}</div>
        </section>
      `;
    }
  }

  if (directRecipes.length) {
    const countLabel = activeTags.length
      ? `${filteredRecipes.length} of ${directRecipes.length}`
      : `${directRecipes.length}`;
    const recipeBody = filteredRecipes.length
      ? `<div class="card-grid">${cardsHtml}</div>`
      : `<div class="empty-state"><div class="empty-state-title">No matches</div><p>No recipes in this section match the selected tag.</p></div>`;
    body += `
      <section class="section">
        <div class="section-head"><h2 class="section-title">${subTiles ? 'Recipes in this section' : 'Recipes'}</h2><span class="section-meta">${countLabel}</span></div>
        ${recipeBody}
      </section>
    `;
  } else if (!subTiles) {
    body += `<div class="empty-state"><div class="empty-state-title">No recipes yet</div><p>This category is empty.</p></div>`;
  }

  body += `</div>`;
  setContent(body);
}
