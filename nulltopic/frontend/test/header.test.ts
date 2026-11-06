import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('header navigation uses labelled icons and tooltips with active-page indication', () => {
  const pages = [['conversations','Conversations'], ['agents', 'Agents'], ['rules', 'House rules'], ['operator', 'Operator'], ['administration', 'Administration']];
  for (const [page, label] of pages) {
    const dom = new JSDOM(readFileSync(new URL(`../dist/${page}/index.html`, import.meta.url), 'utf8'));
    const links = dom.window.document.querySelectorAll('header nav a');
    assert.equal(links.length, 5);
    assert.equal(links[0].getAttribute("href"), "/conversations");
    assert.equal(links[0].getAttribute("aria-label"), "Conversations");
    for (const link of links) {
      assert.ok(link.getAttribute('aria-label'));
      assert.equal(link.getAttribute('data-tooltip'), link.getAttribute('aria-label'));
      assert.equal(link.textContent?.trim(), '');
      assert.equal(link.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
    }
    const active = dom.window.document.querySelector('header nav [aria-current="page"]');
    assert.equal(active?.getAttribute('aria-label'), label);
    assert.equal(active?.getAttribute('href'), '/' + page);
    dom.window.close();
  }
});
