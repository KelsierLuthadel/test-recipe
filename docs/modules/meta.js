// Updates document.title and the OG / Twitter / description meta tags on every
// route change so social shares and the browser tab show the right thing per
// page. Called by the route dispatcher after state.route is parsed.

import { state } from './state.js';
import { rawUrl, categoryNode } from './manifest.js';
import { findCollection } from './collections.js';

export function updateMeta() {
  const m = state.manifest;
  let title = 'Recipes';
  let description = `An open-source collection of ${m ? m.totalRecipes + ' ' : ''}recipes from around the world.`;
  let image = '';

  if (state.route.name === 'recipe') {
    const r = state.recipeBySlug.get(state.route.slug);
    if (r) {
      title = `${r.title} · Recipes`;
      description = r.overview || `${r.title} recipe.`;
      if (r.image) image = rawUrl(r.image);
    }
  } else if (state.route.name === 'category') {
    const node = categoryNode(state.route.path);
    if (node) {
      title = `${node.label} · Recipes`;
      description = node.overview || `${node.recipeCount} recipes in ${node.label}.`;
    }
  } else if (state.route.name === 'favourites') {
    title = 'Your favourites · Recipes';
    description = 'Recipes you\'ve saved.';
  } else if (state.route.name === 'collection') {
    const c = findCollection(state.route.id);
    if (c) {
      title = `${c.name} · Recipes`;
      description = `${c.slugs.length} recipe${c.slugs.length === 1 ? '' : 's'} saved in this browser.`;
    }
  } else if (state.route.name === 'search') {
    title = state.route.query ? `Search: ${state.route.query} · Recipes` : 'Search · Recipes';
  } else if (state.route.name === 'discover') {
    const tags = Array.isArray(state.route.tags) ? state.route.tags : [];
    if (tags.length) {
      const labels = tags.join(' + ');
      title = `Discover · ${labels} · Recipes`;
      description = `Recipes tagged ${labels}.`;
    } else {
      title = 'Discover · Recipes';
      description = 'Find a recipe by picking tags. Each pick narrows what\'s left.';
    }
  } else if (state.route.name === 'plan') {
    title = 'Meal plan · Recipes';
    description = 'Plan recipes for the week and get an aggregated shopping list.';
  } else if (state.route.name === 'pantry') {
    const have = Array.isArray(state.route.have) ? state.route.have : [];
    if (have.length) {
      title = `What can I make? · ${have.join(', ')} · Recipes`;
      description = `Recipes that use ${have.join(', ')}.`;
    } else {
      title = 'What can I make? · Recipes';
      description = 'Pick the ingredients you have and find recipes ranked by overlap.';
    }
  }

  document.title = title;
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', window.location.href);
  setMeta('property', 'og:image', image);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:image', image);
  setMeta('name', 'description', description);
}

// Find or create a <meta> tag and set its content. attr is "name" or "property".
function setMeta(attr, key, value) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value || '');
}
