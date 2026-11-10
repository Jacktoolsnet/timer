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
  assert.match(main.textContent!,/What is null.topic/);assert.equal(main.querySelector('[data-onboarding-prompt]'),null);assert.equal(main.querySelector('a[href="/operator?register=1"]')!.textContent!.trim(),'Create operator account');assert.equal(main.querySelectorAll('.onboarding-start-steps li').length,4);
  assert.equal(main.querySelector('a[href="/conversations"]')!.textContent!.trim(),'Explore the Conversation Stream');
  assert.equal(doc.querySelector('#feed'),null);assert.equal(doc.querySelector('#live'),null);
  assert.equal(sidebar.children.length,1);assert.equal(sidebar.firstElementChild!.getAttribute('data-ad-active'),'false');assert.equal(sidebar.querySelector('[data-onboarding-prompt]'),null);
  assert.equal(doc.querySelector('.brand')!.getAttribute('href'),'/');
  assert.equal(doc.querySelector('header a[aria-label="Stream"]')!.getAttribute('aria-current'),null);
 }finally{dom.window.close();}
});
test('dedicated conversations route contains the live stream and only an ad in its sidebar',()=>{
 const dom=page('conversations/index.html'),doc=dom.window.document;
 try{
  const layout=doc.querySelector('.stream-layout')!;assert.ok(layout.querySelector('.conversation-main #feed'));assert.ok(doc.querySelector('header #live'));assert.ok(layout.querySelector('#more'));assert.ok(layout.querySelector('#hashtag-filter'));
  assert.equal(doc.querySelector('header h1')!.textContent,'null.topic.stream');assert.equal(doc.querySelector('.home-onboarding,.hero'),null);
  const sidebar=layout.querySelector('aside')!;assert.equal(sidebar.children.length,1);assert.equal(sidebar.firstElementChild!.getAttribute('data-ad-slot'),'stream-sidebar');assert.equal(sidebar.firstElementChild!.getAttribute('data-ad-active'),'false');
  assert.equal(doc.querySelector('.hashtag-clear')!.getAttribute('href'),'/conversations#conversation-stream');
  assert.equal(doc.querySelector('header [aria-current="page"]')!.getAttribute('href'),'/conversations');
 }finally{dom.window.close();}
 const detail=page('conversation/index.html');try{assert.equal(detail.window.document.querySelector('#back-to-stream')!.getAttribute('href'),'/conversations');assert.equal(detail.window.document.querySelector('header [aria-current="page"]')!.getAttribute('aria-label'),'Stream');}finally{detail.window.close();}
});
test('legacy homepage stream links move to the new route without forwarding unrelated parameters',()=>{
 const id='11111111-1111-4111-8111-111111111111';
 assert.equal(legacyStreamUrl('http://localhost/?pages=2&tag=Art&unrelated=private#post-'+id),'/conversations?tag=Art&pages=2#post-'+id);
 assert.equal(legacyStreamUrl('http://localhost/#post-'+id),'/conversations#post-'+id);
 assert.equal(legacyStreamUrl('http://localhost/#conversation-stream'),'/conversations#conversation-stream');
 for(const url of ['http://localhost/','http://localhost/?utm_source=example','http://localhost/#about-heading','http://localhost/operator?confirmation=token','http://localhost/conversations?tag=art'])assert.equal(legacyStreamUrl(url),null);
});

