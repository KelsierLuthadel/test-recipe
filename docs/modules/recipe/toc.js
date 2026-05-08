// Desktop-only table of contents shown alongside a recipe.
// Triggers on viewports >= 1180px wide and only when there are 3+ headings.
// Headings without an id get one assigned (sec-<slug>) so the links work.
//
// Active highlight uses scroll-spy semantics: the active link is the LAST
// heading whose top has crossed an offset from the top of the viewport.
// This means one link is always highlighted while the user is scrolling
// between two sections, instead of going dark in the gap between them.

import { escapeHtml, slugifyAnchor } from '../util/dom.js';
import { scrollToHeading } from './anchors.js';

// Top offset (as a fraction of viewport height) at which a heading becomes
// "active". 25% feels right - the line sits roughly where the eye lands.
const ACTIVE_OFFSET_RATIO = 0.25;

// Module-level so we can detach the listeners when navigating between
// recipes. Without this, every recipe transition would leak handlers
// pointing at stale DOM nodes.
let activeScrollHandler = null;

function detach() {
  if (activeScrollHandler) {
    window.removeEventListener('scroll', activeScrollHandler);
    window.removeEventListener('resize', activeScrollHandler);
    activeScrollHandler = null;
  }
}

export function buildRecipeToc(body) {
  detach();

  if (!window.matchMedia || !window.matchMedia('(min-width: 1180px)').matches) return;
  const article = body.closest('.recipe-detail');
  if (!article) return;
  // Remove any previous TOC (re-render guard).
  const stale = article.querySelector('.recipe-toc');
  if (stale) stale.remove();

  const headings = [...body.querySelectorAll('h2')].filter(h => {
    const t = h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.textContent.trim() : h.textContent.trim();
    return !!t;
  });
  if (headings.length < 3) return;

  headings.forEach(h => {
    if (!h.id) {
      const text = h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.textContent : h.textContent;
      const slug = slugifyAnchor(text);
      if (slug) h.id = 'sec-' + slug;
    }
  });

  const items = headings.map(h => {
    const text = (h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.textContent : h.textContent).trim();
    return `<li><a href="#${h.id}" data-toc-target="${h.id}">${escapeHtml(text)}</a></li>`;
  }).join('');

  const toc = document.createElement('aside');
  toc.className = 'recipe-toc';
  toc.setAttribute('aria-label', 'On this page');
  toc.innerHTML = `<div class="toc-label">On this page</div><ul class="toc-list">${items}</ul>`;
  article.appendChild(toc);

  const links = new Map();
  toc.querySelectorAll('a[data-toc-target]').forEach(a => {
    links.set(a.dataset.tocTarget, a);
    a.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToHeading(document.getElementById(a.dataset.tocTarget));
    });
  });

  // Pick the last heading whose top is at or above the activation line.
  // Headings is in DOM order, so once we hit one that's still below the
  // line, every subsequent one is too - we can stop.
  function computeActive() {
    const threshold = window.innerHeight * ACTIVE_OFFSET_RATIO;
    let activeId = null;
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= threshold) activeId = h.id;
      else break;
    }
    // Before scrolling past the first heading, fall back to the first one
    // so the TOC always shows a current section instead of going blank.
    if (!activeId) activeId = headings[0].id;
    links.forEach((link, id) => {
      link.classList.toggle('is-active', id === activeId);
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      computeActive();
      ticking = false;
    });
  }

  activeScrollHandler = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  computeActive();
}
