// Previous / next links to the recipes either side of the current one in
// the same category, sorted by title (matching the build-manifest order).
// Lets the user browse a section without bouncing back to the category
// page. Skipped when the recipe has no siblings.

import { categoryNode } from '../manifest.js';
import { navigate, recipeHash } from '../routes.js';
import { escapeHtml } from '../util/dom.js';
import { recipeBlockedByAllergens } from '../allergens.js';

// Single AbortController shared across recipe-page renders so we tear
// down the previous keydown handler before attaching the next one;
// otherwise the listeners pile up as the user navigates between recipes.
let keyAbort = null;

export function insertSiblingNavigation(body, recipe) {
  const node = categoryNode(recipe.categoryPath);
  if (!node) return;
  // Skip allergen-blocked siblings so users with hide prefs aren't sent
  // back into recipes they've opted out of via [ / ] or the prev/next links.
  const recipes = (node.recipes || []).filter(r => r.slug === recipe.slug || !recipeBlockedByAllergens(r));
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
  // Wrap "in <Category>" in its own span so narrow screens can drop it
  // and just show "Previous" / "Next" (the title beneath gives plenty of
  // context already).
  const prevHtml = prev
    ? `<a class="recipe-sibling recipe-sibling-prev" href="${recipeHash(prev.slug)}">
         <span class="recipe-sibling-arrow" aria-hidden="true">&larr;</span>
         <span class="recipe-sibling-body">
           <span class="recipe-sibling-label">Previous<span class="recipe-sibling-cat"> in ${escapeHtml(node.label)}</span></span>
           <span class="recipe-sibling-title">${escapeHtml(prev.title)}</span>
         </span>
       </a>`
    : '<span class="recipe-sibling recipe-sibling-empty" aria-hidden="true"></span>';

  const nextHtml = next
    ? `<a class="recipe-sibling recipe-sibling-next" href="${recipeHash(next.slug)}">
         <span class="recipe-sibling-body">
           <span class="recipe-sibling-label">Next<span class="recipe-sibling-cat"> in ${escapeHtml(node.label)}</span></span>
           <span class="recipe-sibling-title">${escapeHtml(next.title)}</span>
         </span>
         <span class="recipe-sibling-arrow" aria-hidden="true">&rarr;</span>
       </a>`
    : '<span class="recipe-sibling recipe-sibling-empty" aria-hidden="true"></span>';

  nav.innerHTML = prevHtml + nextHtml;
  body.appendChild(nav);

  // [ / ] navigate between siblings without reaching for the mouse.
  // Tear down any prior listener (left over from the previous recipe
  // page render) before attaching the new one.
  if (keyAbort) keyAbort.abort();
  keyAbort = new AbortController();
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && t.matches && t.matches('input, textarea, [contenteditable], [contenteditable="true"]')) return;
    if (e.key === '[' && prev) { e.preventDefault(); navigate(recipeHash(prev.slug)); }
    else if (e.key === ']' && next) { e.preventDefault(); navigate(recipeHash(next.slug)); }
  }, { signal: keyAbort.signal });
}
