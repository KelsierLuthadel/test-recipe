// Theme picker (six named themes, three light / three dark), larger-
// text mode, and desktop sidebar collapse. All three are set via
// data-* attributes on <html>/<body> so CSS can react, and persisted
// via the storage module so they survive reloads.

import * as storage from './storage.js';
import {
  isValidTheme,
  normaliseTheme,
  counterpartTheme,
  familyOfTheme,
  DEFAULT_LIGHT,
  DEFAULT_DARK,
} from './themes.js';

// ---------- themes ----------

export function applyTheme(theme) {
  const name = isValidTheme(theme) ? theme : DEFAULT_LIGHT;
  document.documentElement.setAttribute('data-theme', name);
  document.documentElement.setAttribute('data-theme-family', familyOfTheme(name));
}

export function setThemePref(theme) {
  const name = isValidTheme(theme) ? theme : DEFAULT_LIGHT;
  applyTheme(name);
  storage.theme.save(name);
  document.querySelectorAll('input[type="radio"][data-theme-name]').forEach(r => {
    r.checked = r.value === name;
  });
}

export function initTheme() {
  const stored = normaliseTheme(storage.theme.load());
  if (stored) {
    applyTheme(stored);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme(DEFAULT_DARK);
  } else {
    applyTheme(DEFAULT_LIGHT);
  }
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!normaliseTheme(storage.theme.load())) {
        applyTheme(e.matches ? DEFAULT_DARK : DEFAULT_LIGHT);
      }
    });
  }
}

// Topbar button: flips the current theme to its dark/light counterpart
// (Linen ↔ Cast Iron, Mint ↔ Midnight, Blush ↔ Plum). This way picking
// "Mint" in Settings, then clicking the topbar button, gives you
// Midnight instead of resetting to a generic dark.
export function bindThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || DEFAULT_LIGHT;
    setThemePref(counterpartTheme(current));
  });
}

// ---------- larger text mode ----------

export function applyTextSize(size) {
  if (size === 'large') document.documentElement.setAttribute('data-text-size', 'large');
  else document.documentElement.removeAttribute('data-text-size');
}

export function setTextSizePref(size) {
  const next = size === 'large' ? 'large' : 'normal';
  applyTextSize(next);
  storage.textSize.save(next);
  const btn = document.getElementById('text-size-toggle');
  if (btn) {
    const isLarge = next === 'large';
    btn.setAttribute('aria-pressed', String(isLarge));
    btn.classList.toggle('is-on', isLarge);
  }
  const cb = document.querySelector('input[type="checkbox"][data-pref="text-size-large"]');
  if (cb) cb.checked = next === 'large';
}

export function initTextSize() {
  const stored = storage.textSize.load();
  applyTextSize(stored === 'large' ? 'large' : 'normal');
}

export function bindTextSizeToggle() {
  const btn = document.getElementById('text-size-toggle');
  if (!btn) return;
  const isLarge = document.documentElement.getAttribute('data-text-size') === 'large';
  btn.setAttribute('aria-pressed', String(isLarge));
  btn.classList.toggle('is-on', isLarge);
  btn.addEventListener('click', () => {
    const wasLarge = document.documentElement.getAttribute('data-text-size') === 'large';
    setTextSizePref(wasLarge ? 'normal' : 'large');
  });
}

// ---------- desktop sidebar collapse ----------

export function bindSidebarToggle() {
  const btn = document.getElementById('sidebar-toggle');
  if (!btn) return;
  const initial = storage.sidebarCollapsed.load();
  document.body.classList.toggle('sidebar-collapsed', initial);
  btn.setAttribute('aria-pressed', String(initial));
  btn.addEventListener('click', () => {
    const collapsed = !document.body.classList.contains('sidebar-collapsed');
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    btn.setAttribute('aria-pressed', String(collapsed));
    storage.sidebarCollapsed.save(collapsed);
  });
}
