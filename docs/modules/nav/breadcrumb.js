// Topbar breadcrumb. Always starts with "Recipes" -> home and then appends
// per-route trail items. Category and recipe routes walk the manifest
// ancestor chain so deeply-nested pages get the full breadcrumb path.

import { els, state } from '../state.js';
import { categoryNode, ancestors } from '../manifest.js';
import { categoryHash } from '../routes.js';
import { escapeHtml } from '../util/dom.js';
import { findCollection } from '../collections.js';

export function renderBreadcrumb() {
  const parts = [{ label: 'Recipes', href: '#/' }];

  if (state.route.name === 'category') {
    const trail = ancestors(state.route.path);
    const lastIdx = trail.length - 1;
    trail.forEach((p, i) => {
      const node = categoryNode(p);
      if (!node) return;
      // Last part is the current page, so render it as text not a link.
      if (i === lastIdx) parts.push({ label: node.label });
      else parts.push({ label: node.label, href: categoryHash(p) });
    });
  } else if (state.route.name === 'recipe') {
    const r = state.recipeBySlug.get(state.route.slug);
    if (r) {
      const trail = ancestors(r.categoryPath);
      trail.forEach(p => {
        const node = categoryNode(p);
        if (node) parts.push({ label: node.label, href: categoryHash(p) });
      });
      parts.push({ label: r.title });
    }
  } else if (state.route.name === 'search') {
    parts.push({ label: 'Search' });
  } else if (state.route.name === 'favourites') {
    parts.push({ label: 'Favourites' });
  } else if (state.route.name === 'collection') {
    const c = findCollection(state.route.id);
    parts.push({ label: c ? c.name : 'Collection' });
  } else if (state.route.name === 'recent') {
    parts.push({ label: 'Recently viewed' });
  } else if (state.route.name === 'top-rated') {
    parts.push({ label: 'Top rated' });
  } else if (state.route.name === 'notes') {
    parts.push({ label: 'Recipes with notes' });
  } else if (state.route.name === 'cooked') {
    parts.push({ label: 'Cooked' });
  } else if (state.route.name === 'settings') {
    parts.push({ label: 'Settings' });
  } else if (state.route.name === 'discover') {
    parts.push({ label: 'Discover' });
  } else if (state.route.name === 'pantry') {
    parts.push({ label: 'What can I make?' });
  } else if (state.route.name === 'plan') {
    parts.push({ label: 'Meal plan' });
  }

  els.breadcrumb.innerHTML = parts.map((p, i) => {
    const sep = i > 0 ? `<span class="crumb-sep" aria-hidden="true">/</span>` : '';
    if (p.href) return `${sep}<a href="${p.href}">${escapeHtml(p.label)}</a>`;
    return `${sep}<span class="crumb-current">${escapeHtml(p.label)}</span>`;
  }).join('');
}
