// Left-sidebar category tree: "All Recipes" link at the top, then a recursive
// list of categories with chevron toggles for nodes that have sub-categories.
// Expanded paths are tracked in state.expanded so the tree's open/closed shape
// survives across route changes.
//
// renderSidebarActive is the public entry point: it auto-expands the ancestors
// of the active route before re-rendering, so the current page is always
// visible in the tree.

import { els, state } from '../state.js';
import { ancestors } from '../manifest.js';
import { categoryHash, collectionHash } from '../routes.js';
import { escapeHtml } from '../util/dom.js';
import { listCollections, FAVOURITES_ID } from '../collections.js';

// Re-render the sidebar whenever collections change (add / remove / create /
// rename / delete). Bound once at module import time.
window.addEventListener('collections:changed', () => {
  if (state.manifest) renderSidebar();
});

export function renderSidebarActive() {
  if (!state.manifest) return;
  // Expand ancestors of the active route so the current page is visible.
  if (state.route.name === 'category') ancestors(state.route.path).forEach(p => state.expanded.add(p));
  if (state.route.name === 'recipe') {
    const r = state.recipeBySlug.get(state.route.slug);
    if (r) ancestors(r.categoryPath).forEach(p => state.expanded.add(p));
  }
  renderSidebar();
}

function renderSidebar() {
  const savedHtml = renderSavedGroup();
  const html = state.manifest.categories.map(cat => renderCategoryNav(cat, 'is-top')).join('');
  els.sidebarNav.innerHTML = `
    ${savedHtml}
    <a class="nav-item is-top ${state.route.name === 'home' ? 'is-active' : ''}" href="#/">
      <span class="nav-label">All Recipes</span>
      <span class="nav-count">${state.manifest.totalRecipes}</span>
    </a>
    <a class="nav-item is-top ${state.route.name === 'discover' ? 'is-active' : ''}" href="#/discover">
      <span class="nav-label">Discover</span>
    </a>
    <a class="nav-item is-top ${state.route.name === 'pantry' ? 'is-active' : ''}" href="#/pantry">
      <span class="nav-label">What can I make?</span>
    </a>
    ${html}
  `;
  els.sidebarNav.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const path = btn.dataset.toggle;
      if (state.expanded.has(path)) state.expanded.delete(path);
      else state.expanded.add(path);
      renderSidebar();
    });
  });
}

// Saved-collection group rendered above All Recipes. Always shown (Favourites
// is always present); rows highlight when the matching /saved/<id> route is
// active. The legacy /favourites route also activates the Favourites row.
function renderSavedGroup() {
  const collections = listCollections();
  const rowsHtml = collections.map(c => {
    const active = isCollectionActive(c.id);
    const href = c.id === FAVOURITES_ID ? '#/favourites' : collectionHash(c.id);
    const count = c.slugs.length;
    return `
      <div class="nav-row is-sub ${active ? 'is-active' : ''}">
        <a class="nav-item is-sub" href="${href}">
          <span class="nav-label">${escapeHtml(c.name)}</span>
          <span class="nav-count">${count}</span>
        </a>
      </div>
    `;
  }).join('');
  return `
    <div class="nav-section-label">Saved</div>
    ${rowsHtml}
    <div class="nav-saved-sep" role="presentation"></div>
  `;
}

function isCollectionActive(id) {
  if (state.route.name === 'favourites') return id === FAVOURITES_ID;
  if (state.route.name === 'collection') return state.route.id === id;
  return false;
}

function renderCategoryNav(node, levelClass) {
  const hasChildren = node.subcategories && node.subcategories.length > 0;
  const isOpen = state.expanded.has(node.path);
  const isActive = isCategoryActive(node.path);
  const childClass = levelClass === 'is-top' ? 'is-sub' : 'is-sub-sub';

  const toggle = hasChildren
    ? `<button type="button" class="nav-toggle" data-toggle="${node.path}" aria-label="${isOpen ? 'Collapse' : 'Expand'} ${escapeHtml(node.label)}" aria-expanded="${isOpen}">
         <svg class="nav-chevron ${isOpen ? 'is-open' : ''}" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 6 15 12 9 18"/></svg>
       </button>`
    : '';

  const itemHtml = `
    <div class="nav-row ${isActive ? 'is-active' : ''} ${levelClass}">
      ${toggle}
      <a class="nav-item ${levelClass}" href="${categoryHash(node.path)}">
        <span class="nav-label">${escapeHtml(node.label)}</span>
        <span class="nav-count">${node.recipeCount}</span>
      </a>
    </div>`;

  let childrenHtml = '';
  if (hasChildren) {
    const children = node.subcategories.map(c => renderCategoryNav(c, childClass)).join('');
    childrenHtml = `<div class="nav-children ${isOpen ? 'is-open' : ''}">${children}</div>`;
  }

  return itemHtml + childrenHtml;
}

function isCategoryActive(path) {
  if (state.route.name === 'category') {
    return state.route.path === path || state.route.path.startsWith(path + '/');
  }
  if (state.route.name === 'recipe') {
    const r = state.recipeBySlug.get(state.route.slug);
    return r && (r.categoryPath === path || r.categoryPath.startsWith(path + '/'));
  }
  return false;
}
