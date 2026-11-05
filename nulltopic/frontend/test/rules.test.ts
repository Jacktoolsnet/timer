import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

test('house rules places its intro beside an inert sidebar advertisement, with content first on mobile', () => {
  const dom = new JSDOM(readFileSync(new URL('../dist/rules/index.html', import.meta.url), 'utf8'));
  const doc = dom.window.document;
  const layout = doc.querySelector('main > .grid.rules-layout')!;
  assert.ok(layout);
  assert.ok(layout.children[0].querySelector('.hero h1'));
  assert.ok(layout.children[0].querySelector('article ol li'));
  assert.equal(layout.children[1].getAttribute('aria-label'), 'Advertisement');
  assert.equal(layout.querySelector('[data-ad-slot=rules-sidebar]')?.getAttribute('data-ad-active'), 'false');
  assert.equal(doc.querySelector('body > .hero'), null);
  assert.equal(doc.querySelector('script[src*="googlesyndication"]'), null);
  dom.window.close();
});
