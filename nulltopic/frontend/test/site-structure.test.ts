import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {legacyStreamUrl} from '../src/scripts/stream-navigation';
function page(path:string){return new JSDOM(readFileSync(new URL('../dist/'+path,import.meta.url),'utf8'));}
test('home explains NullTopic and gives onboarding the main column; sidebar contains only inert advertising',()=>{
 const dom=page('index.html'),doc=dom.window.document;
 try{
  const main=doc.querySelector('.home-main')!,sidebar=doc.querySelector('.home-sidebar')!;
  assert.match(main.textContent!,/What is null.topic/);assert.ok(main.querySelector('.home-onboarding [data-onboarding-prompt]'));
  assert.equal(main.querySelector('a[href="/conversations"]')!.textContent!.trim(),'Explore the Conversation Stream');
  assert.equal(doc.querySelector('#feed'),null);assert.equal(doc.querySelector('#live'),null);
  assert.equal(sidebar.children.length,1);assert.equal(sidebar.firstElementChild!.getAttribute('data-ad-active'),'false');assert.equal(sidebar.querySelector('[data-onboarding-prompt]'),null);
  assert.equal(doc.querySelector('.brand')!.getAttribute('href'),'/');
  assert.equal(doc.querySelector('header a[aria-label="Conversations"]')!.getAttribute('aria-current'),null);
 }finally{dom.window.close();}
});
test('dedicated conversations route contains the live stream and only an ad in its sidebar',()=>{
 const dom=page('conversations/index.html'),doc=dom.window.document;
 try{
  const layout=doc.querySelector('.stream-layout')!;assert.ok(layout.querySelector('.conversation-main #feed'));assert.ok(layout.querySelector('#live'));assert.ok(layout.querySelector('#more'));assert.ok(layout.querySelector('#hashtag-filter'));
  assert.equal(doc.querySelector('h1')!.textContent,'Conversation Stream');assert.equal(doc.querySelector('.home-onboarding,.hero'),null);
  const sidebar=layout.querySelector('aside')!;assert.equal(sidebar.children.length,1);assert.equal(sidebar.firstElementChild!.getAttribute('data-ad-slot'),'stream-sidebar');assert.equal(sidebar.firstElementChild!.getAttribute('data-ad-active'),'false');
  assert.equal(doc.querySelector('.hashtag-clear')!.getAttribute('href'),'/conversations#conversation-stream');
  assert.equal(doc.querySelector('header [aria-current="page"]')!.getAttribute('href'),'/conversations');
 }finally{dom.window.close();}
 const detail=page('conversation/index.html');try{assert.equal(detail.window.document.querySelector('#back-to-stream')!.getAttribute('href'),'/conversations');assert.equal(detail.window.document.querySelector('header [aria-current="page"]')!.getAttribute('aria-label'),'Conversations');}finally{detail.window.close();}
});
test('legacy homepage stream links move to the new route without forwarding unrelated parameters',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 assert.equal(legacyStreamUrl('http://localhost/?pages=2&tag=Art&unrelated=private#post-'+id),'/conversations?tag=Art&pages=2#post-'+id);
 assert.equal(legacyStreamUrl('http://localhost/#post-'+id),'/conversations#post-'+id);
 assert.equal(legacyStreamUrl('http://localhost/#conversation-stream'),'/conversations#conversation-stream');
 for(const url of ['http://localhost/','http://localhost/?utm_source=example','http://localhost/#about-heading','http://localhost/operator?confirmation=token','http://localhost/conversations?tag=art'])assert.equal(legacyStreamUrl(url),null);
});

test('landing keeps two illustrated cards with theme-token SVGs and a wide-screen two-column layout',()=>{
 const dom=page('index.html'),doc=dom.window.document;
 try{
  const panels=doc.querySelector('.home-panels')!;
  assert.equal(panels.children.length,2);assert.ok(panels.children[0].classList.contains('home-about'));assert.ok(panels.children[1].classList.contains('home-onboarding'));
  assert.equal(doc.querySelector('.home-room,.home-listen'),null);assert.equal(doc.body.textContent!.includes('Room to be yourself.'),false);assert.equal(doc.body.textContent!.includes('Here to listen?'),false);
  const art=panels.querySelectorAll<SVGElement>('svg.home-illustration');assert.equal(art.length,2);
  assert.deepEqual(Array.from(art).map(svg=>svg.getAttribute('data-home-art')),['space','join']);
  for(const svg of art){assert.equal(svg.getAttribute('aria-hidden'),'true');assert.equal(svg.getAttribute('focusable'),'false');assert.equal(svg.getAttribute('viewBox'),'0 0 320 180');assert.ok(svg.querySelector('.home-art-panel'));assert.ok(svg.querySelector('.home-art-line'));assert.equal(svg.querySelector('image,foreignObject,script'),null);assert.equal(svg.querySelector('[fill^="#"],[stroke^="#"]'),null);}
  assert.equal(panels.querySelectorAll('.onboarding-choice[open]').length,0);assert.match(panels.querySelector('.home-onboarding')!.textContent!,/public/);
  const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
  assert.match(css,/\.home-panels\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css,/@media\s*\(min-width: 1280px\)\s*\{\s*\.home-panels\s*\{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css,/\.home-art-panel\s*\{[^}]*fill: var\(--surface\);[^}]*stroke: var\(--accent\)/);
 }finally{dom.window.close();}
});

test('onboarding absorbs guide details in a closed disclosure and retains separate technical resources',()=>{
 const dom=page('index.html'),doc=dom.window.document;
 try{
  const onboarding=doc.querySelector('#onboarding')!,more=onboarding.querySelector<HTMLDetailsElement>('.onboarding-more')!;
  assert.ok(more);assert.equal(more.open,false);assert.equal(more.querySelector('summary')!.textContent,'More information');
  for(const text of ['For agents','Your agent’s avatar','For operators','PNG, JPEG or WebP up to 1 MB','explicitly approve','does not run an agent','cannot publish messages'])assert.ok(more.textContent!.includes(text));
  for(const path of ['/agent-guide.md','/agent-guide.md#optional-self-generated-avatar','/api/platform','/api/docs','/operator'])assert.ok(more.querySelector('a[href="'+path+'"]'));
  assert.equal(doc.querySelector('a[href="/guide"]'),null);assert.equal(doc.body.textContent!.includes('Read the onboarding steps'),false);
  assert.equal(doc.querySelectorAll('[data-prompt-text]').length,1);assert.equal(doc.querySelectorAll('.onboarding-choice[open]').length,0);
  assert.equal(onboarding.getAttribute('aria-labelledby'),'onboarding-heading');
 }finally{dom.window.close();}
 const legacy=page('guide/index.html');try{
  const doc=legacy.window.document;assert.equal(doc.querySelector('meta[http-equiv="refresh"]')!.getAttribute('content'),'0;url=/#onboarding');assert.equal(doc.querySelector('a')!.getAttribute('href'),'/#onboarding');assert.equal(doc.querySelector('meta[name="robots"]')!.getAttribute('content'),'noindex');assert.equal(doc.querySelector('[data-onboarding-prompt]'),null);assert.ok(doc.documentElement.hasAttribute('data-static-ui'));assert.ok(doc.querySelector('script[type=module]'));
 }finally{legacy.window.close();}
});
