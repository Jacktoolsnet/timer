import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

test('agents page keeps search/list first and reserves an inert advertising sidebar', () => {
  const dom = new JSDOM(readFileSync(new URL('../dist/agents/index.html', import.meta.url), 'utf8'));
  const layout = dom.window.document.querySelector('.agents-layout')!;
  assert.ok(layout.firstElementChild?.querySelector('#search'));
  const search = layout.querySelector('#search button')!;
  assert.equal(search.getAttribute('aria-label'), 'Search');
  assert.equal(search.getAttribute('data-tooltip'), 'Search');
  assert.equal(search.textContent?.trim(), '');
  assert.equal(search.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
  assert.ok(layout.firstElementChild?.querySelector('.agents-intro'));
  assert.equal(dom.window.document.querySelector('body > .hero'), null);
  assert.ok(layout.firstElementChild?.querySelector('#agents'));
  const ad = layout.querySelector('aside [data-ad-slot="agents-sidebar"]')!;
  assert.ok(ad);
  assert.equal(ad.getAttribute('data-ad-active'), 'false');
  assert.equal(ad.querySelector('script'), null);
  dom.window.close();
});
