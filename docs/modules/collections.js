// Saved-recipe collections: a built-in "Favourites" collection plus zero or
// more user-created collections. Favourites is stored in the legacy
// `recipes:favourites` key (mirrored in state.favourites Set) so existing
// users keep their saves with no migration. User collections live under
// `recipes:collections` as `[{ id, name, slugs }, ...]`.

import * as storage from './storage.js';
import { state } from './state.js';

export const FAVOURITES_ID = 'favourites';

// Fired on the window after any mutation (create / rename / delete / add /
// remove). The sidebar (and anything else interested) listens once and
// re-renders, avoiding any direct dependency from this module on UI code.
function notifyChange() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event('collections:changed'));
  }
}

// Returns all collections, Favourites first, then user-created in insertion order.
// Each entry is { id, name, slugs, builtin }. Slugs are returned as a fresh
// array so callers can iterate without worrying about mutation.
export function listCollections() {
  return [favouritesCollection(), ...userCollections()];
}

export function findCollection(id) {
  if (id === FAVOURITES_ID) return favouritesCollection();
  const c = userCollections().find(c => c.id === id);
  return c || null;
}

function favouritesCollection() {
  return {
    id: FAVOURITES_ID,
    name: 'Favourites',
    slugs: [...state.favourites],
    builtin: true,
  };
}

function userCollections() {
  return storage.collections.load().map(c => ({ ...c, slugs: [...(c.slugs || [])], builtin: false }));
}

// Create a new user collection. Returns the created object (with its assigned
// id). Names are trimmed; an empty trimmed name is rejected (returns null).
export function createCollection(name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  const raw = storage.collections.load();
  const id = uniqueId(trimmed, raw);
  const created = { id, name: trimmed, slugs: [] };
  raw.push(created);
  storage.collections.save(raw);
  notifyChange();
  return { ...created, builtin: false };
}

export function renameCollection(id, newName) {
  if (id === FAVOURITES_ID) return false;
  const trimmed = String(newName || '').trim();
  if (!trimmed) return false;
  const raw = storage.collections.load();
  const c = raw.find(c => c.id === id);
  if (!c) return false;
  c.name = trimmed;
  storage.collections.save(raw);
  notifyChange();
  return true;
}

export function deleteCollection(id) {
  if (id === FAVOURITES_ID) return false;
  const raw = storage.collections.load();
  const idx = raw.findIndex(c => c.id === id);
  if (idx === -1) return false;
  raw.splice(idx, 1);
  storage.collections.save(raw);
  notifyChange();
  return true;
}

// Adds slug to the named collection. No-op if already present.
// Returns true if the collection was modified.
export function addToCollection(id, slug) {
  if (id === FAVOURITES_ID) {
    if (state.favourites.has(slug)) return false;
    state.favourites.add(slug);
    storage.favourites.save(state.favourites);
    notifyChange();
    return true;
  }
  const raw = storage.collections.load();
  const c = raw.find(c => c.id === id);
  if (!c) return false;
  if (!Array.isArray(c.slugs)) c.slugs = [];
  if (c.slugs.includes(slug)) return false;
  c.slugs.push(slug);
  storage.collections.save(raw);
  notifyChange();
  return true;
}

export function removeFromCollection(id, slug) {
  if (id === FAVOURITES_ID) {
    if (!state.favourites.has(slug)) return false;
    state.favourites.delete(slug);
    storage.favourites.save(state.favourites);
    notifyChange();
    return true;
  }
  const raw = storage.collections.load();
  const c = raw.find(c => c.id === id);
  if (!c || !Array.isArray(c.slugs)) return false;
  const idx = c.slugs.indexOf(slug);
  if (idx === -1) return false;
  c.slugs.splice(idx, 1);
  storage.collections.save(raw);
  notifyChange();
  return true;
}

export function isInCollection(id, slug) {
  if (id === FAVOURITES_ID) return state.favourites.has(slug);
  const c = storage.collections.load().find(c => c.id === id);
  return !!(c && Array.isArray(c.slugs) && c.slugs.includes(slug));
}

// Returns the array of collection ids that include this slug, with
// 'favourites' first if the slug is favourited.
export function collectionsContaining(slug) {
  const ids = [];
  if (state.favourites.has(slug)) ids.push(FAVOURITES_ID);
  for (const c of storage.collections.load()) {
    if (Array.isArray(c.slugs) && c.slugs.includes(slug)) ids.push(c.id);
  }
  return ids;
}

// True if the slug is in any collection (built-in or user). Used by the
// recipe page Save button to decide whether the heart is filled.
export function isSavedAnywhere(slug) {
  if (state.favourites.has(slug)) return true;
  for (const c of storage.collections.load()) {
    if (Array.isArray(c.slugs) && c.slugs.includes(slug)) return true;
  }
  return false;
}

// Build a slug-style id from the user's chosen name, plus a numeric suffix
// if it collides with an existing one. 'favourites' is reserved.
function uniqueId(name, existing) {
  const base = String(name).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'collection';
  if (base === FAVOURITES_ID) return uniqueId(base + '-list', existing);
  if (!existing.some(c => c.id === base)) return base;
  let n = 2;
  while (existing.some(c => c.id === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}
