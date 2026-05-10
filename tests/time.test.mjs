import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseToMinutes, shortFormat, formatMinutes } from '../docs/modules/util/time.js';

test('parseToMinutes handles minutes-only strings', () => {
  assert.equal(parseToMinutes('30 minutes'), 30);
  assert.equal(parseToMinutes('5 mins'), 5);
  assert.equal(parseToMinutes('1 min'), 1);
});

test('parseToMinutes handles hours-only strings', () => {
  assert.equal(parseToMinutes('1 hour'), 60);
  assert.equal(parseToMinutes('2 hours'), 120);
});

test('parseToMinutes sums hour + minute parts', () => {
  assert.equal(parseToMinutes('1 hour 30 minutes'), 90);
  assert.equal(parseToMinutes('2 hours 15 mins'), 135);
});

test('parseToMinutes accepts decimal hours', () => {
  assert.equal(parseToMinutes('1.5 hours'), 90);
});

test('parseToMinutes reads unicode-fraction hours', () => {
  // Regression: doro-wat / kare-kare wrote times like "1½ hours" but the
  // parser silently dropped the fraction, leaving the recipe tagged
  // `quick` despite a multi-hour cook.
  assert.equal(parseToMinutes('1½ hours'), 90);
  assert.equal(parseToMinutes('1¼ hours'), 75);
  assert.equal(parseToMinutes('3½ hours'), 210);
  assert.equal(parseToMinutes('½ hour'), 30);
  assert.equal(parseToMinutes('1¾ hours 10 minutes'), 115);
});

test('parseToMinutes returns 0 for missing or unparseable input', () => {
  assert.equal(parseToMinutes(''), 0);
  assert.equal(parseToMinutes(null), 0);
  assert.equal(parseToMinutes(undefined), 0);
  assert.equal(parseToMinutes('immediate'), 0);
});

test('shortFormat returns empty string for zero / missing input', () => {
  assert.equal(shortFormat(0), '');
  assert.equal(shortFormat(null), '');
  assert.equal(shortFormat(-5), '');
  assert.equal(shortFormat(undefined), '');
});

test('shortFormat renders sub-hour values as "N min"', () => {
  assert.equal(shortFormat(30), '30 min');
  assert.equal(shortFormat(59), '59 min');
});

test('shortFormat renders whole-hour values as "N hr"', () => {
  assert.equal(shortFormat(60), '1 hr');
  assert.equal(shortFormat(120), '2 hr');
});

test('shortFormat renders mixed values as "H hr M min"', () => {
  assert.equal(shortFormat(90), '1 hr 30 min');
  assert.equal(shortFormat(135), '2 hr 15 min');
});

test('formatMinutes returns null for non-positive input', () => {
  assert.equal(formatMinutes(0), null);
  assert.equal(formatMinutes(-1), null);
});

test('formatMinutes singularises the hour word', () => {
  assert.equal(formatMinutes(60), '1 hour');
  assert.equal(formatMinutes(120), '2 hours');
  assert.equal(formatMinutes(90), '1 hour 30 minutes');
});

test('formatMinutes always plural for minutes (matches existing source)', () => {
  // The function never singularises "minutes" to "minute"; the build script
  // never displays a 1-minute value but this documents the current behaviour.
  assert.equal(formatMinutes(30), '30 minutes');
});
