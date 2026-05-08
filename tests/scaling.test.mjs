import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseQuantity } from '../docs/modules/recipe/scaling.js';

test('parseQuantity reads plain integers', () => {
  assert.equal(parseQuantity('1'), 1);
  assert.equal(parseQuantity('250'), 250);
});

test('parseQuantity reads decimal numbers', () => {
  assert.equal(parseQuantity('1.5'), 1.5);
  assert.equal(parseQuantity('0.25'), 0.25);
});

test('parseQuantity accepts comma as a decimal separator', () => {
  assert.equal(parseQuantity('1,5'), 1.5);
});

test('parseQuantity reads ASCII fractions like 1/2 or 1/8', () => {
  assert.equal(parseQuantity('1/2'), 0.5);
  assert.equal(parseQuantity('1/4'), 0.25);
  assert.equal(parseQuantity('1/8'), 0.125);
  assert.equal(parseQuantity('3/4'), 0.75);
});

test('parseQuantity reads mixed-number ASCII fractions like 1 1/2', () => {
  assert.equal(parseQuantity('1 1/2'), 1.5);
  assert.equal(parseQuantity('2 3/4'), 2.75);
});

test('parseQuantity ignores trailing unit text after an ASCII fraction', () => {
  assert.equal(parseQuantity('1/2 teaspoon'), 0.5);
  assert.equal(parseQuantity('1 1/2 cups'), 1.5);
});

test('parseQuantity reads leading-dot decimals (.5, .25)', () => {
  assert.equal(parseQuantity('.5'), 0.5);
  assert.equal(parseQuantity('.25'), 0.25);
  assert.equal(parseQuantity('.5 cups'), 0.5);
});

const FRACTIONS = [
  ['½', 0.5],
  ['¼', 0.25],
  ['¾', 0.75],
  ['⅓', 1 / 3],
  ['⅔', 2 / 3],
  ['⅛', 0.125],
  ['⅜', 0.375],
  ['⅝', 0.625],
  ['⅞', 0.875],
];

for (const [glyph, value] of FRACTIONS) {
  test(`parseQuantity decodes the ${glyph} fraction`, () => {
    assert.equal(parseQuantity(glyph), value);
  });
}

test('parseQuantity sums an integer and a unicode fraction', () => {
  assert.equal(parseQuantity('1½'), 1.5);
  assert.equal(parseQuantity('2¼'), 2.25);
});

test('parseQuantity tolerates leading whitespace', () => {
  assert.equal(parseQuantity('  3'), 3);
  assert.equal(parseQuantity('  ½'), 0.5);
});

test('parseQuantity returns NaN for unparseable input', () => {
  assert.ok(Number.isNaN(parseQuantity('abc')));
  assert.ok(Number.isNaN(parseQuantity('')));
});

test('parseQuantity ignores trailing units', () => {
  // The function only consumes the leading number + any unicode fractions
  // anywhere in the string. "200g" parses to 200 because "g" is ignored.
  assert.equal(parseQuantity('200g'), 200);
  assert.equal(parseQuantity('1 cup'), 1);
});
