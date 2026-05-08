// Sidebar search input behaviour: debounced typing navigates to #/s?q=...,
// Escape clears the input, and Cmd/Ctrl+K focuses it from anywhere on the
// page (also opens the mobile drawer so the input is reachable on phones).
// syncSearchInput keeps the visible input value in sync after a route change
// (e.g. back/forward navigation, or programmatic navigate to a search URL).

import { els, state } from '../state.js';
import { navigate, searchHash } from '../routes.js';

let searchTimer = null;

export function bindSearch() {
  els.searchInput.addEventListener('input', () => {
    const q = els.searchInput.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (!q) {
        if (state.route.name === 'search') navigate('#/');
        return;
      }
      navigate(searchHash(q));
    }, 120);
  });
  els.searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      els.searchInput.value = '';
      if (state.route.name === 'search') navigate('#/');
    }
  });
}

export function syncSearchInput() {
  if (state.route.name === 'search' && state.route.query) {
    if (els.searchInput.value !== state.route.query) els.searchInput.value = state.route.query;
  }
}

export function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K focuses the search input.
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (els.searchInput) {
        els.searchInput.focus();
        els.searchInput.select();
        // Open the sidebar drawer on mobile so the input is visible.
        if (window.matchMedia && window.matchMedia('(max-width: 720px)').matches) {
          document.body.classList.add('nav-open');
        }
      }
    }
  });
}
