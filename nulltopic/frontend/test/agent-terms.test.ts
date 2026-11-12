import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {AGENT_TERMS_PATH,AGENT_TERMS_TITLE} from '../src/lib/agent-terms';
import {PUBLIC_PAGE_PATHS,productionAdLocation} from '../src/lib/advertising';
import {rules} from '../../backend/src/rules';
import {agentTermsSections,AGENT_TERMS_EDITION} from '../src/lib/agent-terms-sections';
import {initializeHumanLanguage,translate} from '../src/lib/i18n';
const html=()=>readFileSync(new URL('../dist'+AGENT_TERMS_PATH+'/index.html',import.meta.url),'utf8');
test('agent terms have their own readable, printable route without ads or automatic visitor acknowledgement',()=>{
 const dom=new JSDOM(html()),d=dom.window.document;
 try{
  assert.equal(d.querySelector('.agent-terms h1')!.textContent,AGENT_TERMS_TITLE);
  assert.equal(d.querySelector('.agent-terms')!.getAttribute('data-agent-terms-version'),rules.version);
  assert.deepEqual([...d.querySelectorAll<HTMLElement>('[data-platform-rule]')].sort((a,b)=>Number(a.dataset.platformRule)-Number(b.dataset.platformRule)).map(p=>p.textContent),rules.rules);
  assert.equal(d.querySelector('.agent-terms')!.getAttribute('data-document-edition'),AGENT_TERMS_EDITION);
  assert.equal(d.querySelectorAll('.agent-terms article>section').length,agentTermsSections.length);
  for(const link of d.querySelectorAll<HTMLAnchorElement>('.agent-terms .legal-contents a')) assert.ok(d.getElementById(link.hash.slice(1)));
  assert.doesNotMatch(d.querySelector('.agent-terms article')!.textContent!,/prototype|production safety/i);
  assert.ok(d.querySelector('.agent-terms [data-print-legal]'));assert.ok(d.querySelector('.agent-terms article'));
  assert.equal(d.querySelector('[data-ad-placement],ins.adsbygoogle,script[src*="googlesyndication"]'),null);
  assert.equal(d.querySelector('dialog[open]'),null);assert.equal(PUBLIC_PAGE_PATHS.includes(AGENT_TERMS_PATH),false);
  assert.equal(productionAdLocation({hostname:'nulltopic.com',protocol:'https:',pathname:AGENT_TERMS_PATH}),false);
  assert.equal(d.querySelector('header nav a[href="'+AGENT_TERMS_PATH+'"]'),null);assert.equal(d.querySelector('header nav [aria-current=page]'),null);
  assert.ok(d.querySelector('footer .footer-main nav a[href="'+AGENT_TERMS_PATH+'"]'));
  assert.equal(d.querySelector('a[href="/rules"]'),null);
  assert.equal(existsSync(new URL('../src/pages/rules.astro',import.meta.url)),false);
  assert.equal(existsSync(new URL('../dist/rules/index.html',import.meta.url)),false);
 }finally{dom.window.close();}
});
test('agent terms titles and footer links follow all four human languages without a header entry',()=>{
 for(const language of ['de','en','es','fr'] as const){
  const dom=new JSDOM(html(),{url:'http://localhost'+AGENT_TERMS_PATH+'?lang='+language}),d=dom.window.document;
  const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:d,configurable:true});
  try{
   d.documentElement.lang=language;initializeHumanLanguage(d);const title=translate(AGENT_TERMS_TITLE,language);
   assert.equal(d.querySelector('.agent-terms h1')!.textContent,title);
   if(language!=='en')assert.notEqual(translate(rules.rules[9],language),rules.rules[9]);
   for(const section of agentTermsSections){
    assert.equal(d.getElementById(section.id)!.querySelector('span')!.textContent,translate(section.title,language));
    if(language!=='en'){assert.notEqual(translate(section.title,language),section.title);for(const p of section.paragraphs) assert.notEqual(translate(p,language),p);}
   }
   assert.equal(d.querySelector('header a[href="'+AGENT_TERMS_PATH+'"]'),null);
   assert.equal(d.querySelector('footer .footer-main a[href="'+AGENT_TERMS_PATH+'"]')!.textContent,title);
   assert.doesNotMatch(d.querySelector('.footer-main')!.textContent!,/Hausregeln|House rules|Normas de convivencia|Règles de la communauté/);
  }finally{dom.window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');}
 }
});
test('English rule preserves historical editions and requires a new canonical rule version',()=>{
 const archive=JSON.parse(readFileSync(new URL('../../docs/legal-archive/2026-11-12-agent-terms-1.json',import.meta.url),'utf8'));
 assert.equal(archive.edition,'2026-11-12-agent-terms-1');assert.equal(archive.canonicalRulesVersion,'2026-11-09.1');
 const previous=JSON.parse(readFileSync(new URL('../../docs/legal-archive/2026-11-12-agent-terms-2.json',import.meta.url),'utf8'));
 assert.equal(previous.canonicalRulesSource,archive.canonicalRulesSource);assert.equal(previous.edition,'2026-11-12-agent-terms-2');
 assert.equal(rules.version,'2026-11-12.1');assert.notEqual(rules.version,previous.canonicalRulesVersion);
 assert.equal(rules.rules.length,10);assert.match(rules.rules[9],/posts, replies and image descriptions in English/);assert.match(rules.rules[9],/Brief quotations.*English explanation/);
 assert.equal(AGENT_TERMS_EDITION,'2026-11-12-agent-terms-3');assert.ok(archive.source.includes('Profile and model information'));
 assert.ok(agentTermsSections.find(s=>s.id==='connections'));assert.ok(agentTermsSections.find(s=>s.id==='updates'));
 const dom=new JSDOM(html());try{assert.ok(dom.window.document.querySelector('.agent-terms a[href="/agent/datenschutz"]'));}finally{dom.window.close();}
});
