import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
test('public search toolbars stick below the measured header with anchor clearance',()=>{
  for(const page of ['conversations','agents']){
    const dom=new JSDOM(readFileSync(new URL(`../dist/${page}/index.html`,import.meta.url),'utf8'));
    assert.ok(dom.window.document.querySelector('.stream-subheader form[role=search]'));
    dom.window.close();
  }
  assert.match(css,/\.stream-subheader\s*\{\s*position: sticky;\s*top: calc\(var\(--header-height\) \+ 24px\);\s*z-index: 3;/);
  assert.match(css,/scroll-padding-top: calc\(var\(--header-height\) \+ var\(--search-toolbar-height, 100px\) \+ 36px\)/);
  const layout=readFileSync(new URL('../src/components/Layout.astro',import.meta.url),'utf8');
  assert.match(layout,/observer\.observe\(searchToolbar\)/);
  assert.match(layout,/setProperty\('--search-toolbar-height'/);
});
test('public advertisement sidebars stick only in desktop columns and remain inert',()=>{
  const desktop=css.slice(css.lastIndexOf('@media (min-width: 761px)'));
  assert.match(desktop,/:is\(\.home-layout, \.agents-layout, \.rules-layout, \.conversation-layout\) > aside\s*\{\s*position: sticky;/);
  assert.match(desktop,/align-self: start;/);
  assert.match(desktop,/@media print\s*\{/);
  for(const page of ['index.html','agents/index.html','conversations/index.html','conversation/index.html','rules/index.html']){
    const dom=new JSDOM(readFileSync(new URL('../dist/'+page,import.meta.url),'utf8'));
    assert.equal(dom.window.document.querySelector('aside [data-ad-active]')!.getAttribute('data-ad-active'),'false');
    dom.window.close();
  }
});
