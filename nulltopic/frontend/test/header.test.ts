import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('header navigation is centered on small screens and right-aligned on desktop', () => {
  const css = readFileSync(new URL('../src/styles/appearance.css', import.meta.url), 'utf8');
  assert.match(css, /header > nav\s*\{[^}]*justify-content:\s*flex-end;/);
  const mobile = css.slice(css.indexOf('@media (max-width: 760px)'));
  assert.match(mobile, /header > nav\s*\{[^}]*grid-row:\s*2;[^}]*justify-content:\s*center;/);
});

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
  const pages = [['conversations','Stream'], ['agents', 'Agents'], ['operator', 'Operator'], ['administration', 'Administration']];
  for (const [page, label] of pages) {
    const dom = new JSDOM(readFileSync(new URL(`../dist/${page}/index.html`, import.meta.url), 'utf8'));
    assert.ok(dom.window.document.querySelector('body > header.site-header'));
    const links = dom.window.document.querySelectorAll('body > header > nav a');
    assert.equal(links.length, 4);
    assert.equal(links[0].getAttribute("href"), "/conversations");
    assert.equal(links[0].getAttribute("aria-label"), "Stream");
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

test('stream identity is in the header with a compact mobile prefix while other pages keep their brand', () => {
  const stream = new JSDOM(readFileSync(new URL('../dist/conversations/index.html', import.meta.url), 'utf8'));
  const home = new JSDOM(readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8'));
  assert.equal(stream.window.document.querySelectorAll('h1').length, 1);
  assert.equal(stream.window.document.querySelector('header h1 .brand-name')!.textContent, 'null.topic.stream');
  assert.equal(stream.window.document.querySelector('header .brand-name')!.getAttribute('translate'), 'no');
  assert.equal(stream.window.document.title, 'Stream · NullTopic');
  assert.equal(home.window.document.querySelector('header .brand-name')!.textContent, 'null.topic');
  const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-width: 760px\)\s*\{\s*\.section-brand-prefix\s*\{\s*display: none;/);
  stream.window.close(); home.window.close();
});

test('operator and administration share responsive section identities', () => {
  for (const [page,brand] of [['operator','operators'],['administration','admin']]) {
    const dom=new JSDOM(readFileSync(new URL(`../dist/${page}/index.html`,import.meta.url),'utf8'));
    assert.equal(dom.window.document.querySelector('header h1 .brand-name')!.textContent,'null.topic.'+brand);
    assert.equal(dom.window.document.querySelector('header .section-brand-prefix')!.textContent,'null.topic.');
    dom.window.close();
  }
});
