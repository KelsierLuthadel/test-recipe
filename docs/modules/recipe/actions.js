// Action toolbar: Save (favourite), Cooked, Cook (enter cooking mode), and
// the More overflow menu (mise / qr / copy / print / share). Each button has
// a data-action attribute so a single delegated click handler dispatches to
// the matching handler. flashAction is the small UI helper that toasts +
// briefly swaps the action label.

import { els, getCooked, toggleCooked } from '../state.js';
import { showToast } from '../ui/toast.js';
import { copyText, copyRich } from '../util/clipboard.js';
import { isSavedAnywhere } from '../collections.js';
import { openSavePicker, closeSavePicker } from './save-picker.js';
import { enterCookingMode } from './cooking-mode.js';
import { openMisePlace } from './mise.js';
import { openQrCode } from './qr.js';

// Save button + chevron. Click anywhere on the button opens the collection
// picker dropdown. The heart fills if the recipe is in any collection
// (Favourites or user-created).
export function favouriteButtonHtml(recipe) {
  const on = isSavedAnywhere(recipe.slug);
  const label = on ? 'Edit saved collections' : 'Save to a collection';
  return `
    <button type="button" class="action-btn favourite-btn ${on ? 'is-on' : ''}" data-action="save" aria-label="${label}" aria-haspopup="true" aria-expanded="false">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <span class="action-label">${on ? 'Saved' : 'Save'}</span>
      <svg class="save-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
  `;
}

// Empty circle for the unchecked state, tick for the checked state. The
// previous design showed a tick in both states, which read as "already
// cooked" even when the button was actually a "mark as cooked" affordance.
const COOKED_OFF_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>';
const COOKED_ON_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

export function cookedButtonHtml(recipe) {
  const on = !!getCooked(recipe.slug);
  const label = on ? 'Unmark as cooked' : 'Mark as cooked';
  return `
    <button type="button" class="action-btn cooked-btn ${on ? 'is-on' : ''}" data-action="cooked" aria-label="${label}" aria-pressed="${on}">
      ${on ? COOKED_ON_ICON : COOKED_OFF_ICON}
      <span class="action-label">${on ? 'Cooked ✓' : 'Cooked'}</span>
    </button>
  `;
}

export function bindRecipeActions(recipe) {
  const handle = (btn) => {
    const action = btn.dataset.action;
    if (action === 'copy') handleCopy(recipe, btn);
    else if (action === 'print') handlePrint();
    else if (action === 'share') handleShare(recipe, btn);
    else if (action === 'save') handleSave(recipe, btn);
    else if (action === 'cooked') handleCooked(recipe, btn);
    else if (action === 'cook-mode') enterCookingMode();
    else if (action === 'mise') openMisePlace(recipe);
    else if (action === 'qr') openQrCode(recipe);
  };

  els.content.querySelectorAll('.action-btn[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); handle(btn); });
  });

  // Overflow menu: click toggles, outside click + Escape close.
  const overflow = els.content.querySelector('.recipe-overflow');
  if (overflow) {
    const toggle = overflow.querySelector('.action-overflow-toggle');
    const menu = overflow.querySelector('.recipe-overflow-menu');
    const close = () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
    const onOutside = (e) => { if (!overflow.contains(e.target)) close(); };
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    toggle.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const wasOpen = !menu.hidden;
      menu.hidden = wasOpen;
      toggle.setAttribute('aria-expanded', String(!wasOpen));
      if (!wasOpen) {
        // Defer wiring outside-click so this very click doesn't immediately close.
        setTimeout(() => {
          document.addEventListener('click', onOutside);
          document.addEventListener('keydown', onEsc);
        }, 0);
      } else {
        document.removeEventListener('click', onOutside);
        document.removeEventListener('keydown', onEsc);
      }
    });
    menu.querySelectorAll('.overflow-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        close();
        handle(item);
      });
    });
  }
}

