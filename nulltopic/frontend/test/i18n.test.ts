import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {browserLanguage,currentLocale,initializeHumanLanguage,initializeLanguagePicker,LANGUAGE_KEY,languages,t,translate} from '../src/lib/i18n';
import {renderPost} from '../src/scripts/client';
import {renderAgentProfile} from '../src/scripts/agents';
import {setFeedStatus} from '../src/scripts/feed-status';
import {openReportDialog} from '../src/scripts/report-dialog';
import {initializeReviewDecisionPicker} from '../src/scripts/review-decision-picker';

const bootstrap=readFileSync(new URL('../src/scripts/appearance-init.js',import.meta.url),'utf8');
const page=(name='index')=>readFileSync(new URL(`../dist/${name}.html`,import.meta.url),'utf8');
function fixture(html=page(),url='http://localhost:4321/'){
 const dom=new JSDOM(html,{url,runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w,'matchMedia',{value:()=>({matches:false})});
 const originals=new Map<string,PropertyDescriptor|undefined>();
 for(const [key,value] of Object.entries({document:w.document,window:w,localStorage:w.localStorage})){
  originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value});
 }
 return {dom,w,close(){dom.window.close();for(const [key,value] of originals){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}}};
}

test('language negotiation: supported browser variants, saved opt-in, explicit choice and safe fallback',()=>{
 assert.equal(browserLanguage(['it-IT','fr-CA','de-DE']),'fr');assert.equal(browserLanguage(['xx']),'en');
 for(const language of languages){const f=fixture();try{
  Object.defineProperty(f.w.navigator,'languages',{value:[language+'-XX']});f.w.eval(bootstrap);assert.equal(f.w.document.documentElement.lang,language);
 }finally{f.close();}}
 const f=fixture();try{
  Object.defineProperty(f.w.navigator,'languages',{value:['de-AT']});
  f.w.localStorage.setItem(LANGUAGE_KEY,'fr');f.w.eval(bootstrap);assert.equal(f.w.document.documentElement.lang,'de','saved choice without consent is ignored');
  f.w.localStorage.setItem('nulltopic.storage-consent.v1','yes');f.w.eval(bootstrap);assert.equal(f.w.document.documentElement.lang,'fr');
  f.w.history.replaceState(null,'','/?lang=es');f.w.eval(bootstrap);assert.equal(f.w.document.documentElement.lang,'es','explicit picker URL overrides prior choice');
  f.w.history.replaceState(null,'','/?lang=not-a-language');f.w.localStorage.setItem(LANGUAGE_KEY,'<script>');f.w.eval(bootstrap);assert.equal(f.w.document.documentElement.lang,'de');
  Object.defineProperty(f.w,'localStorage',{get(){throw Error('blocked');}});f.w.eval(bootstrap);assert.equal(f.w.document.documentElement.lang,'de');
 }finally{f.close();}
});

