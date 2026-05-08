import { test } from 'node:test';
import { strict as assert } from 'node:assert';

// parseRoute reads window.location.hash; navigate is side-effect heavy and
// relies on HashChangeEvent (browser-only), so we only cover the readers and
// the pure URL builders here. URLSearchParams is built into Node already.
globalThis.window = { location: { hash: '' } };

const { parseRoute, categoryHash, recipeHash, searchHash, collectionHash, discoverHash } =
  await import('../docs/modules/routes.js');

function withHash(hash, fn) {
  window.location.hash = hash;
  try { return fn(); }
  finally { window.location.hash = ''; }
}

test('parseRoute returns home for empty / root hash', () => {
  assert.deepEqual(withHash('', () => parseRoute()), { name: 'home', tags: [] });
  assert.deepEqual(withHash('#/', () => parseRoute()), { name: 'home', tags: [] });
});

test('parseRoute recognises the static list routes', () => {
  assert.deepEqual(withHash('#/favourites', () => parseRoute()), { name: 'favourites' });
  assert.deepEqual(withHash('#/recent', () => parseRoute()), { name: 'recent' });
  assert.deepEqual(withHash('#/top-rated', () => parseRoute()), { name: 'top-rated' });
  assert.deepEqual(withHash('#/notes', () => parseRoute()), { name: 'notes' });
  assert.deepEqual(withHash('#/cooked', () => parseRoute()), { name: 'cooked' });
  assert.deepEqual(withHash('#/settings', () => parseRoute()), { name: 'settings' });
});

test('parseRoute parses a category route', () => {
  assert.deepEqual(
    withHash('#/c/cuisine/italian', () => parseRoute()),
    { name: 'category', path: 'cuisine/italian', tags: [] },
  );
});

test('parseRoute decodes URI-encoded category segments', () => {
  assert.deepEqual(
    withHash('#/c/cuisine/north%20african', () => parseRoute()),
    { name: 'category', path: 'cuisine/north african', tags: [] },
  );
});

test('parseRoute pulls active tags out of ?tag=', () => {
  assert.deepEqual(
    withHash('#/c/cuisine?tag=vegetarian,quick', () => parseRoute()),
    { name: 'category', path: 'cuisine', tags: ['vegetarian', 'quick'] },
  );
});

test('parseRoute parses a recipe route with step + cook flags', () => {
  assert.deepEqual(
    withHash('#/r/cuisine/italian/lasagna?step=stage-1&cook=1', () => parseRoute()),
    { name: 'recipe', slug: 'cuisine/italian/lasagna', step: 'stage-1', cook: true },
  );
});

test('parseRoute defaults step to null and cook to false', () => {
  assert.deepEqual(
    withHash('#/r/desert/cake', () => parseRoute()),
    { name: 'recipe', slug: 'desert/cake', step: null, cook: false },
  );
});

test('parseRoute parses a search route with query and tags', () => {
  assert.deepEqual(
    withHash('#/s?q=chicken&tag=spicy', () => parseRoute()),
    { name: 'search', query: 'chicken', tags: ['spicy'] },
  );
});

test('parseRoute returns home for an unknown path', () => {
  assert.deepEqual(withHash('#/garbage', () => parseRoute()), { name: 'home' });
});

test('parseRoute pulls home-page tag filter out of ?tag=', () => {
  assert.deepEqual(
    withHash('#/?tag=vegetarian,quick', () => parseRoute()),
    { name: 'home', tags: ['vegetarian', 'quick'] },
  );
});

test('categoryHash percent-encodes each path segment', () => {
  assert.equal(categoryHash('cuisine/north african'), '#/c/cuisine/north%20african');
});

test('categoryHash with no tags has no query string', () => {
  assert.equal(categoryHash('cuisine'), '#/c/cuisine');
});

test('categoryHash appends a comma-separated tag query', () => {
  assert.equal(categoryHash('cuisine', ['vegetarian', 'quick']),
    '#/c/cuisine?tag=vegetarian%2Cquick');
});

test('categoryHash accepts a string tag', () => {
  assert.equal(categoryHash('cuisine', 'vegetarian'), '#/c/cuisine?tag=vegetarian');
});

test('categoryHash with empty-array tags omits the query', () => {
  assert.equal(categoryHash('cuisine', []), '#/c/cuisine');
});

test('recipeHash percent-encodes the slug', () => {
  assert.equal(recipeHash('cuisine/north african/tagine'),
    '#/r/cuisine/north%20african/tagine');
});

test('searchHash builds a properly encoded query', () => {
  assert.equal(searchHash('chicken & rice'), '#/s?q=chicken%20%26%20rice');
});

test('parseRoute parses a saved-collection route', () => {
  assert.deepEqual(
    withHash('#/saved/weeknight-dinner', () => parseRoute()),
    { name: 'collection', id: 'weeknight-dinner' },
  );
});

test('parseRoute decodes URI-encoded collection ids', () => {
  assert.deepEqual(
    withHash('#/saved/holiday%20baking', () => parseRoute()),
    { name: 'collection', id: 'holiday baking' },
  );
});

test('collectionHash percent-encodes the id', () => {
  assert.equal(collectionHash('weeknight-dinner'), '#/saved/weeknight-dinner');
  assert.equal(collectionHash('holiday baking'), '#/saved/holiday%20baking');
});

test('parseRoute returns the discover route with no tags', () => {
  assert.deepEqual(withHash('#/discover', () => parseRoute()), { name: 'discover', tags: [] });
});

test('parseRoute pulls tags out of #/discover?tag=', () => {
  assert.deepEqual(
    withHash('#/discover?tag=meals,asian', () => parseRoute()),
    { name: 'discover', tags: ['meals', 'asian'] },
  );
});

test('discoverHash with no tags returns the bare discover URL', () => {
  assert.equal(discoverHash(), '#/discover');
  assert.equal(discoverHash([]), '#/discover');
});

test('discoverHash builds a tag-filter URL from an array', () => {
  assert.equal(discoverHash(['meals', 'asian']), '#/discover?tag=meals%2Casian');
});

test('discoverHash accepts a single string tag', () => {
  assert.equal(discoverHash('meals'), '#/discover?tag=meals');
});
