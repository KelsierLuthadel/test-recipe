// Single-collection page (#/saved/<id>) and the back-compat /favourites
// route both render through this module so the layout stays consistent.
//
// Built-in Favourites gets the heart icon empty state; user collections
// get a generic "no recipes yet" state with a hint to use the Save picker.

import { state, setContent, els } from '../state.js';
import {
  findCollection,
  renameCollection,
  deleteCollection,
  FAVOURITES_ID,
} from '../collections.js';
import { navigate, collectionHash } from '../routes.js';
import { cardHtml } from '../cards.js';
import { escapeHtml, escapeAttr } from '../util/dom.js';
import {
  emptyStateHtml,
  ICON_HEART,
  ICON_NOTE,
} from '../ui/empty-state.js';
import { showToast } from '../ui/toast.js';
import { renderNotFound } from './not-found.js';
import { visibleRecipes } from '../allergens.js';

const BACK_ARROW = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const BACK_BTN = `<div class="page-back"><a class="back-button" href="#/">${BACK_ARROW}Back to Home</a></div>`;

export function renderCollection(id) {
  const c = findCollection(id);
  if (!c) return renderNotFound(`Collection "${id}" not found.`);

  const recipes = visibleRecipes(c.slugs
    .map(slug => state.recipeBySlug.get(slug))
    .filter(Boolean));

  const eyebrow = c.builtin ? 'Saved' : 'Collection';
  // The title row holds the page title and the ⋯ manage menu for
  // user-created collections. Favourites is read-only.
  const manageBtnHtml = c.builtin ? '' : manageMenuHtml();
  const titleRow = `
    <div class="collection-title-row">
      <h1 class="page-title" id="collection-title" data-id="${escapeAttr(c.id)}">${escapeHtml(c.name)}</h1>
      ${manageBtnHtml}
    </div>
  `;

  const bodyHtml = recipes.length
    ? `<section class="section"><div class="card-grid">${recipes.map(r => cardHtml(r, true)).join('')}</div></section>`
    : emptyStateForCollection(c);

  const subText = recipes.length
    ? `<p class="page-sub">${recipes.length} recipe${recipes.length === 1 ? '' : 's'} saved in this browser.</p>`
    : '';

  setContent(`
    <div class="fade-in">
      ${BACK_BTN}
      <header class="page-header">
        <div class="page-eyebrow">${eyebrow}</div>
        ${titleRow}
        ${subText}
      </header>
      ${bodyHtml}
    </div>
  `);

  if (!c.builtin) bindManageMenu(c);
}

function manageMenuHtml() {
  return `
    <div class="collection-manage">
      <button type="button" class="collection-manage-toggle" aria-label="Manage collection" aria-haspopup="true" aria-expanded="false">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
      </button>
      <div class="collection-manage-menu" role="menu" hidden>
        <button type="button" class="collection-manage-item" data-action="rename" role="menuitem">Rename</button>
        <button type="button" class="collection-manage-item" data-action="delete" role="menuitem">Delete</button>
      </div>
    </div>
  `;
}

// Wire up the ⋯ toggle, the Rename and Delete menu items, and the inline
// rename input that replaces the h1 when Rename is chosen.
function bindManageMenu(collection) {
  const wrap = els.content.querySelector('.collection-manage');
  if (!wrap) return;
  const toggle = wrap.querySelector('.collection-manage-toggle');
  const menu = wrap.querySelector('.collection-manage-menu');

  const close = () => {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', onOutside);
    document.removeEventListener('keydown', onEsc);
  };
  const onOutside = (e) => { if (!wrap.contains(e.target)) close(); };
  const onEsc = (e) => { if (e.key === 'Escape') close(); };

  toggle.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const wasOpen = !menu.hidden;
    menu.hidden = wasOpen;
    toggle.setAttribute('aria-expanded', String(!wasOpen));
    if (!wasOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', onOutside);
        document.addEventListener('keydown', onEsc);
      }, 0);
    } else {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    }
  });

  menu.querySelectorAll('.collection-manage-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      close();
      const action = item.dataset.action;
      if (action === 'rename') startRename(collection);
      else if (action === 'delete') confirmDelete(collection);
    });
  });
}

// Replace the title h1 with an input. Enter or blur commits, Esc cancels.
function startRename(collection) {
  const titleEl = els.content.querySelector('#collection-title');
  if (!titleEl) return;
  const original = collection.name;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'collection-rename-input';
  input.value = original;
  input.maxLength = 60;
  input.setAttribute('aria-label', 'Collection name');
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  let committed = false;
  const commit = () => {
    if (committed) return;
    committed = true;
    const next = input.value.trim();
    if (next && next !== original) {
      if (renameCollection(collection.id, next)) {
        showToast('Collection renamed');
      }
    }
    // Re-fire the current route so the sidebar + breadcrumb + page title
    // pick up the new name as well as the page itself.
    navigate(collectionHash(collection.id));
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    else if (e.key === 'Escape') {
      committed = true;
      navigate(collectionHash(collection.id));
    }
  });
  input.addEventListener('blur', commit);
}

function confirmDelete(collection) {
  const recipeCount = collection.slugs.length;
  const detail = recipeCount
    ? ` ${recipeCount} recipe${recipeCount === 1 ? '' : 's'} will stay in your other lists if applicable.`
    : '';
  const ok = window.confirm(`Delete the collection "${collection.name}"?${detail}`);
  if (!ok) return;
  if (deleteCollection(collection.id)) {
    showToast('Collection deleted');
    navigate('#/');
  }
}

function emptyStateForCollection(c) {
  if (c.id === FAVOURITES_ID) {
    return emptyStateHtml(
      ICON_HEART,
      'No favourites yet',
      'Open any recipe and tap Save. Favourites are stored in this browser only.',
    );
  }
  return emptyStateHtml(
    ICON_NOTE,
    'This collection is empty',
    'Open a recipe and use the Save dropdown to add it here. Collections live in this browser only.',
  );
}
