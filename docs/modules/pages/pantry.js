// Pantry picker (#/pantry). Pick ingredients you have, get recipes
// ranked by overlap with your pantry. Match is substring-based on each
// recipe's canonical ingredientNames (built by scripts/build-manifest),
// so picking "onion" finds recipes that list "red onion" or "onions".
//
// URL state: #/pantry?have=onion,garlic,chicken — picks live in the
// hash so the picker is bookmarkable / shareable. Each add or remove
// is a route change that re-renders the page.

import { state, setContent, els } from '../state.js';
import { escapeHtml, escapeAttr } from '../util/dom.js';
import { cardHtml } from '../cards.js';
import { navigate, pantryHash } from '../routes.js';
import { visibleRecipes } from '../allergens.js';

const QUICK_PICK_LIMIT = 24;

export function renderPantry() {
  const have = Array.isArray(state.route.have) ? state.route.have : [];
  const haveLower = have.map(s => s.toLowerCase());
  const haveSet = new Set(haveLower);

  // Pre-compute a map of canonical name -> recipes that mention it,
  // so the score loop doesn't re-scan every recipe per picked ingredient.
  const indexEntries = state.manifest.ingredientIndex || [];

  const scored = haveLower.length
    ? visibleRecipes(state.flatRecipes)
        .filter(r => Array.isArray(r.ingredientNames) && r.ingredientNames.length)
        .map(r => scoreRecipe(r, haveLower))
        .filter(s => s.hits > 0)
        // Primary: more of your ingredients used. Secondary: higher
        // proportion of the recipe's ingredients you already have.
        .sort((a, b) => b.hits - a.hits || (b.hits / b.total) - (a.hits / a.total))
    : [];

  // Quick-pick chips: ingredients from the index that the user hasn't
  // already added, ordered by how many recipes mention them.
  const quickPicks = indexEntries
    .filter(e => !haveSet.has(e.name))
    .slice(0, QUICK_PICK_LIMIT);

  const havePillsHtml = have.map(name => {
    const next = have.filter(x => x.toLowerCase() !== name.toLowerCase());
    return `<a class="pantry-pill is-on" href="${pantryHash(next)}" aria-label="Remove ${escapeAttr(name)}">${escapeHtml(name)}<span class="pantry-pill-x" aria-hidden="true">&times;</span></a>`;
  }).join('');

  const quickPicksHtml = quickPicks.map(e => {
    const next = [...have, e.name];
    return `<a class="pantry-pill" href="${pantryHash(next)}">${escapeHtml(e.name)}<span class="pantry-pill-count">${e.count}</span></a>`;
  }).join('');

  // Datalist provides browser-native typeahead over the full ingredient
  // index without us needing a custom dropdown.
  const datalistHtml = `<datalist id="pantry-ingredients">${
    indexEntries.map(e => `<option value="${escapeAttr(e.name)}">`).join('')
  }</datalist>`;

  const summaryHtml = have.length
    ? `<p class="page-sub">${have.length} ingredient${have.length === 1 ? '' : 's'} picked. ${scored.length} recipe${scored.length === 1 ? '' : 's'} match at least one.</p>`
    : `<p class="page-sub">Pick the ingredients you have and recipes will appear ranked by how many they use. Tap a quick pick below or type to search.</p>`;

  const resultsHtml = have.length
    ? renderResults(scored, haveLower)
    : '';

  setContent(`
    <div class="fade-in pantry-page">
      <header class="page-header">
        <div class="page-eyebrow">Pantry</div>
        <h1 class="page-title">What can I make?</h1>
        ${summaryHtml}
      </header>

      <form class="pantry-search" role="search" autocomplete="off">
        <label for="pantry-input" class="sr-only">Add an ingredient</label>
        <input
          id="pantry-input"
          type="search"
          list="pantry-ingredients"
          placeholder="Add an ingredient (e.g. onion, garlic, chicken)"
          spellcheck="false"
        >
        <button type="submit">Add</button>
        ${datalistHtml}
      </form>

      ${have.length ? `
        <div class="pantry-have" aria-label="In your pantry">
          <span class="pantry-label">In your pantry:</span>
          ${havePillsHtml}
          ${have.length > 1 ? `<a class="pantry-clear" href="${pantryHash([])}">Clear all</a>` : ''}
        </div>
      ` : ''}

      ${quickPicks.length ? `
        <div class="pantry-quick" aria-label="Quick picks">
          <span class="pantry-label">Common ingredients:</span>
          ${quickPicksHtml}
        </div>
      ` : ''}

      ${resultsHtml}
    </div>
  `);

  bindPantrySearch(have);
}

