// Recipes web app. Loads docs/recipes.json, then routes between home, category and recipe views.
// Recipe markdown is fetched on demand from raw.githubusercontent.com using rawBase from the manifest.
// ES module — referenced from index.html as <script type="module" src="app.js">.

import { setupBackToTop } from './modules/ui/back-to-top.js';
import { showSkeleton } from './modules/ui/skeleton.js';
import { escapeHtml } from './modules/util/dom.js';
import { els, state } from './modules/state.js';
import { loadManifest } from './modules/manifest.js';
import { parseRoute } from './modules/routes.js';
import {
  initTheme,
  bindThemeToggle,
  initTextSize,
  bindTextSizeToggle,
  bindSidebarToggle,
} from './modules/theme.js';
import { updateMeta } from './modules/meta.js';
import { renderSidebarActive } from './modules/nav/sidebar.js';
import { renderBreadcrumb } from './modules/nav/breadcrumb.js';
import { bindSearch, syncSearchInput, bindKeyboardShortcuts } from './modules/nav/search.js';
import { bindMobileNav, closeMobileNav } from './modules/nav/mobile.js';
import { renderHome } from './modules/pages/home.js';
import { renderDiscover } from './modules/pages/discover.js';
import { renderPantry } from './modules/pages/pantry.js';
import {
  renderRecent,
  renderTopRated,
  renderNotesAdded,
  renderCookedList,
} from './modules/pages/lists.js';
import { renderSettings } from './modules/pages/settings.js';
import { renderCategory } from './modules/pages/category.js';
import { renderSearch } from './modules/pages/search.js';
import { renderRecipe } from './modules/pages/recipe.js';
import { renderCollection } from './modules/pages/collection.js';
import { FAVOURITES_ID } from './modules/collections.js';

function route() {
  state.route = parseRoute();
  closeMobileNav();
  renderSidebarActive();
  renderBreadcrumb();
  syncSearchInput();
  updateMeta();

  if (state.route.name === 'home') return renderHome();
  if (state.route.name === 'discover') return renderDiscover();
  if (state.route.name === 'pantry') return renderPantry();
  if (state.route.name === 'favourites') return renderCollection(FAVOURITES_ID);
  if (state.route.name === 'collection') return renderCollection(state.route.id);
  if (state.route.name === 'recent') return renderRecent();
  if (state.route.name === 'top-rated') return renderTopRated();
  if (state.route.name === 'notes') return renderNotesAdded();
  if (state.route.name === 'cooked') return renderCookedList();
  if (state.route.name === 'settings') return renderSettings();
  if (state.route.name === 'category') return renderCategory(state.route.path);
  if (state.route.name === 'recipe') return renderRecipe(state.route.slug);
  if (state.route.name === 'search') return renderSearch(state.route.query);
}

async function init() {
  initTheme();
  showSkeleton();
  try {
    await loadManifest();
  } catch (err) {
    els.content.innerHTML = `<div class="error-state"><div class="error-state-title">Couldn't load recipes</div><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }

  els.repoLink.href = `https://github.com/${state.manifest.repo}`;
  // Sidebar footer: recipe count on top, deployed version + build date
  // below. Prefer the most recent git tag (links to the GitHub release
  // page); fall back to the short commit hash when no tag is reachable.
  const m = state.manifest;
  const built = m.generatedAt ? new Date(m.generatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
  let versionPart = '';
  if (m.version) {
    versionPart = `<a href="https://github.com/${m.repo}/releases/tag/${encodeURIComponent(m.version)}" target="_blank" rel="noopener">${m.version}</a>`;
  } else if (m.commit) {
    versionPart = `<a href="https://github.com/${m.repo}/commit/${m.commit}" target="_blank" rel="noopener">v.${m.commit}</a>`;
  }
  if (built) versionPart = versionPart ? `${versionPart} &middot; ${built}` : built;
  els.manifestStats.innerHTML = `${m.totalRecipes} recipes${versionPart ? `<span class="manifest-version">${versionPart}</span>` : ''}`;

  bindSearch();
  bindMobileNav();
  bindSidebarToggle();
  bindKeyboardShortcuts();
  bindThemeToggle();
  initTextSize();
  bindTextSizeToggle();
  setupBackToTop();
  window.addEventListener('hashchange', route);
  route();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
