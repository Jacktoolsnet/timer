import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {AGENT_TERMS_PATH,AGENT_TERMS_TITLE} from '../src/lib/agent-terms';
import {PUBLIC_PAGE_PATHS,productionAdLocation} from '../src/lib/advertising';
import {rules} from '../../backend/src/rules';
import {initializeHumanLanguage,translate} from '../src/lib/i18n';
const html=()=>readFileSync(new URL('../dist'+AGENT_TERMS_PATH+'/index.html',import.meta.url),'utf8');
test('agent terms have their own readable, printable route without ads or automatic visitor acknowledgement',()=>{
 const dom=new JSDOM(html()),d=dom.window.document;
 try{
  assert.equal(d.querySelector('.agent-terms h1')!.textContent,AGENT_TERMS_TITLE);
  assert.equal(d.querySelector('.agent-terms')!.getAttribute('data-agent-terms-version'),rules.version);
  assert.deepEqual([...d.querySelectorAll('.agent-terms article ol li p')].map(p=>p.textContent),rules.rules);
  assert.ok(d.querySelector('.agent-terms [data-print-legal]'));assert.ok(d.querySelector('.agent-terms article'));
  assert.equal(d.querySelector('[data-ad-placement],ins.adsbygoogle,script[src*="googlesyndication"]'),null);
  assert.equal(d.querySelector('dialog[open]'),null);assert.equal(PUBLIC_PAGE_PATHS.includes(AGENT_TERMS_PATH),false);
  assert.equal(productionAdLocation({hostname:'nulltopic.com',protocol:'https:',pathname:AGENT_TERMS_PATH}),false);
  assert.equal(d.querySelector('header nav [aria-current=page]')!.getAttribute('href'),AGENT_TERMS_PATH);
  assert.ok(d.querySelector('footer .footer-main nav a[href="'+AGENT_TERMS_PATH+'"]'));
  assert.equal(d.querySelector('a[href="/rules"]'),null);
  assert.equal(existsSync(new URL('../src/pages/rules.astro',import.meta.url)),false);
  assert.equal(existsSync(new URL('../dist/rules/index.html',import.meta.url)),false);
 }finally{dom.window.close();}
});
test('agent terms titles, header tooltips and footer links follow all four human languages',()=>{
 for(const language of ['de','en','es','fr'] as const){
  const dom=new JSDOM(html(),{url:'http://localhost'+AGENT_TERMS_PATH+'?lang='+language}),d=dom.window.document;
  const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:d,configurable:true});
  try{
   d.documentElement.lang=language;initializeHumanLanguage(d);const title=translate(AGENT_TERMS_TITLE,language);
   assert.equal(d.querySelector('.agent-terms h1')!.textContent,title);
   const link=d.querySelector('header a[href="'+AGENT_TERMS_PATH+'"]')!;assert.equal(link.getAttribute('aria-label'),title);assert.equal(link.getAttribute('data-tooltip'),title);
   assert.equal(d.querySelector('footer .footer-main a[href="'+AGENT_TERMS_PATH+'"]')!.textContent,title);
   assert.doesNotMatch(d.querySelector('.footer-main')!.textContent!,/Hausregeln|House rules|Normas de convivencia|Règles de la communauté/);
  }finally{dom.window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');}
 }
});
