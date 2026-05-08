// "Mise en place" modal: scans the ingredient list for items that need
// preparation work (chopped, diced, julienned…) and renders them as a
// checkable list inside the shared modal. If nothing matches, a friendly
// "no prep needed" message is shown instead of an empty list.

import { openModal } from '../ui/modal.js';
import { escapeHtml } from '../util/dom.js';
import { findIngredientItems } from './ingredients.js';

// Keywords that signal an ingredient needs prep work before cooking.
const PREP = /(chopped|finely\s+chopped|roughly\s+chopped|diced|finely\s+diced|minced|sliced|finely\s+sliced|thinly\s+sliced|grated|finely\s+grated|peeled|crushed|deseeded|de-seeded|julienned|pounded|halved|quartered|cubed|bruised|cut\s+into[^,)]*|deveined|de-veined|shredded|crumbled|broken|trimmed|stoned|cored|zested|toasted|melted|softened|whisked|lightly\s+whisked|beaten|drained|rinsed|squeezed|chunks|strips)/i;

export function openMisePlace(recipe) {
  const body = document.getElementById('recipe-body');
  if (!body) return;
  const items = findIngredientItems(body);
  if (!items.length) return;

  const work = [];
  for (const li of items) {
    const text = li.textContent.replace(/\s+/g, ' ').trim();
    if (PREP.test(text)) work.push(text);
  }
  if (!work.length) {
    openModal('No prep work needed', '<p>This recipe has no ingredients that need chopping, slicing or other preparation.</p>');
    return;
  }
  const list = work.map(t => `
    <li class="mise-item">
      <label>
        <input type="checkbox">
        <span>${escapeHtml(t)}</span>
      </label>
    </li>
  `).join('');
  openModal(
    'Mise en place',
    `<p class="mise-intro">${work.length} item${work.length === 1 ? '' : 's'} to prep before cooking. Tap each one as you finish.</p><ul class="mise-list">${list}</ul>`,
  );
}
