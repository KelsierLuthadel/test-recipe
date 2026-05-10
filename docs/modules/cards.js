// Recipe card and category tile rendering. Cards are cloned from the
// <template id="tpl-recipe-card"> in index.html, then populated with image,
// title, overview, time, rating, tags and a "notes saved" pill.
//
// Search highlighting is bundled here because cardHtml is the only caller —
// search results pages render via cardHtml(recipe, true, query).

import { escapeHtml, escapeAttr, escapeRegex } from './util/dom.js';
import { parseToMinutes, shortFormat } from './util/time.js';
import { shuffleAndTake } from './util/arrays.js';
import { els, state } from './state.js';
import { rawUrl, categoryNode, flattenRecipes } from './manifest.js';
import { recipeHash, categoryHash } from './routes.js';
import { TAG_LABELS } from './tags.js';
import { recipeBlockedByAllergens } from './allergens.js';

// Top-level categories whose recipes shouldn't bubble up to "featured" on the
// home page (they're component recipes, not finished dishes).
const FEATURED_EXCLUDED_TOP = new Set(['base-ingredients', 'sauces', 'coulis', 'sponge']);
const FEATURED_EXCLUDED_PATH = /(?:^|\/)(?:spices|spice-mixes)(?:\/|$)/i;

// Tags surfaced as coloured pills over the card image. Kept short on
// purpose: pills are at-a-glance signals, not the full taxonomy. The
// chip row above the card grid handles broad filtering and the recipe
// page lists every tag. cards.css gives each of these its own colour.
const CARD_PILL_TAGS = new Set(['vegetarian', 'quick', 'spicy']);

export function cardTotalTime(recipe) {
  const total = parseToMinutes(recipe.prepTime) + parseToMinutes(recipe.cookTime);
  return total > 0 ? shortFormat(total) : null;
}

export function catTileHtml(c) {
  const overview = c.overview ? `<span class="cat-tile-overview">${escapeHtml(c.overview)}</span>` : '';
  return `
    <a class="cat-tile" href="${categoryHash(c.path)}">
      <span class="cat-tile-name">${escapeHtml(c.label)}</span>
      ${overview}
      <span class="cat-tile-meta">${c.recipeCount} recipe${c.recipeCount === 1 ? '' : 's'}</span>
    </a>
  `;
}

export function cardHtml(recipe, showCategoryTag = false, highlight = null) {
  const tpl = els.cardTpl.content.firstElementChild.cloneNode(true);
  tpl.setAttribute('href', recipeHash(recipe.slug));

  const media = tpl.querySelector('.card-media');
  const img = media.querySelector('img');
  if (recipe.image) {
    img.setAttribute('src', rawUrl(recipe.image));
    img.setAttribute('alt', recipe.title);
  } else {
    media.classList.add('is-empty');
    img.remove();
  }

  const titleEl = tpl.querySelector('.card-title');
  titleEl.innerHTML = highlight ? highlightText(recipe.title, highlight) : escapeHtml(recipe.title);

  const overviewEl = tpl.querySelector('.card-overview');
  if (recipe.overview) {
    overviewEl.innerHTML = highlight ? highlightSnippet(recipe.overview, highlight, 160) : escapeHtml(recipe.overview);
  } else {
    overviewEl.remove();
  }

  const tagEl = tpl.querySelector('.card-tag');
  if (showCategoryTag) {
    const cat = categoryNode(recipe.categoryPath);
    tagEl.textContent = cat ? cat.label : '';
  } else {
    tagEl.remove();
  }

  const servesEl = tpl.querySelector('.card-serves');
  if (recipe.serves) servesEl.textContent = `Serves ${recipe.serves}`;
  else servesEl.remove();

  const timeEl = tpl.querySelector('.card-time');
  const timeText = cardTotalTime(recipe);
  if (timeText) {
    timeEl.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${escapeHtml(timeText)}`;
  } else {
    timeEl.remove();
  }

  const ratingEl = tpl.querySelector('.card-rating');
  const rating = state.ratings && state.ratings[recipe.slug];
  if (rating) {
    ratingEl.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 14.81 8.62 22 9.27 16.55 14.14 18.18 21.02 12 17.27 5.82 21.02 7.45 14.14 2 9.27 9.19 8.62 12 2"/></svg> ${rating}`;
    ratingEl.setAttribute('title', `Rated ${rating} of 5`);
  } else {
    ratingEl.remove();
  }

  // Drop the meta wrapper if it ended up empty (no time AND no serves AND no rating).
  const metaEl = tpl.querySelector('.card-meta');
  if (metaEl && !metaEl.children.length) metaEl.remove();

  const tagsEl = tpl.querySelector('.card-tags');
  if (tagsEl) {
    const tags = (recipe.tags || []).filter(t => CARD_PILL_TAGS.has(t) && TAG_LABELS[t]);
    const hasNote = state.notesSlugs && state.notesSlugs.has(recipe.slug);
    const tagPillsHtml = tags.map(t => `<span class="card-tag-pill" data-tag="${escapeAttr(t)}">${escapeHtml(TAG_LABELS[t])}</span>`).join('');
    const notePill = hasNote
      ? `<span class="card-note-pill" title="You have notes on this recipe" aria-label="Personal notes saved"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg></span>`
      : '';
    if (tagPillsHtml || notePill) {
      tagsEl.innerHTML = notePill + tagPillsHtml;
    } else {
      tagsEl.remove();
    }
  }

  return tpl.outerHTML;
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const re = new RegExp(`(${escapeRegex(query)})`, 'ig');
  return escapeHtml(text).replace(re, '<mark>$1</mark>');
}

// Show a snippet of text centred on the first match, with ellipses if trimmed.
function highlightSnippet(text, query, maxLen = 160) {
  if (!query) return escapeHtml(text);
  const re = new RegExp(escapeRegex(query), 'i');
  const m = re.exec(text);
  if (!m) return highlightText(text, query);
  const matchStart = m.index;
  const halfBefore = Math.max(20, Math.floor((maxLen - query.length) / 3));
  let start = Math.max(0, matchStart - halfBefore);
  let end = Math.min(text.length, start + maxLen);
  // Try to expand to a word boundary so the snippet doesn't slice mid-word.
  if (start > 0) {
    const ws = text.lastIndexOf(' ', start);
    if (ws > 0 && ws > start - 10) start = ws + 1;
  }
  if (end < text.length) {
    const we = text.indexOf(' ', end);
    if (we !== -1 && we < end + 10) end = we;
  }
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '… ' + snippet;
  if (end < text.length) snippet = snippet + ' …';
  return highlightText(snippet, query);
}

export function pickFeatured(n) {
  const candidates = state.flatRecipes.filter(r => {
    if (!r.image || !r.overview) return false;
    const top = r.path.split('/')[0];
    if (FEATURED_EXCLUDED_TOP.has(top)) return false;
    if (FEATURED_EXCLUDED_PATH.test(r.path)) return false;
    if (recipeBlockedByAllergens(r)) return false;
    return true;
  });
  return shuffleAndTake(candidates, n);
}

export function pickCategoryFeatured(node, n) {
  const candidates = flattenRecipes(node).filter(r => {
    if (!r.image || !r.overview) return false;
    // Skip spice / spice-mix recipes regardless of which sub-tree they live in.
    if (FEATURED_EXCLUDED_PATH.test(r.path)) return false;
    if (recipeBlockedByAllergens(r)) return false;
    return true;
  });
  return shuffleAndTake(candidates, n);
}
