import {test,expect,type Page} from '@playwright/test';
import {bcdDigits} from '../src/scripts/binary-clock';
const labels={binary:'Binär',binaryDigital:'Binär + Digital',binaryFlip:'Binär + Klappzahlen'};
async function choose(page:Page,view:keyof typeof labels){await page.locator('#trigger-view').click();await page.getByRole('option',{name:labels[view],exact:true}).click();}
async function set(page:Page,name:string,value:string){await page.locator(`[name="${name}"]`).evaluate((el,value)=>{(el as HTMLSelectElement).value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},value);}
async function decoded(page:Page){return page.locator('[data-binary-column]').evaluateAll(columns=>columns.map(column=>[...column.querySelectorAll<SVGCircleElement>('[data-on=true]')].reduce((sum,dot)=>sum+Number(dot.dataset.bit),0)));}
test.beforeEach(async({page})=>{
 await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));
});
test('BCD converts each decimal time digit independently',()=>{
 const format=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});
 expect(bcdDigits(format.formatToParts(new Date('2026-11-24T14:25:36Z')))).toEqual([1,4,2,5,3,6]);
 expect(bcdDigits(format.formatToParts(new Date('2026-11-24T00:00:00Z')))).toEqual([0,0,0,0,0,0]);
});
test('all binary variants share time, seconds, weights and time-zone settings',async({page})=>{
 await page.clock.install({time:new Date('2026-11-24T14:25:36Z')});
 await page.clock.pauseAt(new Date('2026-11-24T14:25:36.001Z'));
 await page.goto('/de/');await set(page,'zone','UTC');await set(page,'hourCycle','24');
 for(const view of ['binary','binaryDigital','binaryFlip'] as const){
  await choose(page,view);
  await expect(page.locator('#binary-clock')).toBeVisible();
  await expect(page.locator('#analog-clock')).toBeHidden();await expect(page.locator('#orbit-clock')).toBeHidden();await expect(page.locator('#sundial-view')).toBeHidden();
  expect(await decoded(page)).toEqual([1,4,2,5,3,6]);
  await expect(page.locator('#binary-face')).toHaveAttribute('aria-label',/14:25:36/);
  if(view==='binaryDigital')await expect(page.locator('#binary-digital')).toBeVisible();else await expect(page.locator('#binary-digital')).toBeHidden();
  if(view==='binaryFlip')await expect(page.locator('#binary-flip .flip-digit')).toHaveCount(6);else await expect(page.locator('#binary-flip')).toBeHidden();
 }
 await page.locator('[name=seconds]').uncheck();await expect(page.locator('#binary-clock')).toHaveAttribute('data-seconds','false');
 await expect(page.locator('#binary-flip .flip-digit')).toHaveCount(4);
 await expect(page.locator('[data-binary-column="4"]')).toBeHidden();
 await page.locator('[name=numbers]').uncheck();await expect(page.locator('.binary-weights')).toBeHidden();
 await set(page,'zone','Asia/Tokyo');expect((await decoded(page)).slice(0,4)).toEqual([2,3,2,5]);
 await page.locator('[name=seconds]').check();
 await page.clock.setSystemTime(new Date('2026-11-24T14:25:37Z'));await page.clock.runFor(60);
 expect((await decoded(page)).slice(-2)).toEqual([3,7]);
 await set(page,'format','short');await expect(page.locator('#binary-clock')).toHaveAttribute('data-seconds','false');
 await set(page,'hourCycle','12');expect((await decoded(page)).slice(0,2)).toEqual([1,1]);
 await expect(page.locator('#binary-context')).not.toBeEmpty();
});
test('binary focus keeps clock left and calendar right on phones, stacks in portrait',async({page},info)=>{
 await page.goto('/de/');
 for(const size of [{width:568,height:320},{width:844,height:390},{width:390,height:844}]){
  await page.setViewportSize(size);
  for(const view of ['binary','binaryDigital','binaryFlip'] as const){
   await page.evaluate(()=>document.body.classList.remove('focus-view'));await choose(page,view);await page.evaluate(()=>document.body.classList.add('focus-view'));
   const binary=(await page.locator('#binary-clock').boundingBox())!,calendar=(await page.locator('.date-calendar').boundingBox())!;
   if(size.width>size.height)expect(binary.x+binary.width).toBeLessThan(calendar.x);else expect(binary.y+binary.height).toBeLessThan(calendar.y);
   for(const b of [binary,calendar]){expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y+b.height).toBeLessThanOrEqual(size.height+1);expect(b.x+b.width).toBeLessThanOrEqual(size.width+1);}
  }
 }
 await page.screenshot({path:`/tmp/binary-focus-${info.project.name}.png`});
});
test('binary choice is saved with consent and restores on reload',async({page})=>{
 await page.goto('/de/');await choose(page,'binaryFlip');
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();
 await page.reload();await expect(page.locator('.clock-display')).toHaveAttribute('data-view','binaryFlip');await expect(page.locator('#binary-flip')).toBeVisible();
});
for(const [lang,label] of [['en','Binary + Digital'],['es','Binario + Digital'],['fr','Binaire + Numérique']])test(`${lang} offers translated binary variants`,async({page})=>{
 await page.goto(`/${lang}/`);await page.locator('#trigger-view').click();await page.getByRole('option',{name:label,exact:true}).click();await expect(page.locator('#binary-digital')).toBeVisible();
});

test('flip companion animates minute changes when seconds are disabled',async({page})=>{
 await page.clock.install({time:new Date('2026-11-24T14:25:59Z')});
 await page.clock.pauseAt(new Date('2026-11-24T14:25:59.001Z'));
 await page.goto('/de/');await set(page,'zone','UTC');await choose(page,'binaryFlip');
 await page.locator('[name=seconds]').uncheck();
 await page.clock.runFor(1100);
 expect((await decoded(page)).slice(0,4)).toEqual([1,4,2,6]);
 await expect(page.locator('#binary-flip .flip-moving')).not.toHaveCount(0);
});
