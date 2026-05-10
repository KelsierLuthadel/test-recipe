// Adds inline substitution hints to Ingredients lines that mention
// something in substitutions.json (loaded via the manifest). A small
// "alts" button is appended to each matching <li>; clicking expands a
// panel below the line listing each detected ingredient and its swaps.
//
// Match is substring-based against lowercased line text, longest-first
// so "double cream" wins over "cream" when both are entries (otherwise
// the user would see two buttons for the same ingredient).

import { state } from '../state.js';
import { findIngredientItems } from './ingredients.js';
import { escapeHtml } from '../util/dom.js';

let cachedKeys = null;
function keysSorted() {
  if (cachedKeys) return cachedKeys;
  const subs = (state.manifest && state.manifest.substitutions) || {};
  // Longest first so "double cream" matches before "cream", "fresh basil"
  // before "basil", etc.
  cachedKeys = Object.keys(subs).sort((a, b) => b.length - a.length);
  return cachedKeys;
}

function findMatches(lineLower) {
  const subs = (state.manifest && state.manifest.substitutions) || {};
  const keys = keysSorted();
  const seen = new Set();
  const matches = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    if (lineLower.includes(key)) {
      // Skip if this match overlaps a longer one we already accepted
      // (handles "cream" inside an already-matched "double cream").
      if (matches.some(m => m.key.includes(key))) continue;
      matches.push({ key, swaps: subs[key] });
      seen.add(key);
    }
  }
  return matches;
}

const ICON = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';

export function addSubstitutionHints(body) {
  const subs = (state.manifest && state.manifest.substitutions) || {};
  if (!Object.keys(subs).length) return;

  const items = findIngredientItems(body);
  for (const li of items) {
    const lineText = li.textContent.toLowerCase();
    const matches = findMatches(lineText);
    if (!matches.length) continue;

    const panelId = `subs-${Math.random().toString(36).slice(2, 9)}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ingredient-subs-btn';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', panelId);
    btn.setAttribute('aria-label', 'Show ingredient substitutions');
    btn.innerHTML = `${ICON}<span>swap</span>`;

    const panel = document.createElement('div');
    panel.className = 'ingredient-subs-panel';
    panel.id = panelId;
    panel.hidden = true;
    panel.innerHTML = matches.map(m => `
      <div class="ingredient-subs-group">
        <span class="ingredient-subs-key">${escapeHtml(m.key)}</span>
        <ul class="ingredient-subs-list">
          ${m.swaps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
        </ul>
      </div>
    `).join('');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = btn.getAttribute('aria-expanded') === 'true';
      // Close any other open panel first so only one is visible at a
      // time - keeps the ingredients list from ballooning when several
      // lines have substitutions.
      body.querySelectorAll('.ingredient-subs-btn[aria-expanded="true"]').forEach(other => {
        if (other === btn) return;
        other.setAttribute('aria-expanded', 'false');
        const otherPanel = body.querySelector('#' + other.getAttribute('aria-controls'));
        if (otherPanel) otherPanel.hidden = true;
      });
      btn.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });

    li.appendChild(btn);
    li.appendChild(panel);
  }
}
