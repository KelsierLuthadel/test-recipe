// "Shopping list" button injected into the Ingredients h2. Builds a plain-text
// list (with sub-list h3s preserved as section breaks), copies it to the
// clipboard in both text/plain and text/html flavours so rich-text targets
// like Gmail keep line breaks, and on mobile also opens the share sheet.

import { escapeHtml } from '../util/dom.js';
import { copyRich } from '../util/clipboard.js';
import { findIngredientItems, isIngredientsHeading } from './ingredients.js';
import { flashAction } from './actions.js';

export function insertIngredientsShareButton(body, recipe) {
  const headings = body.querySelectorAll('h2');
  for (const h of headings) {
    if (!isIngredientsHeading(h)) continue;
    const items = findIngredientItems(body);
    if (!items.length) return;

    h.classList.add('has-section-action');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'section-action-btn';
    btn.setAttribute('aria-label', 'Copy ingredients as a shopping list');
    btn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
      <span class="action-label">Shopping list</span>
    `;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      handleShareIngredients(body, recipe, btn);
    });
    h.appendChild(btn);
    return;
  }
}

async function writeShoppingListToClipboard(text) {
  // Wrap each line in <br> so Gmail's compose paste keeps line breaks
  // (it strips '\n' but honours block-level / <br> structure).
  const html = '<div>' +
    text.split(/\r?\n/)
      .map(l => (escapeHtml(l) ? escapeHtml(l) + '<br>' : '<br>'))
      .join('') +
    '</div>';
  await copyRich(text, html);
}

function buildShoppingListText(body, recipe) {
  const headings = body.querySelectorAll('h2');
  for (const h of headings) {
    if (!isIngredientsHeading(h)) continue;
    const lines = [`${recipe.title} - Ingredients`];
    // Use the (possibly scaled) value from the chip if present, else the recipe default.
    const servesEl = body.querySelector('.serves-value');
    const serves = servesEl ? servesEl.textContent.trim() : recipe.serves;
    if (serves) lines.push(`Serves ${serves}`);
    lines.push('');
    let sib = h.nextElementSibling;
    while (sib && sib.tagName !== 'H2') {
      if (sib.tagName === 'H3') {
        lines.push('');
        lines.push(sib.textContent.trim());
      } else if (sib.tagName === 'UL') {
        sib.querySelectorAll('li').forEach(li => {
          const text = li.textContent.replace(/\s+/g, ' ').trim();
          if (text) lines.push('- ' + text);
        });
      }
      sib = sib.nextElementSibling;
    }
    return lines.join('\n');
  }
  return '';
}

async function handleShareIngredients(body, recipe, btn) {
  const text = buildShoppingListText(body, recipe);
  if (!text) {
    flashAction(btn, 'Nothing to copy');
    return;
  }
  // Always put the contents on the clipboard first.
  let copyOk = false;
  try {
    await writeShoppingListToClipboard(text);
    copyOk = true;
  } catch (err) {
    /* may fail in non-secure contexts; we still try the share sheet on mobile */
  }

  // On mobile (narrow viewport with the Web Share API), also open the share sheet.
  const isMobile = window.matchMedia && window.matchMedia('(max-width: 720px)').matches;
  if (isMobile && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        // Some iOS share targets collapse plain '\n' into spaces; CRLF survives.
        text: text.replace(/\r?\n/g, '\r\n'),
      });
      return; // sheet provided its own visual feedback
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        flashAction(btn, copyOk ? 'Copied' : 'Share failed');
        return;
      }
    }
  }

  flashAction(btn, copyOk ? 'Copied' : 'Copy failed');
}
