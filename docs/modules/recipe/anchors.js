// Step anchors: every h3 inside the Method section gets a link icon that
// copies a deep-link URL with ?step=<id> to the clipboard. The route handler
// (in cooking-mode/scrollToStep) honours that param when the page loads.

import { state } from '../state.js';
import { slugifyAnchor } from '../util/dom.js';

export function addStepAnchors(body) {
  let methodH2 = null;
  body.querySelectorAll('h2').forEach(h => {
    const t = (h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.textContent : h.textContent).trim();
    if (/^method$/i.test(t)) methodH2 = h;
  });
  if (!methodH2) return;

  const seen = new Set();
  let sib = methodH2.nextElementSibling;
  while (sib && sib.tagName !== 'H2') {
    if (sib.tagName === 'H3') {
      let id = slugifyAnchor(sib.textContent);
      if (id) {
        let candidate = id, n = 2;
        while (seen.has(candidate)) candidate = `${id}-${n++}`;
        id = candidate;
        seen.add(id);
        sib.id = id;
        const link = document.createElement('a');
        link.className = 'heading-anchor';
        link.setAttribute('aria-label', 'Copy link to this step');
        link.href = '#' + window.location.hash.slice(1).split('?')[0] + '?step=' + id;
        link.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const url = window.location.origin + window.location.pathname + window.location.search + link.getAttribute('href');
          navigator.clipboard.writeText(url).then(() => {
            link.classList.add('is-copied');
            setTimeout(() => link.classList.remove('is-copied'), 1200);
          }).catch(() => {});
        });
        sib.appendChild(link);
      }
    }
    sib = sib.nextElementSibling;
  }
}

// Smooth-scroll an element to just below the sticky chrome (topbar +
// recipe-chips, when present). Plain scrollIntoView would put the heading
// right at viewport y=0, which is hidden behind those sticky elements.
export function scrollToHeading(el) {
  if (!el) return;
  const topbar = document.querySelector('.topbar');
  const chips = document.querySelector('.recipe-chips');
  const offset = (topbar ? topbar.offsetHeight : 0)
    + (chips ? chips.offsetHeight : 0)
    + 12; // small breathing room below the chips
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

// Used by recipe page after render: when the URL has ?step=<id>, scroll the
// matching h3 into view. The 50ms timeout gives layout/images a moment to
// settle before measuring scroll positions.
export function maybeScrollToStep() {
  const stepId = state.route && state.route.step;
  if (!stepId) return;
  const el = document.getElementById(stepId);
  if (el) setTimeout(() => scrollToHeading(el), 50);
}
