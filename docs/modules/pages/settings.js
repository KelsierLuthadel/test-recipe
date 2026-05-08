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

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const isLarge = document.documentElement.getAttribute('data-text-size') === 'large';
  const appearanceRows =
    settingsRowHtml('pref-dark-mode', 'Dark mode', isDark, 'data-pref="dark-mode"') +
    settingsRowHtml('pref-text-size', 'Larger text', isLarge, 'data-pref="text-size-large"');

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
        <div class="settings-list">${appearanceRows}</div>
      </section>

      <section class="section">
        <h2 class="section-title">Home page sections</h2>
        <p class="page-meta" style="margin-bottom:0.75rem">Each enabled section shows up to 4 cards on the home page, with a "View all" link when there's more.</p>
        <div class="settings-list">${sectionRows}</div>
      </section>

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
      if (cb.dataset.pref === 'dark-mode') setThemePref(cb.checked ? 'dark' : 'light');
      else if (cb.dataset.pref === 'text-size-large') setTextSizePref(cb.checked ? 'large' : 'normal');
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
