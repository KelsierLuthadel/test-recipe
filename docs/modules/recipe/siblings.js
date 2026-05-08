// Previous / next links to the recipes either side of the current one in
// the same category, sorted by title (matching the build-manifest order).
// Lets the user browse a section without bouncing back to the category
// page. Skipped when the recipe has no siblings.

import { categoryNode } from '../manifest.js';
import { recipeHash } from '../routes.js';
import { escapeHtml } from '../util/dom.js';

export function insertSiblingNavigation(body, recipe) {
  const node = categoryNode(recipe.categoryPath);
  if (!node) return;
  const recipes = node.recipes || [];
  const i = recipes.findIndex(r => r.slug === recipe.slug);
  if (i < 0) return;
  const prev = i > 0 ? recipes[i - 1] : null;
  const next = i < recipes.length - 1 ? recipes[i + 1] : null;
  if (!prev && !next) return;

  const nav = document.createElement('nav');
  nav.className = 'recipe-siblings';
  nav.setAttribute('aria-label', `Other recipes in ${node.label}`);

  // Empty <span> on missing sides so the grid keeps the next link
  // pinned to the right when there's no previous (and vice versa).
  const prevHtml = prev
    ? `<a class="recipe-sibling recipe-sibling-prev" href="${recipeHash(prev.slug)}">
         <span class="recipe-sibling-arrow" aria-hidden="true">&larr;</span>
         <span class="recipe-sibling-body">
           <span class="recipe-sibling-label">Previous in ${escapeHtml(node.label)}</span>
           <span class="recipe-sibling-title">${escapeHtml(prev.title)}</span>
         </span>
       </a>`
    : '<span class="recipe-sibling recipe-sibling-empty" aria-hidden="true"></span>';

  const nextHtml = next
    ? `<a class="recipe-sibling recipe-sibling-next" href="${recipeHash(next.slug)}">
         <span class="recipe-sibling-body">
           <span class="recipe-sibling-label">Next in ${escapeHtml(node.label)}</span>
           <span class="recipe-sibling-title">${escapeHtml(next.title)}</span>
         </span>
         <span class="recipe-sibling-arrow" aria-hidden="true">&rarr;</span>
       </a>`
    : '<span class="recipe-sibling recipe-sibling-empty" aria-hidden="true"></span>';

  nav.innerHTML = prevHtml + nextHtml;
  body.appendChild(nav);
}
