// Recipe metadata chip row inserted directly above the first h2: serves
// (with +/- if numeric), prep time, cook time, and a 5-star rating chip
// the user can click. Persisted ratings come from state via getRating/setRating.

import { getRating, setRating } from '../state.js';
import { escapeHtml } from '../util/dom.js';
import { bindServesScaler } from './scaling.js';

export function insertRecipeChips(body, recipe) {
  const servesNum = recipe.serves ? parseInt(String(recipe.serves), 10) : NaN;
  const servesIsScalable = Number.isFinite(servesNum) && servesNum > 0;

  const chips = [];
  if (recipe.serves) {
    chips.push({ kind: 'serves', label: 'Serves', value: recipe.serves, num: servesNum });
  }
  if (recipe.prepTime) chips.push({ kind: 'prep', label: 'Prep', value: recipe.prepTime });
  if (recipe.cookTime) chips.push({ kind: 'cook', label: 'Cook', value: recipe.cookTime });
  // Always show rating chip so users can rate even when no other metadata exists.
  chips.push({ kind: 'rating' });
  if (!chips.length) return;

  const html = `<div class="recipe-chips">${chips.map(c => {
    if (c.kind === 'serves' && servesIsScalable) {
      return `<span class="info-chip serves-chip" data-original-serves="${c.num}">
        <span class="info-chip-label">${escapeHtml(c.label)}</span>
        <button type="button" class="serves-step" data-step="-1" aria-label="Decrease servings">&minus;</button>
        <span class="info-chip-value serves-value">${escapeHtml(String(c.num))}</span>
        <button type="button" class="serves-step" data-step="+1" aria-label="Increase servings">+</button>
      </span>`;
    }
    if (c.kind === 'rating') {
      return ratingChipHtml(recipe);
    }
    return `<span class="info-chip"><span class="info-chip-label">${escapeHtml(c.label)}</span><span class="info-chip-value">${escapeHtml(c.value)}</span></span>`;
  }).join('')}</div>`;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const chipEl = wrapper.firstElementChild;
  const firstH2 = body.querySelector('h2');
  if (firstH2) firstH2.parentNode.insertBefore(chipEl, firstH2);
  else body.insertBefore(chipEl, body.firstChild);

  if (servesIsScalable) bindServesScaler(body);
  bindRatingChip(body, recipe);
}

function ratingChipHtml(recipe) {
  const value = getRating(recipe.slug);
  const starSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 14.81 8.62 22 9.27 16.55 14.14 18.18 21.02 12 17.27 5.82 21.02 7.45 14.14 2 9.27 9.19 8.62 12 2"/></svg>';
  const stars = [1, 2, 3, 4, 5].map(n =>
    `<button type="button" class="rating-star ${value >= n ? 'is-on' : ''}" data-value="${n}" aria-label="Rate ${n} of 5" aria-pressed="${value === n}">${starSvg}</button>`,
  ).join('');
  const reset = `<button type="button" class="rating-reset" aria-label="Clear rating" data-action="reset" ${value > 0 ? '' : 'hidden'}>×</button>`;
  return `<span class="info-chip rating-chip" data-value="${value}">
    <span class="info-chip-label">Rate</span>
    <span class="rating-stars" role="group" aria-label="Recipe rating">${stars}</span>
    ${reset}
  </span>`;
}

function bindRatingChip(body, recipe) {
  const chip = body.querySelector('.rating-chip');
  if (!chip) return;
  chip.addEventListener('click', (e) => {
    const star = e.target.closest('.rating-star');
    const reset = e.target.closest('.rating-reset');
    if (reset) {
      applyRating(chip, recipe, 0);
      return;
    }
    if (star) {
      const n = parseInt(star.dataset.value, 10);
      const current = parseInt(chip.dataset.value, 10) || 0;
      // Tapping the currently-set value clears the rating.
      applyRating(chip, recipe, n === current ? 0 : n);
    }
  });
}

function applyRating(chip, recipe, value) {
  setRating(recipe.slug, value);
  chip.dataset.value = String(value);
  chip.querySelectorAll('.rating-star').forEach(btn => {
    const n = parseInt(btn.dataset.value, 10);
    const on = value >= n;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(value === n));
  });
  const reset = chip.querySelector('.rating-reset');
  if (reset) reset.toggleAttribute('hidden', value === 0);
}
