// Settings page (#/settings). Three sections: appearance toggles, home-page
// section toggles, and a "clear all data" button. The toggles are wired to
// theme/state mutators so they stay in sync with the topbar buttons and
// localStorage.

import {
  state,
  els,
  HOME_SECTION_DEFS,
  saveHomeSections,
  setContent,
} from '../state.js';
import * as storage from '../storage.js';
import { setThemePref, setTextSizePref } from '../theme.js';
import { showToast } from '../ui/toast.js';
import { escapeAttr, escapeHtml } from '../util/dom.js';
import {
  ALLERGEN_KEYS,
  ALLERGEN_LABELS,
  setHide,
  setHighlight,
} from '../allergens.js';
import { setWineVisible } from '../recipe/wine-pairings.js';
import { setSidesVisible } from '../recipe/side-pairings.js';
import { THEMES, THEME_KEYS } from '../themes.js';

const BACK_ARROW = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const BACK_BTN = `<div class="page-back"><a class="back-button" href="#/">${BACK_ARROW}Back to Home</a></div>`;

function settingsRowHtml(idAttr, label, checked, dataAttrs) {
  return `
    <label class="settings-row" for="${escapeAttr(idAttr)}">
      <span class="settings-row-label">${escapeHtml(label)}</span>
      <span class="settings-toggle">
        <input type="checkbox" id="${escapeAttr(idAttr)}" ${dataAttrs} ${checked ? 'checked' : ''}>
        <span class="settings-toggle-track"><span class="settings-toggle-knob"></span></span>
      </span>
    </label>
  `;
}

