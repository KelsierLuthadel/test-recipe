// "List" pages: Recently viewed, Top rated, Recipes with notes, Cooked.
// Favourites moved to pages/collection.js so the same renderer covers
// every saved-collection page. Each list page below is structurally
// identical: a back-to-home button, a page header, and either an empty
// state when the user has not populated that list yet or a card grid.

import { state, setContent } from '../state.js';
import * as storage from '../storage.js';
import { cardHtml } from '../cards.js';
import {
  emptyStateHtml,
  ICON_CLOCK,
  ICON_STAR,
  ICON_NOTE,
  ICON_CHECK,
} from '../ui/empty-state.js';

const BACK_ARROW = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const BACK_BTN = `<div class="page-back"><a class="back-button" href="#/">${BACK_ARROW}Back to Home</a></div>`;

export function renderRecent() {
  const recipes = state.recent
    .map(slug => state.recipeBySlug.get(slug))
    .filter(Boolean);

  if (!recipes.length) {
    setContent(`
      <div class="fade-in">
        ${BACK_BTN}
        <header class="page-header">
          <div class="page-eyebrow">History</div>
          <h1 class="page-title">Recently viewed</h1>
        </header>
        ${emptyStateHtml(ICON_CLOCK, 'No recent recipes', 'Recipes you open will appear here, with the most recent first. Browse the categories to get started.')}
      </div>
    `);
    return;
  }

  const cardsHtml = recipes.map(r => cardHtml(r, true)).join('');
  setContent(`
    <div class="fade-in">
      ${BACK_BTN}
      <header class="page-header">
        <div class="page-eyebrow">History</div>
        <h1 class="page-title">Recently viewed</h1>
        <p class="page-sub">Last ${recipes.length} recipe${recipes.length === 1 ? '' : 's'} you opened in this browser.</p>
      </header>
      <section class="section">
        <div class="card-grid">${cardsHtml}</div>
      </section>
    </div>
  `);
}

export function renderTopRated() {
  const ratingsMap = state.ratings || {};
  const recipes = Object.entries(ratingsMap)
    .filter(([, v]) => v >= 4)
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => state.recipeBySlug.get(slug))
    .filter(Boolean);

  if (!recipes.length) {
    setContent(`
      <div class="fade-in">
        ${BACK_BTN}
        <header class="page-header">
          <div class="page-eyebrow">Saved</div>
          <h1 class="page-title">Top rated</h1>
        </header>
        ${emptyStateHtml(ICON_STAR, 'No top-rated recipes yet', 'Open any recipe and tap the stars on the Rate chip. Anything you give 4 or more stars will show up here.')}
      </div>
    `);
    return;
  }

  const cardsHtml = recipes.map(r => cardHtml(r, true)).join('');
  setContent(`
    <div class="fade-in">
      ${BACK_BTN}
      <header class="page-header">
        <div class="page-eyebrow">Saved</div>
        <h1 class="page-title">Top rated</h1>
        <p class="page-sub">${recipes.length} recipe${recipes.length === 1 ? '' : 's'} rated 4 stars or higher.</p>
      </header>
      <section class="section">
        <div class="card-grid">${cardsHtml}</div>
      </section>
    </div>
  `);
}

export function renderNotesAdded() {
  const recipes = [...state.notesSlugs]
    .map(slug => state.recipeBySlug.get(slug))
    .filter(Boolean);

  if (!recipes.length) {
    setContent(`<div class="fade-in">${BACK_BTN}
      <header class="page-header"><div class="page-eyebrow">Saved</div><h1 class="page-title">Recipes with notes</h1></header>
      ${emptyStateHtml(ICON_NOTE, 'No notes yet', 'Open any recipe, scroll to the "My notes" box at the bottom, and jot down adjustments, substitutions or what worked. Your notes appear here.')}
    </div>`);
    return;
  }
  const cards = recipes.map(r => cardHtml(r, true)).join('');
  setContent(`<div class="fade-in">${BACK_BTN}
    <header class="page-header"><div class="page-eyebrow">Saved</div><h1 class="page-title">Recipes with notes</h1>
    <p class="page-sub">${recipes.length} recipe${recipes.length === 1 ? '' : 's'} with personal notes saved in this browser.</p></header>
    <section class="section"><div class="card-grid">${cards}</div></section></div>`);
}

export function renderCookedList() {
  const map = storage.cooked.load();
  const recipes = Object.entries(map)
    .sort((a, b) => {
      const da = a[1] && a[1].last ? Date.parse(a[1].last) : 0;
      const db = b[1] && b[1].last ? Date.parse(b[1].last) : 0;
      return db - da;
    })
    .map(([slug]) => state.recipeBySlug.get(slug))
    .filter(Boolean);

  if (!recipes.length) {
    setContent(`<div class="fade-in">${BACK_BTN}
      <header class="page-header"><div class="page-eyebrow">History</div><h1 class="page-title">Cooked</h1></header>
      ${emptyStateHtml(ICON_CHECK, 'No recipes cooked yet', 'Tap the "Cooked" button on any recipe page to log it. Your cooking history appears here, sorted by most recent.')}
    </div>`);
    return;
  }
  const cards = recipes.map(r => cardHtml(r, true)).join('');
  setContent(`<div class="fade-in">${BACK_BTN}
    <header class="page-header"><div class="page-eyebrow">History</div><h1 class="page-title">Cooked</h1>
    <p class="page-sub">${recipes.length} recipe${recipes.length === 1 ? '' : 's'} you've marked as cooked, most recent first.</p></header>
    <section class="section"><div class="card-grid">${cards}</div></section></div>`);
}
