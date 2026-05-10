// Renders a "Wine pairing" callout on the recipe page when the manifest
// has set recipe.winePairings (only emitted for meals and desserts; the
// rules live in wine-pairings.json, evaluated at build time).
//
// Inserted near the top of the recipe body so users can spot it before
// scrolling into ingredients. Visibility is gated by .wine-pairings-hidden
// on <html> so the Settings toggle is a pure CSS flip.

import { escapeHtml } from '../util/dom.js';
import { state } from '../state.js';
import * as storage from '../storage.js';

export function setWineVisible(on) {
  state.wine = { visible: !!on };
  storage.wine.save(state.wine);
  applyWineVisibilityClass();
}

export function applyWineVisibilityClass() {
  if (typeof document === 'undefined') return;
  const hide = !(state.wine && state.wine.visible);
  document.documentElement.classList.toggle('wine-pairings-hidden', hide);
}

const ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2h8M8 2c0 5 4 7 4 11s-4 6-4 9h8c0-3-4-5-4-9s4-6 4-11"/><line x1="9" y1="22" x2="15" y2="22"/></svg>';

export function insertWinePairings(body, recipe) {
  const pairing = recipe.winePairings;
  if (!pairing || !Array.isArray(pairing.wines) || !pairing.wines.length) return;
  if (body.querySelector('.wine-pairing')) return;

  const winesHtml = pairing.wines
    .map(w => `<span class="wine-pairing-pill">${escapeHtml(w)}</span>`)
    .join('');
  const noteHtml = pairing.note
    ? `<p class="wine-pairing-note">${escapeHtml(pairing.note)}</p>`
    : '';

  const aside = document.createElement('aside');
  aside.className = 'wine-pairing';
  aside.setAttribute('aria-label', 'Wine pairing suggestions');
  aside.innerHTML = `
    <span class="wine-pairing-label">${ICON}<span>Wine pairing</span></span>
    <div class="wine-pairing-list">${winesHtml}</div>
    ${noteHtml}
  `;

  // Insert after the first paragraph (the italic caption beneath the
  // title image) so the pairing sits in the recipe's preamble instead
  // of pushing ingredients down. Falls back to the top of body if the
  // recipe has no opening paragraph yet.
  const firstP = body.querySelector('p');
  if (firstP && firstP.parentNode === body) {
    firstP.insertAdjacentElement('afterend', aside);
  } else {
    body.insertBefore(aside, body.firstChild);
  }
}
