// Wraps allergen-bearing words inside the rendered Ingredients block in
// <mark class="allergen-mark" data-allergen="..."> elements. The mark
// itself is invisible until the user enables "Highlight allergens" in
// settings — the visibility flip lives in CSS via .allergens-highlighted
// on <html>. We always inject the marks so toggling the setting can be
// reflected purely in CSS without re-rendering.
//
// Only the recipe's own detected allergens drive the patterns we run, so
// a recipe with no allergens produces no marks (faster and avoids
// false-positive prose hits in adjacent items).

import { ALLERGEN_HIGHLIGHT_PATTERNS, ALLERGEN_LABELS } from '../allergens.js';
import { findIngredientItems } from './ingredients.js';

export function markAllergens(body, recipe) {
  const allergens = Array.isArray(recipe.allergens) ? recipe.allergens : [];
  if (!allergens.length) return;

  const patterns = allergens
    .map(key => ({ key, re: ALLERGEN_HIGHLIGHT_PATTERNS[key] }))
    .filter(p => p.re);
  if (!patterns.length) return;
  const items = findIngredientItems(body);
  for (const li of items) {
    walkAndMark(li, patterns);
  }
}

// Appends a "Contains" callout listing each detected allergen in bold.
// Always written to the DOM; the .allergen-footnote class is hidden by
// default and only displayed when the user toggles "Highlight allergens"
// in Settings (which sets html.allergens-highlighted on <html>).
export function appendAllergenFootnote(body, recipe) {
  const allergens = Array.isArray(recipe.allergens) ? recipe.allergens : [];
  if (!allergens.length) return;
  if (body.querySelector('.allergen-footnote')) return;
  const labels = allergens
    .map(k => ALLERGEN_LABELS[k] || k)
    .map(label => `<span class="allergen-footnote-item">${escapeText(label)}</span>`)
    .join('');
  const note = document.createElement('aside');
  note.className = 'allergen-footnote';
  note.setAttribute('aria-label', 'Allergen notice');
  note.innerHTML = `
    <span class="allergen-footnote-label">Contains</span>
    <span class="allergen-footnote-list">${labels}</span>
  `;
  body.appendChild(note);
}

function escapeText(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// DFS over text nodes inside `root`, replacing each plain-text node
// containing one of the allergen patterns with a fragment that has the
// matching span(s) wrapped in <mark>. Skips text inside an existing
// allergen mark so re-runs are idempotent.
function walkAndMark(root, patterns) {
  const targets = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      let p = node.parentElement;
      while (p && p !== root) {
        if (p.classList && p.classList.contains('allergen-mark')) return NodeFilter.FILTER_REJECT;
        // Don't mark inside controls / panels we've added (subs button etc.).
        if (p.tagName === 'BUTTON') return NodeFilter.FILTER_REJECT;
        p = p.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node;
  while ((node = walker.nextNode())) targets.push(node);

  for (const text of targets) {
    const fragment = buildMarked(text.nodeValue, patterns);
    if (fragment) text.parentNode.replaceChild(fragment, text);
  }
}

// Build a DocumentFragment from `value` with each pattern's matches
// wrapped in <mark>. Returns null when nothing matched so the caller
// can leave the original text node in place.
function buildMarked(value, patterns) {
  // Find all match ranges across every pattern, then merge overlaps so
  // the longest mark wins (e.g. 'peanut butter' over 'peanut').
  const ranges = [];
  for (const { key, re } of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(value)) !== null) {
      if (!m[0]) { re.lastIndex++; continue; }
      ranges.push({ start: m.index, end: m.index + m[0].length, key });
    }
  }
  if (!ranges.length) return null;

  ranges.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) {
      // Overlapping — keep the existing range (it started earlier or is
      // longer). Don't merge keys; we just use the first allergen as the
      // attribution since they all colour the same.
      if (r.end > last.end) last.end = r.end;
      continue;
    }
    merged.push({ ...r });
  }

  const frag = document.createDocumentFragment();
  let cursor = 0;
  for (const r of merged) {
    if (r.start > cursor) {
      frag.appendChild(document.createTextNode(value.slice(cursor, r.start)));
    }
    const mark = document.createElement('mark');
    mark.className = 'allergen-mark';
    mark.dataset.allergen = r.key;
    mark.textContent = value.slice(r.start, r.end);
    frag.appendChild(mark);
    cursor = r.end;
  }
  if (cursor < value.length) {
    frag.appendChild(document.createTextNode(value.slice(cursor)));
  }
  return frag;
}
