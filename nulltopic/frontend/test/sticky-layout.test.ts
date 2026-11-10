import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
test('screen layout keeps loading/short-page footers at the viewport bottom without fixing them',()=>{
 assert.match(css,/@media screen \{\s*body \{ display: flex; flex-direction: column; min-height: 100vh; min-height: 100svh; \}/);
 assert.match(css,/body > main \{ flex: 1 0 auto; width: 100%; \}/);
 assert.match(css,/body > \.site-footer \{ width: 100%; margin: 0 auto; \}/);
});
test('page content fades without translation, reduced-motion or print side effects',()=>{
 assert.match(css,/@media screen and \(prefers-reduced-motion: no-preference\)\s*\{\s*body > main \{ animation: page-content-in \.6s ease-out; \}/);
 const frames=css.match(/@keyframes page-content-in \{([^\n]+)\}/)![1];
 assert.match(frames,/from \{ opacity: 0; \} to \{ opacity: 1; \}/);
 assert.doesNotMatch(frames,/transform|translate|position|visibility/);
 assert.match(css,/body > \.site-footer \{ animation: page-footer-in \.35s ease-out \.6s backwards; \}/);
 assert.match(css,/@keyframes page-footer-in \{ from \{ opacity: 0; \} to \{ opacity: 1; \} \}/);
});
test('initial sticky measurement runs synchronously before main and reserves scrollbar space',()=>{
 const dom=new JSDOM(readFileSync(new URL('../dist/agents/index.html',import.meta.url),'utf8'),{runScripts:'outside-only'}),d=dom.window.document;
 try{
  const header=d.querySelector<HTMLElement>('body > .site-header')!;
  const script=header.nextElementSibling!;
  assert.equal(script.tagName,'SCRIPT');assert.equal(script.getAttribute('type'),null);
  assert.ok(script.compareDocumentPosition(d.querySelector('main')!)&dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  header.getBoundingClientRect=()=>({height:84} as DOMRect);
  dom.window.eval(script.textContent!);
  assert.equal(d.documentElement.style.getPropertyValue('--header-height'),'84px');
  assert.match(css,/scrollbar-gutter:\s*stable/);
 }finally{dom.window.close();}
});
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
