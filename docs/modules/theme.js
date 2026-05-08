// Light/dark theme, larger-text mode, and desktop sidebar collapse.
// All three are set via data-* attributes on <html>/<body> so CSS can react,
// and persisted via the storage module so they survive reloads.

import * as storage from './storage.js';

// ---------- light / dark ----------

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
}

export function setThemePref(theme) {
  applyTheme(theme);
  storage.theme.save(theme);
  // theme topbar button is purely CSS-driven by [data-theme]; sync settings toggle if present
  const cb = document.querySelector('input[type="checkbox"][data-pref="dark-mode"]');
  if (cb) cb.checked = theme === 'dark';
}

export function initTheme() {
  const stored = storage.theme.load();
  if (stored === 'dark' || stored === 'light') {
    applyTheme(stored);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!storage.theme.load()) applyTheme(e.matches ? 'dark' : 'light');
    });
  }
}

export function bindThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setThemePref(next);
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