test('all four languages localize static human UI on every page, without changing machine prompts or URLs',()=>{
 const headings={en:'Settings',de:'Einstellungen',es:'Ajustes',fr:'Réglages'};
 for(const language of languages)for(const name of ['index','agents/index','rules/index','operator/index','operator-access/index','operator-recovery/index','notifications/index','impressum/index','administration/index','conversation/index','conversations/index']){
  const f=fixture(page(name));try{
   const doc=f.w.document;doc.documentElement.lang=language;
   const prompt=doc.querySelector<HTMLTextAreaElement>('[data-prompt-text]')?.value;
   const permission=doc.querySelector('[data-permission-request]')?.textContent;
   const originalUrls=[...doc.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'));
   initializeHumanLanguage(doc);
   assert.equal(doc.querySelector('.preferences-heading h2')!.textContent,headings[language]);
   assert.equal(doc.querySelector('.preferences-trigger')!.getAttribute('aria-label'),headings[language]);
   assert.equal(doc.querySelector<HTMLTextAreaElement>('[data-prompt-text]')?.value,prompt);
   assert.equal(doc.querySelector('[data-permission-request]')?.textContent,permission);
   assert.deepEqual([...doc.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),originalUrls);
   // No second pass is allowed after API-owned content arrives.
   const publicText=doc.createElement('p');publicText.textContent='Settings';doc.body.append(publicText);initializeHumanLanguage(doc);assert.equal(publicText.textContent,'Settings');
  }finally{f.close();}
 }
});

test('language selection retains thread/filter/anchor and persists only with remember-settings opt-in',()=>{
 const f=fixture(page(),'http://localhost:4321/conversation?id=fixture&post=reply#post-selected');try{
  const doc=f.w.document;doc.documentElement.lang='de';doc.documentElement.dataset.languageChoice='explicit';let target='';
  initializeLanguagePicker(url=>{target=url;});
  const link=doc.querySelector<HTMLAnchorElement>('[data-language-choice=fr]')!;link.click();
  assert.equal(f.w.localStorage.getItem(LANGUAGE_KEY),null);let url=new URL(target);assert.equal(url.searchParams.get('lang'),'fr');assert.equal(url.searchParams.get('id'),'fixture');assert.equal(url.searchParams.get('post'),'reply');assert.equal(url.hash,'#post-selected');
  f.w.localStorage.setItem('nulltopic.storage-consent.v1','yes');link.click();assert.equal(f.w.localStorage.getItem(LANGUAGE_KEY),'fr');
  const remember=doc.querySelector<HTMLInputElement>('#appearance-remember')!;remember.checked=false;remember.dispatchEvent(new f.w.Event('change'));assert.equal(f.w.localStorage.getItem(LANGUAGE_KEY),null);
  remember.checked=true;remember.dispatchEvent(new f.w.Event('change'));assert.equal(f.w.localStorage.getItem(LANGUAGE_KEY),'de');
  assert.equal(doc.querySelector('[data-language-choice=de]')!.getAttribute('aria-current'),'page');
 }finally{f.close();}
});

test('dynamic UI translates labels and dates, never agent names, message bodies, profile data or metadata',()=>{
 for(const language of ['de','es','fr'] as const){const f=fixture();try{
  const doc=f.w.document;doc.documentElement.lang=language;
  const raw='Settings';const post=renderPost({id:'post',conversation_id:'thread',parent_id:null,agent_id:'agent',name:raw,handle:'Report',body:raw,state:'visible',technical:{model:raw},created_at:'2026-11-05T10:00:00Z'});
  assert.equal(post.querySelector('.body')!.textContent,raw);assert.equal(post.querySelector('.profile-author-link')!.textContent,raw);
  assert.equal(post.querySelector('button.post-action')!.getAttribute('aria-label'),translate('Report',language));
  assert.equal(post.querySelector('time')!.title,new Intl.DateTimeFormat(currentLocale(),{dateStyle:'full',timeStyle:'long'}).format(new Date('2026-11-05T10:00:00Z')));
  const profile=renderAgentProfile({id:'a',name:raw,handle:'Close',about:raw,interests:[raw],operating_context:raw,approved_scope:raw,operator_id:'o',status:'active',created_at:'2026-11-05',technical:{model:raw}},null);
  assert.equal(profile.querySelector('.agent-profile-about')!.textContent,raw);assert.equal(profile.querySelector('.agent-profile-interests li')!.textContent,raw);assert.equal(profile.querySelector('.agent-profile-state')!.textContent,translate('Active',language));assert.ok([...profile.querySelectorAll('dd')].some(node=>node.textContent===raw));
  const live=doc.createElement('span');setFeedStatus(live,'connecting');assert.equal(live.textContent,translate('Connecting…',language));assert.equal(live.dataset.state,'connecting');
  assert.equal(t('View profile of {name}',{name:'{name}<script>'}),translate('View profile of {name}',language).replace('{name}','{name}<script>'));
 }finally{f.close();}}
});

test('report dialogs and review options translate trusted templates before adding supplied content',()=>{
 const f=fixture(page('administration/index'));try{
  const doc=f.w.document;doc.documentElement.lang='fr';
  f.w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  f.w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  openReportDialog(doc.createElement('button'),async()=>{}, {title:'USER TITLE',description:'USER DESCRIPTION',context:'Settings'});
  const report=doc.querySelector('#report-dialog')!;assert.equal(report.querySelector('#report-title')!.textContent,'USER TITLE');assert.equal(report.querySelector('.moderation-message-preview')!.textContent,'Settings');assert.equal(report.querySelector('label')!.textContent,translate('Reason for reporting','fr'));
  const select=doc.querySelector<HTMLSelectElement>('#review-outcome')!,reason=doc.querySelector<HTMLTextAreaElement>('#review-response')!;
  const sync=initializeReviewDecisionPicker(select,reason);sync('hide');select.value='accepted_restore';select.dispatchEvent(new f.w.Event('change'));
  assert.equal(doc.querySelector('#review-choice-value')!.textContent,translate('Accept review and restore message','fr'));assert.equal(select.value,'accepted_restore');
  assert.ok(doc.querySelector('#review-decision-options')!.textContent!.includes(translate('Reject review','fr')));
  assert.equal(reason.value,'','translation must not silently insert or submit a response');
  reason.value='Settings';sync('hide');assert.equal(reason.value,'Settings','typed responses remain in their original language');
  const preset=doc.querySelector<HTMLButtonElement>('#review-response-presets button')!;preset.click();assert.equal(reason.value,preset.textContent);assert.ok(reason.value.startsWith('Nous acceptons'));
 }finally{f.close();}
});

test('all language dictionaries have complete, nonempty matching keys and preserve placeholders',()=>{
 assert.equal(translate('constructor','de'),'constructor');
 const dictionaries=['de','es','fr'].map(lang=>JSON.parse(readFileSync(new URL(`../src/lib/locales/${lang}.json`,import.meta.url),'utf8')) as Record<string,string>);
 for(const dict of dictionaries){assert.deepEqual(Object.keys(dict),Object.keys(dictionaries[0]));for(const [source,value] of Object.entries(dict)){assert.ok(value.trim());assert.deepEqual(value.match(/\{\w+\}/g)?.sort(),source.match(/\{\w+\}/g)?.sort(),source);}}
});


test('appearance and language labels match the local Company dictionaries in all four languages',async()=>{
 const {getDictionary}=await import('../../../company/src/lib/i18n');
 const fields=['menuSettings','appearance','lightMode','darkMode','language','fontSize','styleLabel','warm','minimal','technical','soft','colorScheme','terracotta','blue','green','orange','red','violet','teal','rose','rememberPreferences','close','storageError'] as const;
 const english=getDictionary('en');for(const language of languages){const company=getDictionary(language);for(const field of fields)assert.equal(translate(english[field],language),company[field]);}
});

test('trusted static human copy is covered by the catalogs, including accessible labels and descriptions',()=>{
 const dict=JSON.parse(readFileSync(new URL('../src/lib/locales/de.json',import.meta.url),'utf8'));
 const exempt=new Set(['null','topic','null.topic','jacktools.net','agent-guide.md']);
 for(const name of ['index','agents/index','rules/index','operator/index','operator-access/index','operator-recovery/index','notifications/index','impressum/index','administration/index','conversation/index','conversations/index','guide/index','moderation/index']){
  const dom=new JSDOM(page(name)),doc=dom.window.document;
  try{
   const walker=doc.createTreeWalker(doc.body,4);
   while(walker.nextNode()){
    const node=walker.currentNode;if(node.parentElement!.closest('script,style,svg,code,pre,textarea,[data-permission-request],[translate=no]'))continue;
    const value=node.textContent!.trim().replace(/\s+/g,' ');if(!/[a-zA-Z]/.test(value)||exempt.has(value))continue;
    assert.ok(Object.hasOwn(dict,value),`${name}: ${value}`);
   }
   for(const element of doc.querySelectorAll('*')){
    if(element.closest('script,style,svg,[translate=no]'))continue;
    for(const key of ['aria-label','title','placeholder','data-tooltip']){
     const value=element.getAttribute(key);if(value)assert.ok(Object.hasOwn(dict,value),`${name}: ${key}=${value}`);
    }
   }
   const description=doc.querySelector('meta[name=description]')?.getAttribute('content');if(description)assert.ok(Object.hasOwn(dict,description),`${name}: description=${description}`);
  }finally{dom.window.close();}
 }
});
