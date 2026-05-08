import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { shuffleAndTake, parseTagsParam } from '../docs/modules/util/arrays.js';

test('shuffleAndTake returns at most n elements', () => {
  const out = shuffleAndTake([1, 2, 3, 4, 5], 3);
  assert.equal(out.length, 3);
});

test('shuffleAndTake returns all elements when n exceeds length', () => {
  const out = shuffleAndTake([1, 2, 3], 10);
  assert.equal(out.length, 3);
});

test('shuffleAndTake does not mutate the input array', () => {
  const input = [1, 2, 3, 4, 5];
  const snapshot = input.slice();
  shuffleAndTake(input, 3);
  assert.deepEqual(input, snapshot);
});

test('shuffleAndTake preserves the original element set', () => {
  const input = ['a', 'b', 'c', 'd'];
  const out = shuffleAndTake(input, 4);
  assert.deepEqual(out.slice().sort(), input.slice().sort());
});

test('shuffleAndTake on empty array returns empty array', () => {
  assert.deepEqual(shuffleAndTake([], 5), []);
});

test('parseTagsParam returns empty array for missing / empty input', () => {
  assert.deepEqual(parseTagsParam(null), []);
  assert.deepEqual(parseTagsParam(undefined), []);
  assert.deepEqual(parseTagsParam(''), []);
});

test('parseTagsParam splits a single value', () => {
  assert.deepEqual(parseTagsParam('vegetarian'), ['vegetarian']);
});

test('parseTagsParam splits a comma-separated list', () => {
  assert.deepEqual(parseTagsParam('vegetarian,quick,spicy'), ['vegetarian', 'quick', 'spicy']);
});

test('parseTagsParam trims whitespace', () => {
  assert.deepEqual(parseTagsParam(' vegetarian , quick '), ['vegetarian', 'quick']);
});

test('parseTagsParam drops empty entries', () => {
  assert.deepEqual(parseTagsParam('vegetarian,,quick,'), ['vegetarian', 'quick']);
  assert.deepEqual(parseTagsParam(',,,'), []);
});
