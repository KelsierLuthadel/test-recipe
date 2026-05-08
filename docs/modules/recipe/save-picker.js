// Dropdown panel that opens from the Save chevron on the recipe page.
// Lists every collection (Favourites first), each as a checkbox row;
// clicking a row toggles membership for the current recipe. Bottom row is
// "+ New collection..." which expands an inline input.
//
// The Save button itself is rendered in actions.js; this module only owns
// the dropdown panel and its click handlers. The button asks us to open
// the panel by calling openSavePicker(button, recipe, onChange).

import { escapeHtml, escapeAttr } from '../util/dom.js';
import {
  listCollections,
  isInCollection,
  addToCollection,
  removeFromCollection,
  createCollection,
} from '../collections.js';

let panelEl = null;
let outsideHandler = null;
let escHandler = null;

function ensurePanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement('div');
  panelEl.className = 'save-picker';
  panelEl.hidden = true;
  document.body.appendChild(panelEl);
  return panelEl;
}

function close() {
  if (!panelEl) return;
  panelEl.hidden = true;
  panelEl.classList.remove('is-open');
  if (outsideHandler) {
    document.removeEventListener('mousedown', outsideHandler);
    outsideHandler = null;
  }
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }
}

// Render the picker contents fresh each open so the checked state reflects
// any changes made elsewhere (e.g. user toggled the heart on a card).
function renderPanel(recipe, onChange) {
  const slug = recipe.slug;
  const list = listCollections();
  const rowsHtml = list.map(c => {
    const checked = isInCollection(c.id, slug);
    return `
      <label class="save-picker-row" data-id="${escapeAttr(c.id)}">
        <input type="checkbox" ${checked ? 'checked' : ''}>
        <span class="save-picker-row-name">${escapeHtml(c.name)}</span>
        ${c.builtin ? '<span class="save-picker-row-tag">Built-in</span>' : ''}
      </label>
    `;
  }).join('');

  panelEl.innerHTML = `
    <div class="save-picker-head">Saved to</div>
    <div class="save-picker-rows">${rowsHtml}</div>
    <div class="save-picker-foot">
      <button type="button" class="save-picker-new-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New collection
      </button>
      <form class="save-picker-new-form" hidden>
        <input type="text" class="save-picker-new-input" placeholder="Collection name" maxlength="60">
        <button type="submit" class="save-picker-new-add">Add</button>
      </form>
    </div>
  `;

  panelEl.querySelectorAll('.save-picker-row').forEach(row => {
    const id = row.dataset.id;
    const cb = row.querySelector('input[type="checkbox"]');
    cb.addEventListener('change', () => {
      if (cb.checked) addToCollection(id, slug);
      else removeFromCollection(id, slug);
      if (typeof onChange === 'function') onChange();
    });
  });

  const newBtn = panelEl.querySelector('.save-picker-new-btn');
  const newForm = panelEl.querySelector('.save-picker-new-form');
  const newInput = panelEl.querySelector('.save-picker-new-input');
  newBtn.addEventListener('click', () => {
    newBtn.hidden = true;
    newForm.hidden = false;
    newInput.focus();
  });
  newForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = newInput.value.trim();
    if (!name) return;
    const created = createCollection(name);
    if (!created) return;
    // Auto-add the current recipe to the brand-new collection.
    addToCollection(created.id, slug);
    if (typeof onChange === 'function') onChange();
    renderPanel(recipe, onChange);
  });
}

// Position the panel under the trigger button. Falls back to opening
// upwards if the dropdown would clip the bottom of the viewport.
function position(button) {
  const rect = button.getBoundingClientRect();
  const panel = panelEl;
  panel.style.minWidth = `${Math.max(rect.width, 220)}px`;
  // First measure with default placement, then reposition if needed.
  panel.style.top = `${rect.bottom + window.scrollY + 6}px`;
  panel.style.left = `${rect.left + window.scrollX}px`;
  panel.style.right = 'auto';
  // After paint, check overflow on the right edge.
  requestAnimationFrame(() => {
    const pr = panel.getBoundingClientRect();
    if (pr.right > window.innerWidth - 12) {
      panel.style.left = 'auto';
      panel.style.right = `${window.innerWidth - rect.right + 8}px`;
    }
  });
}

export function openSavePicker(button, recipe, onChange) {
  ensurePanel();
  renderPanel(recipe, onChange);
  panelEl.hidden = false;
  panelEl.classList.add('is-open');
  position(button);

  outsideHandler = (e) => {
    if (panelEl.contains(e.target) || button.contains(e.target)) return;
    close();
  };
  escHandler = (e) => { if (e.key === 'Escape') close(); };
  // Defer wiring outside-click so this very click doesn't immediately close.
  setTimeout(() => {
    document.addEventListener('mousedown', outsideHandler);
    document.addEventListener('keydown', escHandler);
  }, 0);
}

export function closeSavePicker() {
  close();
}
