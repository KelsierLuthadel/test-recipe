import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  escapeHtml,
  escapeAttr,
  escapeRegex,
  slugifyAnchor,
} from '../docs/modules/util/dom.js';

test('escapeHtml encodes the five HTML-significant characters', () => {
  assert.equal(escapeHtml('<a href="x">y\'z & b</a>'),
    '&lt;a href=&quot;x&quot;&gt;y&#39;z &amp; b&lt;/a&gt;');
});

test('escapeHtml stringifies non-string input', () => {
  assert.equal(escapeHtml(42), '42');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('escapeAttr is an alias of escapeHtml', () => {
  const sample = `<"& '>`;
  assert.equal(escapeAttr(sample), escapeHtml(sample));
});

test('escapeRegex escapes regex metacharacters', () => {
  assert.equal(escapeRegex('a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o'),
    'a\\.b\\*c\\+d\\?e\\^f\\$g\\{h\\}i\\(j\\)k\\|l\\[m\\]n\\\\o');
});

test('escapeRegex result actually matches literally', () => {
  const literal = 'a+b';
  const re = new RegExp(escapeRegex(literal));
  assert.ok(re.test('xa+by'));
  assert.ok(!re.test('xaaaby'));
});

test('slugifyAnchor lowercases and replaces non-alphanumerics with hyphens', () => {
  assert.equal(slugifyAnchor('Hello, World!'), 'hello-world');
  assert.equal(slugifyAnchor('Step 2: Mix the dough'), 'step-2-mix-the-dough');
});

test('slugifyAnchor trims leading and trailing hyphens', () => {
  assert.equal(slugifyAnchor('   leading   '), 'leading');
  assert.equal(slugifyAnchor('!!!bang!!!'), 'bang');
});

test('slugifyAnchor truncates at 80 chars', () => {
  const long = 'a'.repeat(120);
  assert.equal(slugifyAnchor(long).length, 80);
});

test('slugifyAnchor returns null for empty / whitespace / non-text input', () => {
  assert.equal(slugifyAnchor(''), null);
  assert.equal(slugifyAnchor('!!!'), null);
  assert.equal(slugifyAnchor(null), null);
  assert.equal(slugifyAnchor(undefined), null);
});
