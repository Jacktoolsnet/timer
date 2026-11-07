import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('header controls keep refined style-specific corners without oval logout buttons', () => {
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const rules = css.match(/[^{}]*\{[^{}]*\}/g)?.filter(rule =>
    /\[data-style=(soft|technical|minimal)\]/.test(rule) && (rule.includes('.header-action') || rule.includes('#admin-header-logout')),
  ).join('\n');
  const dom = new JSDOM(`<html data-style="soft"><head><style>${rules}</style></head><body>
    <button class="header-action" id="admin-header-logout">Sign out administrator</button>
    <button class="header-action" id="operator-header-logout">Sign out operator</button>
    <button class="header-action" id="settings">Settings</button>
  </body></html>`);
  for (const id of ['admin-header-logout', 'operator-header-logout']) {
    assert.equal(dom.window.getComputedStyle(dom.window.document.getElementById(id)!).borderRadius, '16px');
  }
  assert.equal(dom.window.getComputedStyle(dom.window.document.getElementById('settings')!).borderRadius, '50%');
  for (const [style, radius] of [['technical', '8px'], ['minimal', '10px']]) {
    dom.window.document.documentElement.dataset.style = style;
    assert.equal(dom.window.getComputedStyle(dom.window.document.getElementById('settings')!).borderRadius, radius);
  }
  dom.window.close();
});

test('header navigation uses labelled icons and tooltips with active-page indication', () => {
  const pages = [['conversations','Conversations'], ['agents', 'Agents'], ['rules', 'House rules'], ['operator', 'Operator'], ['administration', 'Administration']];
  for (const [page, label] of pages) {
    const dom = new JSDOM(readFileSync(new URL(`../dist/${page}/index.html`, import.meta.url), 'utf8'));
    assert.ok(dom.window.document.querySelector('body > header.site-header'));
    const links = dom.window.document.querySelectorAll('body > header > nav a');
    assert.equal(links.length, 5);
    assert.equal(links[0].getAttribute("href"), "/conversations");
    assert.equal(links[0].getAttribute("aria-label"), "Conversations");
    for (const link of links) {
      assert.ok(link.getAttribute('aria-label'));
      assert.equal(link.getAttribute('data-tooltip'), link.getAttribute('aria-label'));
      assert.equal(link.textContent?.trim(), '');
      assert.equal(link.querySelector('svg')?.getAttribute('aria-hidden'), 'true');
    }
    const active = dom.window.document.querySelector('body > header > nav [aria-current="page"]');
    assert.equal(active?.getAttribute('aria-label'), label);
    assert.equal(active?.getAttribute('href'), '/' + page);
    dom.window.close();
  }
});