// Words that mark a canonical name as a derivative product rather than
// the raw ingredient. "chicken stock" or "tomato purée" should not match
// when the user picks "chicken" / "tomato" - those are different things
// to have in the pantry. Picking the suffix word itself (e.g. "stock")
// still matches, so a generic-stock pantry pick still works.
const DERIVATIVE_SUFFIX_RE = /\b(stock|broth|powder|paste|pur[ée]e|sauce|extract|oil|vinegar|water|juice|syrup|essence|flour|salt|sugar)$/i;

function ingredientMatches(pickedLower, canonicalLower) {
  if (canonicalLower === pickedLower) return true;
  const derivative = canonicalLower.match(DERIVATIVE_SUFFIX_RE);
  if (derivative) {
    // Last word is a derivative product; only match if the user picked
    // exactly that word (already handled above as the full-string case)
    // or if the picked word IS the suffix itself.
    return pickedLower === derivative[1].toLowerCase();
  }
  // Otherwise: whole-word match, with a soft plural so "tomato" finds
  // "tomatoes" / "potato" finds "potatoes" / "onion" finds "onions".
  const escaped = pickedLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}(?:e?s)?\\b`).test(canonicalLower);
}

function scoreRecipe(recipe, haveLower) {
  const names = recipe.ingredientNames;
  let hits = 0;
  const matchedHave = [];
  const matchedNames = new Set();
  for (const picked of haveLower) {
    let found = false;
    for (const n of names) {
      if (ingredientMatches(picked, n)) { matchedNames.add(n); found = true; }
    }
    if (found) { hits++; matchedHave.push(picked); }
  }
  const missing = names.filter(n => !matchedNames.has(n));
  return { recipe, hits, matchedHave, matchedNames, missing, total: names.length };
}

function renderResults(scored, haveLower) {
  if (!scored.length) {
    return `<div class="empty-state"><div class="empty-state-title">No matches</div><p>None of the recipes use any of these ingredients. Try removing one or picking something more common.</p></div>`;
  }

  // Group by hit count so partial matches are visually separated from
  // full matches. With only 1 ingredient picked everything's a "full"
  // match (single section); with N picked we get a section per tier.
  const tiers = new Map();
  for (const s of scored) {
    if (!tiers.has(s.hits)) tiers.set(s.hits, []);
    tiers.get(s.hits).push(s);
  }
  // Within a tier, recipes with higher coverage (hits / recipe-total)
  // come first - those are the easiest to actually cook.
  for (const list of tiers.values()) list.sort((a, b) => (b.hits / b.total) - (a.hits / a.total));

  const total = haveLower.length;
  const tierKeys = [...tiers.keys()].sort((a, b) => b - a);
  const sections = tierKeys.map(hits => {
    const list = tiers.get(hits);
    const heading = total === 1
      ? `<h2 class="section-title">${list.length} recipe${list.length === 1 ? '' : 's'}</h2>`
      : hits === total
        ? `<h2 class="section-title pantry-tier-full">Uses all ${total} of your ingredients <span class="pantry-tier-count">${list.length}</span></h2>`
        : `<h2 class="section-title pantry-tier-partial">Uses ${hits} of your ${total} ingredients <span class="pantry-tier-count">${list.length}</span></h2>`;

    const cards = list.slice(0, 60).map(s => {
      const card = cardHtml(s.recipe, true);
      const pct = Math.round((s.hits / s.total) * 100);
      const missingLine = s.missing.length
        ? `<span class="pantry-result-missing">Needs: ${escapeHtml(s.missing.slice(0, 6).join(', '))}${s.missing.length > 6 ? `, +${s.missing.length - 6} more` : ''}</span>`
        : `<span class="pantry-result-missing pantry-result-complete">All ingredients in your pantry</span>`;
      const meta = `
        <div class="pantry-result-meta">
          <span class="pantry-result-score">${s.hits}/${s.total} of recipe (${pct}%)</span>
          ${missingLine}
        </div>
      `;
      return `<div class="pantry-result">${card}${meta}</div>`;
    }).join('');

    const overflow = list.length > 60
      ? `<p class="pantry-overflow">Showing top 60 of ${list.length} in this tier.</p>`
      : '';

    return `<section class="section pantry-tier"><div class="section-head">${heading}</div><div class="card-grid">${cards}</div>${overflow}</section>`;
  }).join('');

  return sections;
}

function bindPantrySearch(have) {
  const form = els.content.querySelector('.pantry-search');
  if (!form) return;
  const input = form.querySelector('#pantry-input');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim().toLowerCase();
    if (!value) return;
    if (have.some(h => h.toLowerCase() === value)) { input.value = ''; return; }
    navigate(pantryHash([...have, value]));
  });
}