function handleCooked(recipe, btn) {
  const entry = toggleCooked(recipe.slug);
  const isOn = !!entry;
  btn.classList.toggle('is-on', isOn);
  btn.setAttribute('aria-pressed', String(isOn));
  btn.setAttribute('aria-label', isOn ? 'Unmark as cooked' : 'Mark as cooked');
  const label = btn.querySelector('.action-label');
  if (label) label.textContent = isOn ? 'Cooked ✓' : 'Cooked';
  // Swap the icon so the empty-circle / tick state mirrors the toggle.
  const svg = btn.querySelector('svg');
  if (svg) svg.outerHTML = isOn ? COOKED_ON_ICON : COOKED_OFF_ICON;
  flashAction(btn, isOn ? 'Logged' : 'Cleared');
}

// Click on the Save button opens (or closes) the collection picker. The
// picker calls back into refreshSaveButton on every change so the button's
// filled / "Saved" state mirrors live collection membership.
function handleSave(recipe, btn) {
  const wasOpen = btn.getAttribute('aria-expanded') === 'true';
  if (wasOpen) {
    closeSavePicker();
    btn.setAttribute('aria-expanded', 'false');
    return;
  }
  btn.setAttribute('aria-expanded', 'true');
  openSavePicker(btn, recipe, () => refreshSaveButton(btn, recipe));
  // Hook a one-shot listener that resets aria-expanded when the picker
  // is dismissed (outside click or Escape).
  const restoreOnClose = () => {
    btn.setAttribute('aria-expanded', 'false');
  };
  // The picker module re-uses the panel element; we observe its hidden
  // attribute to know when the picker was closed externally.
  const observer = new MutationObserver(() => {
    const panel = document.querySelector('.save-picker');
    if (!panel || panel.hidden) {
      restoreOnClose();
      observer.disconnect();
    }
  });
  setTimeout(() => {
    const panel = document.querySelector('.save-picker');
    if (panel) observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  }, 0);
}

// Update the Save button's filled / aria state without re-rendering the
// whole toolbar. Called by the picker on each toggle.
function refreshSaveButton(btn, recipe) {
  const on = isSavedAnywhere(recipe.slug);
  btn.classList.toggle('is-on', on);
  btn.setAttribute('aria-label', on ? 'Edit saved collections' : 'Save to a collection');
  const label = btn.querySelector('.action-label');
  if (label) label.textContent = on ? 'Saved' : 'Save';
  // The heart svg is the first <svg> inside the button (the chevron is the second).
  const heart = btn.querySelector('svg');
  if (heart) heart.setAttribute('fill', on ? 'currentColor' : 'none');
}

async function handleCopy(recipe, btn) {
  try {
    const body = document.getElementById('recipe-body');
    if (!body || body.querySelector('.loading-state, .error-state')) {
      flashAction(btn, 'Still loading');
      return;
    }
    await copyRich(body.innerText, body.innerHTML);
    flashAction(btn, 'Copied');
  } catch (err) {
    flashAction(btn, 'Copy failed');
  }
}

function handlePrint() {
  window.print();
}

async function handleShare(recipe, btn) {
  const url = window.location.href;
  const shareData = {
    title: recipe.title,
    text: recipe.overview ? `${recipe.title}: ${recipe.overview}` : recipe.title,
    url,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }
  try {
    await copyText(url);
    flashAction(btn, 'Link copied');
  } catch (err) {
    flashAction(btn, 'Share failed');
  }
}

// Toast + briefly swap an action button's visible label, then restore.
// Exported because share.js (shopping list) reuses it for Copied/Share-failed flashes.
export function flashAction(btn, text) {
  showToast(text);
  const label = btn && btn.querySelector && btn.querySelector('.action-label');
  if (label) {
    const original = label.textContent;
    label.textContent = text;
    btn.classList.add('is-flashed');
    clearTimeout(btn._flashTimer);
    btn._flashTimer = setTimeout(() => {
      label.textContent = original;
      btn.classList.remove('is-flashed');
    }, 1500);
  }
}
