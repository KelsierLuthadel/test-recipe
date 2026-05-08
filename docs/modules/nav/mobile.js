// Mobile sidebar drawer: hamburger toggles `body.nav-open`, the close button
// and scrim both dismiss it. The route dispatcher calls closeMobileNav() on
// every navigation so picking a category from the drawer auto-collapses it.

import { els } from '../state.js';

export function bindMobileNav() {
  els.menuToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    els.menuToggle.setAttribute('aria-expanded', String(open));
  });
  els.sidebarClose.addEventListener('click', closeMobileNav);
  els.scrim.addEventListener('click', closeMobileNav);
}

export function closeMobileNav() {
  document.body.classList.remove('nav-open');
  els.menuToggle.setAttribute('aria-expanded', 'false');
}
