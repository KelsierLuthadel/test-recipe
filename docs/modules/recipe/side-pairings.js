// Renders a "Pairs well with" section listing side-dish recipes that go
// alongside the current dish (e.g. naan + rice next to a curry). Slugs
// come pre-resolved from the manifest (recipe.sidePairings); we simply
// render small cards linking to each. Allergen-blocked sides are
// filtered out at render time so users with hide prefs don't see them.
//
// Visibility is gated by .side-pairings-hidden on <html> so the Settings
// toggle is a pure CSS flip with no re-render.

import { state } from '../state.js';
import * as storage from '../storage.js';
import { rawUrl } from '../manifest.js';
import { recipeHash } from '../routes.js';
import { escapeHtml } from '../util/dom.js';
import { recipeBlockedByAllergens } from '../allergens.js';

export function setSidesVisible(on) {
  state.sides = { visible: !!on };
  storage.sides.save(state.sides);
  applySidesVisibilityClass();
}

export function applySidesVisibilityClass() {
  if (typeof document === 'undefined') return;
  const hide = !(state.sides && state.sides.visible);
  document.documentElement.classList.toggle('side-pairings-hidden', hide);
}

const ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18M5 6h14M7 18h10"/><circle cx="12" cy="3" r="0.6" fill="currentColor"/></svg>';

export function insertSidePairings(body, recipe) {
  const slugs = Array.isArray(recipe.sidePairings) ? recipe.sidePairings : [];
  if (!slugs.length) return;
  if (body.querySelector('.side-pairing')) return;

  const sides = slugs
    .map(slug => state.recipeBySlug.get(slug))
    .filter(Boolean)
    .filter(r => !recipeBlockedByAllergens(r));
  if (!sides.length) return;

  const tilesHtml = sides.map(r => {
    const href = recipeHash(r.slug);
    const img = r.image
      ? `<span class="side-pairing-thumb"><img src="${escapeHtml(rawUrl(r.image))}" alt="" loading="lazy"></span>`
      : `<span class="side-pairing-thumb is-empty" aria-hidden="true"></span>`;
    return `<a class="side-pairing-tile" href="${href}">
      ${img}
      <span class="side-pairing-name">${escapeHtml(r.title)}</span>
    </a>`;
  }).join('');

  const aside = document.createElement('aside');
  aside.className = 'side-pairing';
  aside.setAttribute('aria-label', 'Suggested side dishes');
  aside.innerHTML = `
    <span class="side-pairing-label">${ICON}<span>Pairs well with</span></span>
    <div class="side-pairing-grid">${tilesHtml}</div>
  `;

  // Insert just after wine-pairings if present, otherwise after the
  // recipe's first paragraph (the italic caption beneath the title).
  const winePair = body.querySelector('.wine-pairing');
  if (winePair) {
    winePair.insertAdjacentElement('afterend', aside);
    return;
  }
  const firstP = body.querySelector('p');
  if (firstP && firstP.parentNode === body) {
    firstP.insertAdjacentElement('afterend', aside);
  } else {
    body.insertBefore(aside, body.firstChild);
  }
}
