// Hash-based routing. Parses window.location.hash into a route object and
// builds canonical hashes for category, recipe and search URLs.

import { parseTagsParam } from './util/arrays.js';

export function parseRoute() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  const params = new URLSearchParams(query || '');
  if (path === '/' || path === '') {
    return { name: 'home', tags: parseTagsParam(params.get('tag')) };
  }
  if (path === '/discover') {
    return { name: 'discover', tags: parseTagsParam(params.get('tag')) };
  }
  if (path === '/pantry') {
    return { name: 'pantry', have: parseTagsParam(params.get('have')) };
  }
  if (path === '/plan') {
    return {
      name: 'plan',
      month: params.get('m') || null,
      date: params.get('d') || null,
    };
  }
  if (path === '/favourites') return { name: 'favourites' };
  if (path === '/recent') return { name: 'recent' };
  if (path === '/top-rated') return { name: 'top-rated' };
  if (path === '/notes') return { name: 'notes' };
  if (path === '/cooked') return { name: 'cooked' };
  if (path === '/settings') return { name: 'settings' };
  if (path.startsWith('/saved/')) {
    return { name: 'collection', id: decodeURIComponent(path.slice(7)) };
  }
  if (path.startsWith('/c/')) {
    return {
      name: 'category',
      path: decodeURIComponent(path.slice(3)),
      tags: parseTagsParam(params.get('tag')),
    };
  }
  if (path.startsWith('/r/')) {
    return {
      name: 'recipe',
      slug: decodeURIComponent(path.slice(3)),
      step: params.get('step') || null,
      cook: params.get('cook') === '1',
    };
  }
  if (path.startsWith('/s')) {
    return {
      name: 'search',
      query: params.get('q') || '',
      tags: parseTagsParam(params.get('tag')),
    };
  }
  return { name: 'home' };
}

// Sets window.location.hash; if the hash is unchanged, fires a synthetic
// hashchange so the route handler still runs (browsers skip it otherwise).
export function navigate(hash) {
  if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

export function categoryHash(path, tags) {
  const base = `#/c/${path.split('/').map(encodeURIComponent).join('/')}`;
  if (!tags) return base;
  const list = Array.isArray(tags) ? tags : (tags ? [tags] : []);
  return list.length ? `${base}?tag=${encodeURIComponent(list.join(','))}` : base;
}

export function recipeHash(slug) {
  return `#/r/${slug.split('/').map(encodeURIComponent).join('/')}`;
}

export function searchHash(q) {
  return `#/s?q=${encodeURIComponent(q)}`;
}

export function collectionHash(id) {
  return `#/saved/${encodeURIComponent(id)}`;
}

// Build a pantry-page URL with the current ingredient selection.
// Same shape as discoverHash: arrays, single strings, or empty all work.
export function pantryHash(ingredients) {
  if (!ingredients) return '#/pantry';
  const list = Array.isArray(ingredients) ? ingredients : [ingredients];
  return list.length ? `#/pantry?have=${encodeURIComponent(list.join(','))}` : '#/pantry';
}

// Build a meal-plan URL.  `monthIso` ("YYYY-MM") and `dayIso`
// ("YYYY-MM-DD") are both optional; when day is set, month is implied
// by the day. Use planHash() with no args for the current month, no day.
export function planHash({ month, date } = {}) {
  const params = new URLSearchParams();
  if (date) params.set('d', date);
  else if (month) params.set('m', month);
  const q = params.toString();
  return q ? `#/plan?${q}` : '#/plan';
}

// Build a discover-page URL with the current tag selection.
// Same shape as homeHash: arrays, single strings, or empty all work.
export function discoverHash(tags) {
  if (!tags) return '#/discover';
  const list = Array.isArray(tags) ? tags : [tags];
  return list.length ? `#/discover?tag=${encodeURIComponent(list.join(','))}` : '#/discover';
}
