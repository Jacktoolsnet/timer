import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import operator from '../src/lib/operator-legal-copy.json';
import agent from '../src/lib/agent-privacy-copy.json';
import visitor from '../src/lib/visitor-legal-copy.json';
import {operatorLegal} from '../../shared/operator-legal';
import {agentPrivacy} from '../../shared/agent-privacy';
import {VISITOR_PRIVACY_VERSION} from '../src/lib/visitor-legal-versions';
import {initializeHumanLanguage,translate} from '../src/lib/i18n';
import {buildOnboardingPrompt} from '../src/lib/onboarding';

test('both sources and task context remain disclosed for every audience, with exact prior editions archived',()=>{
 for(const [version,kind,current]of [
  ['2026-11-13-operator-terms-5','terms',operator.terms],['2026-11-13-operator-privacy-3','privacy',operator.privacy],['2026-11-13-agent-privacy-2','privacy',agent],['2026-11-13-visitor-privacy-draft-3','privacy',visitor.privacy],
 ] as const){
  const archive=JSON.parse(readFileSync(new URL('../../docs/legal-archive/'+version+'.json',import.meta.url),'utf8'));
  for(const lang of ['de','en'] as const){
   const old=archive[kind][lang];assert.deepEqual(current[lang].sections.slice(0,old.sections.length),old.sections);
   const all=JSON.stringify(current[lang]);assert.match(all,lang==='de'?/Quellen|Quellenlink/:/source/i);assert.match(all,lang==='de'?/Aufgabenkontext|konkrete Aufgabe/:/specific (?:other )?task/);
  }
 }
 assert.equal(operatorLegal.terms.version,'2026-11-13-operator-terms-6');assert.equal(operatorLegal.privacy.version,'2026-11-13-operator-privacy-4');
 assert.equal(agentPrivacy.version,'2026-11-13-agent-privacy-3');assert.equal(VISITOR_PRIVACY_VERSION,'2026-11-13-visitor-privacy-draft-4');
 assert.match(JSON.stringify(operator.terms.de),/frühere Zustimmungen oder Beiträge erhalten dadurch keine nachträglich erfundene Erlaubnis/);
 assert.match(JSON.stringify(operator.terms.en),/not silently expanded into a general reuse licence/);
});
test('operator notices are read-only and localized without adding fake permission toggles or changing approval controls',()=>{
 const html=readFileSync(new URL('../dist/operator/index.html',import.meta.url),'utf8');
 for(const language of ['en','de','es','fr'] as const){
  const dom=new JSDOM(html);const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
  try{
   const d=dom.window.document;d.documentElement.lang=language;initializeHumanLanguage(d);
   const notices=d.querySelectorAll<HTMLDetailsElement>('[data-agent-use-notice]');assert.equal(notices.length,2);
   for(const notice of notices){
    assert.equal(notice.open,false);assert.equal(notice.querySelector('input,textarea,select,button'),null);
    assert.match(notice.querySelector('summary')!.textContent!,new RegExp(translate('Sources and task context',language)));
    for(const link of notice.querySelectorAll<HTMLAnchorElement>('a')){assert.equal(link.target,'_blank');assert.ok(link.relList.contains('noopener'));}
   }
   assert.equal(d.querySelectorAll('#approve input[type=checkbox]').length,2);assert.equal(d.querySelectorAll('#approve input:checked').length,0);
   assert.equal(d.querySelector<HTMLTextAreaElement>('#approval-scope')!.value,'');
  }finally{dom.window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');}
 }
});
test('invitation explains separate runtime permission without overriding registration-only instructions',()=>{
 const prompt=buildOnboardingPrompt('http://localhost:4321','synthetic_owner');
 assert.match(prompt,/explicit runtime\/provider authorization/);assert.match(prompt,/publishing approval alone does not grant that permission/);
 assert.match(prompt,/External links and brief quotations require lawful use/);assert.match(prompt,/Stop there: do not confirm on my behalf, publish messages, or enable autonomous activity/);
});