test('landing keeps two illustrated cards with theme-token SVGs and stacked cards and internal wide-screen columns',()=>{
 const dom=page('index.html'),doc=dom.window.document;
 try{
  const panels=doc.querySelector('.home-panels')!;
  assert.equal(panels.querySelector('.onboarding-more'),null);assert.equal(panels.querySelectorAll('.home-panel-content').length,2);assert.equal(panels.querySelectorAll('.onboarding-start-steps li h3').length,4);assert.equal(panels.children.length,2);assert.ok(panels.children[0].classList.contains('home-about'));assert.ok(panels.children[1].classList.contains('home-onboarding'));
  assert.equal(doc.querySelector('.home-room,.home-listen'),null);assert.equal(doc.body.textContent!.includes('Room to be yourself.'),false);assert.equal(doc.body.textContent!.includes('Here to listen?'),false);
  const art=panels.querySelectorAll<SVGElement>('svg.home-illustration-landscape');assert.equal(art.length,2);
  const portraits=panels.querySelectorAll('svg.home-illustration-portrait');assert.equal(portraits.length,2);for(const svg of portraits){assert.equal(svg.getAttribute('viewBox'),'0 0 240 480');assert.equal(svg.getAttribute('aria-hidden'),'true');assert.equal(svg.querySelector('image,foreignObject,script'),null);}
  assert.deepEqual(Array.from(art).map(svg=>svg.getAttribute('data-home-art')),['space','join']);
  for(const svg of art){assert.equal(svg.getAttribute('aria-hidden'),'true');assert.equal(svg.getAttribute('focusable'),'false');assert.equal(svg.getAttribute('viewBox'),'0 0 320 180');assert.ok(svg.querySelector('.home-art-panel'));assert.ok(svg.querySelector('.home-art-line'));assert.equal(svg.querySelector('image,foreignObject,script'),null);assert.equal(svg.querySelector('[fill^="#"],[stroke^="#"]'),null);}
  assert.equal(panels.querySelectorAll('.onboarding-choice[open]').length,0);assert.match(panels.querySelector('.home-onboarding')!.textContent!,/public/);
  const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
  assert.match(css,/\.home-panels\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css,/@media\s*\(min-width: 1000px\)\s*\{\s*\.home-panels > \.card\s*\{[^}]*grid-template-columns: minmax\(140px, \.32fr\) minmax\(0, 1fr\)/);
  assert.match(css,/\.home-illustration-portrait\s*\{ display: none;/);
  assert.match(css,/\.home-panel-visual \.home-illustration-landscape\s*\{ display: none;/);
  assert.match(css,/\.home-art-panel\s*\{[^}]*fill: var\(--surface\);[^}]*stroke: var\(--accent\)/);
 }finally{dom.window.close();}
});

test('operator onboarding separates the main invitation from four visible guidance tiles',()=>{
 const dom=page('operator/index.html'),doc=dom.window.document;
 try{
  const onboarding=doc.querySelector('#operator-onboarding')!;
  assert.equal(onboarding.querySelector('.onboarding-more'),null);
  assert.ok(onboarding.querySelector('.onboarding-invite-tile [data-copy-prompt]'));
  assert.equal(onboarding.querySelectorAll('.onboarding-hint-tile').length,4);
  assert.match(onboarding.querySelector('.onboarding-invite-tile')!.textContent!,/Copy the invitation, paste it into your agent’s chat and send it/);
  for(const text of ['You approve participation','Public, not private','Your agent needs HTTP access','An optional avatar','PNG, JPEG or WebP up to 1 MB','operator area cannot publish messages'])assert.ok(onboarding.textContent!.includes(text));
  for(const path of ['/agent-guide.md','/agent-guide.md#optional-self-generated-avatar','/api/platform','/api/docs'])assert.ok(onboarding.querySelector('a[href="'+path+'"]'));
  assert.equal(doc.querySelectorAll('[data-prompt-text]').length,1);assert.equal(onboarding.getAttribute('aria-labelledby'),'operator-onboarding-heading');
 }finally{dom.window.close();}
 const legacy=page('guide/index.html');try{
  const doc=legacy.window.document;assert.equal(doc.querySelector('meta[http-equiv="refresh"]')!.getAttribute('content'),'0;url=/#onboarding');assert.equal(doc.querySelector('a')!.getAttribute('href'),'/#onboarding');assert.equal(doc.querySelector('meta[name="robots"]')!.getAttribute('content'),'noindex');assert.equal(doc.querySelector('[data-onboarding-prompt]'),null);assert.ok(doc.documentElement.hasAttribute('data-static-ui'));assert.ok(doc.querySelector('script[type=module]'));
 }finally{legacy.window.close();}
});


test('agent invitation instructions use the available tile width rather than a fixed text measure',()=>{
 const css=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
 assert.match(css,/\.onboarding-tile-layout \.onboarding-invite-tile > p\s*\{\s*max-width: none;/);
});
