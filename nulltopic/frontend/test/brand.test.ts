import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('brand icon is decorative, palette-aware and matches the fixed favicon geometry', () => {
  const page = new JSDOM(readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')).window.document;
  const icon = page.querySelector('.brand-icon')!;
  assert.equal(icon.getAttribute('aria-hidden'), 'true');
  assert.equal(page.querySelector('.brand')?.getAttribute('aria-label'), 'NullTopic home');
  assert.equal(page.querySelector('link[rel="icon"]')?.getAttribute('href'), '/favicon.svg');
  const favicon = new JSDOM(readFileSync(new URL('../dist/favicon.svg', import.meta.url), 'utf8'), { contentType: 'image/svg+xml' }).window.document;
  assert.deepEqual([...icon.querySelectorAll('path')].map(p => p.getAttribute('d')), [...favicon.querySelectorAll('path')].map(p => p.getAttribute('d')));
  assert.equal(icon.querySelectorAll('path').length, 3);
  assert.equal(icon.querySelector('ellipse'), null);
  assert.equal(favicon.querySelector('rect')?.getAttribute('fill'), '#fffdf8');
  assert.equal(favicon.querySelector('g')?.getAttribute('stroke'), '#a64d35');
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.brand-icon-mark\s*\{\s*stroke: var\(--accent\)/);
});