export function renderSettings() {
  const sectionRows = HOME_SECTION_DEFS.map(def => {
    const checked = state.homeSections.has(def.id);
    return settingsRowHtml(`section-${def.id}`, def.label, checked, `data-section="${escapeAttr(def.id)}"`);
  }).join('');

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'linen';
  const isLarge = document.documentElement.getAttribute('data-text-size') === 'large';
  const themeChips = THEME_KEYS.map(key => {
    const meta = THEMES[key];
    const checked = currentTheme === key;
    return `
      <label class="settings-theme-chip ${meta.family === 'dark' ? 'is-dark' : ''} ${checked ? 'is-active' : ''}">
        <input type="radio" name="theme-pref" value="${escapeAttr(key)}" data-theme-name ${checked ? 'checked' : ''}>
        <span class="settings-theme-swatch" data-swatch="${escapeAttr(key)}" aria-hidden="true"></span>
        <span class="settings-theme-label">${escapeHtml(meta.label)}</span>
        <span class="settings-theme-family">${meta.family === 'dark' ? 'Dark' : 'Light'}</span>
      </label>
    `;
  }).join('');
  const themeRow = `<div class="settings-theme-grid">${themeChips}</div>`;
  const textSizeRow = settingsRowHtml('pref-text-size', 'Larger text', isLarge, 'data-pref="text-size-large"');

  const winePrefs = state.wine || { visible: true };
  const wineRow = settingsRowHtml(
    'wine-show',
    'Show wine pairings',
    !!winePrefs.visible,
    'data-wine-pref="visible"',
  );
  const sidesPrefs = state.sides || { visible: true };
  const sidesRow = settingsRowHtml(
    'sides-show',
    'Show side pairings',
    !!sidesPrefs.visible,
    'data-sides-pref="visible"',
  );

  const allergenPrefs = state.allergens || { hide: [], highlight: false };
  const hideSet = new Set(allergenPrefs.hide || []);
  const highlightRow = settingsRowHtml(
    'allergens-highlight',
    'Highlight allergens on recipe page',
    !!allergenPrefs.highlight,
    'data-allergen-pref="highlight"',
  );
  const hideRows = ALLERGEN_KEYS.map(key =>
    settingsRowHtml(
      `allergens-hide-${key}`,
      `Hide recipes with ${ALLERGEN_LABELS[key].toLowerCase()}`,
      hideSet.has(key),
      `data-allergen-hide="${escapeAttr(key)}"`,
    ),
  ).join('');

  setContent(`
    <div class="fade-in">
      ${BACK_BTN}
      <header class="page-header">
        <div class="page-eyebrow">Configuration</div>
        <h1 class="page-title">Settings</h1>
        <p class="page-sub">All preferences are saved in this browser only.</p>
      </header>

      <section class="section">
        <h2 class="section-title">Appearance</h2>
        <p class="page-meta" style="margin-bottom:0.75rem">Pick a theme. The topbar's day/night button flips between each theme and its dark/light counterpart (Linen ↔ Cast Iron, Mint ↔ Midnight, Blush ↔ Plum).</p>
        ${themeRow}
        <div class="settings-list" style="margin-top:1rem">${textSizeRow}</div>
      </section>

      <section class="section">
        <h2 class="section-title">Home page sections</h2>
        <p class="page-meta" style="margin-bottom:0.75rem">Each enabled section shows up to 4 cards on the home page, with a "View all" link when there's more.</p>
        <div class="settings-list">${sectionRows}</div>
      </section>

      <section class="section">
        <h2 class="section-title">Pairings</h2>
        <p class="page-meta" style="margin-bottom:0.75rem">Wine and side suggestions appear at the top of meal and dessert recipes. All pairings are heuristic; adjust to your own taste.</p>
        <div class="settings-list">${wineRow}${sidesRow}</div>
      </section>

      <section class="section">
        <h2 class="section-title">Allergens</h2>
        <p class="page-meta" style="margin-bottom:0.75rem">Detection is heuristic. Always read the full ingredients list before cooking, and check labels for processed ingredients.</p>
        <div class="settings-list">${highlightRow}</div>
        <p class="page-meta" style="margin:0.75rem 0">Hide recipes containing any of these:</p>
        <div class="settings-list">${hideRows}</div>
      </section>

      ${state.manifest.repo ? `
      <section class="section">
        <h2 class="section-title">About</h2>
        <p class="page-meta">
          ${state.manifest.version ? `Running version <a href="https://github.com/${state.manifest.repo}/releases/tag/${encodeURIComponent(state.manifest.version)}" target="_blank" rel="noopener">${escapeHtml(state.manifest.version)}</a>. ` : ''}
          See <a href="https://github.com/${state.manifest.repo}/releases" target="_blank" rel="noopener">what's new</a> on GitHub.
        </p>
      </section>
      ` : ''}

      <section class="section">
        <h2 class="section-title">Data</h2>
        <p class="page-meta" style="margin-bottom:0.75rem">All preferences and saved data live in this browser only. Clearing wipes favourites, ratings, notes, cooked log, recently viewed, and the home/section toggles.</p>
        <button type="button" class="settings-danger-btn" id="clear-all-data">Clear all data</button>
      </section>
    </div>
  `);

  els.content.querySelectorAll('input[type="checkbox"][data-section]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.section;
      if (cb.checked) state.homeSections.add(id);
      else state.homeSections.delete(id);
      saveHomeSections();
    });
  });

  els.content.querySelectorAll('input[type="checkbox"][data-pref]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.dataset.pref === 'text-size-large') setTextSizePref(cb.checked ? 'large' : 'normal');
    });
  });

  els.content.querySelectorAll('input[type="radio"][data-theme-name]').forEach(r => {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      setThemePref(r.value);
      // Refresh the chip styling so the active border updates without a full re-render.
      els.content.querySelectorAll('.settings-theme-chip').forEach(chip => {
        const input = chip.querySelector('input[type="radio"]');
        chip.classList.toggle('is-active', input && input.checked);
      });
    });
  });

  els.content.querySelectorAll('input[type="checkbox"][data-wine-pref]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.dataset.winePref === 'visible') setWineVisible(cb.checked);
    });
  });

  els.content.querySelectorAll('input[type="checkbox"][data-sides-pref]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.dataset.sidesPref === 'visible') setSidesVisible(cb.checked);
    });
  });

  els.content.querySelectorAll('input[type="checkbox"][data-allergen-pref]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.dataset.allergenPref === 'highlight') setHighlight(cb.checked);
    });
  });

  els.content.querySelectorAll('input[type="checkbox"][data-allergen-hide]').forEach(cb => {
    cb.addEventListener('change', () => {
      setHide(cb.dataset.allergenHide, cb.checked);
    });
  });

  const clearBtn = document.getElementById('clear-all-data');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!window.confirm('Clear all preferences and saved data? This will reset favourites, ratings, notes, cooked logs, recently viewed and theme. This cannot be undone.')) return;
      storage.clearAll();
      showToast('All data cleared');
      setTimeout(() => window.location.reload(), 800);
    });
  }
}
