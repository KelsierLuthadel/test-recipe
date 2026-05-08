// Tests for the collections data API. Both `state` and `storage` reach for
// `localStorage` and `document`, so we set up minimal globals before the
// modules load. Each test resets storage so they are order-independent.

import { test, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

// --- minimal browser shim ---
const fakeStorage = (() => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); },
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
})();
globalThis.localStorage = fakeStorage;
globalThis.document = { getElementById: () => null }; // state.js queries elements

const collections = await import('../docs/modules/collections.js');
const { state } = await import('../docs/modules/state.js');

beforeEach(() => {
  fakeStorage.clear();
  // state.favourites is a Set initialised at import time; reset between tests.
  state.favourites = new Set();
});

test('listCollections starts with just Favourites', () => {
  const list = collections.listCollections();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'favourites');
  assert.equal(list[0].name, 'Favourites');
  assert.equal(list[0].builtin, true);
  assert.deepEqual(list[0].slugs, []);
});

test('findCollection returns Favourites for the special id', () => {
  const fav = collections.findCollection('favourites');
  assert.equal(fav.id, 'favourites');
  assert.equal(fav.builtin, true);
});

test('findCollection returns null for unknown id', () => {
  assert.equal(collections.findCollection('does-not-exist'), null);
});

test('createCollection assigns a slug-style id', () => {
  const c = collections.createCollection('Weeknight Dinner');
  assert.equal(c.name, 'Weeknight Dinner');
  assert.equal(c.id, 'weeknight-dinner');
  assert.deepEqual(c.slugs, []);
  assert.equal(c.builtin, false);
});

test('createCollection rejects empty / whitespace names', () => {
  assert.equal(collections.createCollection(''), null);
  assert.equal(collections.createCollection('   '), null);
  assert.equal(collections.createCollection(null), null);
});

test('createCollection makes ids unique by suffixing', () => {
  const a = collections.createCollection('Baking');
  const b = collections.createCollection('Baking');
  assert.equal(a.id, 'baking');
  assert.equal(b.id, 'baking-2');
});

test('createCollection avoids the reserved favourites id', () => {
  const c = collections.createCollection('Favourites');
  assert.notEqual(c.id, 'favourites');
});

test('renameCollection updates an existing user collection', () => {
  const c = collections.createCollection('Old name');
  const ok = collections.renameCollection(c.id, 'New name');
  assert.equal(ok, true);
  assert.equal(collections.findCollection(c.id).name, 'New name');
});

test('renameCollection refuses to touch Favourites', () => {
  assert.equal(collections.renameCollection('favourites', 'Bookmarks'), false);
});

test('renameCollection rejects empty new name', () => {
  const c = collections.createCollection('Keep me');
  assert.equal(collections.renameCollection(c.id, '   '), false);
  assert.equal(collections.findCollection(c.id).name, 'Keep me');
});

test('deleteCollection removes a user collection', () => {
  const c = collections.createCollection('Throwaway');
  assert.equal(collections.deleteCollection(c.id), true);
  assert.equal(collections.findCollection(c.id), null);
});

test('deleteCollection refuses to remove Favourites', () => {
  assert.equal(collections.deleteCollection('favourites'), false);
});

test('addToCollection / removeFromCollection round-trip a user collection', () => {
  const c = collections.createCollection('Weeknight');
  assert.equal(collections.addToCollection(c.id, 'pasta'), true);
  assert.equal(collections.isInCollection(c.id, 'pasta'), true);
  // Re-adding is a no-op.
  assert.equal(collections.addToCollection(c.id, 'pasta'), false);
  // Removal works.
  assert.equal(collections.removeFromCollection(c.id, 'pasta'), true);
  assert.equal(collections.isInCollection(c.id, 'pasta'), false);
});

test('addToCollection writes to Favourites via state.favourites', () => {
  collections.addToCollection('favourites', 'cake');
  assert.ok(state.favourites.has('cake'));
});

test('removeFromCollection clears Favourites entry', () => {
  collections.addToCollection('favourites', 'cake');
  collections.removeFromCollection('favourites', 'cake');
  assert.ok(!state.favourites.has('cake'));
});

test('collectionsContaining returns favourites first then user collections', () => {
  const a = collections.createCollection('A');
  const b = collections.createCollection('B');
  collections.addToCollection('favourites', 'pasta');
  collections.addToCollection(a.id, 'pasta');
  collections.addToCollection(b.id, 'pasta');
  assert.deepEqual(collections.collectionsContaining('pasta'), ['favourites', a.id, b.id]);
});

test('collectionsContaining returns empty array for slug that is not saved', () => {
  assert.deepEqual(collections.collectionsContaining('nope'), []);
});

test('isSavedAnywhere is true if in any collection', () => {
  assert.equal(collections.isSavedAnywhere('x'), false);
  const c = collections.createCollection('Misc');
  collections.addToCollection(c.id, 'x');
  assert.equal(collections.isSavedAnywhere('x'), true);
});

test('isSavedAnywhere is true via Favourites alone', () => {
  collections.addToCollection('favourites', 'y');
  assert.equal(collections.isSavedAnywhere('y'), true);
});
