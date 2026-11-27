import {test,expect} from '@playwright/test';
import type {TvSnapshot} from '../src/scripts/tv';

test('stream dialog stays open, scales only receiver foreground live, remembers size and can end the stream',async({page,context})=>{
 await page.addInitScript(()=>localStorage.setItem('jacktools.clock.storage-consent.v1','yes'));
 let snapshot:TvSnapshot|undefined,state='waiting',revision=0,ended=0;
 await context.route('**/api/v1/tv/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/receivers/')){state='waiting';return route.fulfill({json:{id:'test',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:600}});}
  if(path.endsWith('/claim/')){snapshot=route.request().postDataJSON().snapshot;state='pending';revision=1;return route.fulfill({json:{id:'test',senderToken:'c'.repeat(64),revision}});}
  if(path.endsWith('/approve/')){state='active';return route.fulfill({status:204});}
  if(path.endsWith('/settings/')){snapshot=route.request().postDataJSON().snapshot;revision++;return route.fulfill({json:{revision}});}
  if(path.endsWith('/end/')){ended++;state='detached';snapshot=undefined;return route.fulfill({status:204});}
  if(path.endsWith('/stop/'))return route.fulfill({status:204});
  if(path.endsWith('/ack/'))return route.fulfill({status:204});
  return route.fulfill({json:{state,revision,acknowledged:revision,snapshot}});
 });
 await page.goto('/de/');
 await page.locator('[name=background]').selectOption('mountains',{force:true});
 await page.locator('#tv-open').click();await expect(page.locator('#tv-size-controls')).toBeHidden();
 const receiver=await context.newPage();await receiver.setViewportSize({width:1280,height:720});
 await receiver.goto('/de/stream/');await expect(receiver.locator('#tv-code')).toHaveText('1234 5678');
 await page.locator('#tv-pair-code').fill('12345678');
 await expect(page.locator('#tv-dialog')).toBeVisible();await expect(page.locator('#tv-display-size')).toBeFocused();
 await expect(page.locator('#tv-pair-hint')).toBeHidden();await expect(page.locator('#tv-pair-form')).toBeHidden();
 expect(snapshot?.displayScale).toBe(100);
 await receiver.locator('#tv-approve').click();await expect(receiver.locator('body')).toHaveClass(/tv-ready/);
 const foreground=receiver.locator('.clock-display'),card=receiver.locator('.clock-card');
 const initial=(await foreground.boundingBox())!;
 await page.locator('#tv-display-size').fill('80');
 await expect(page.locator('#tv-display-size-value')).toHaveText('80 %');
 await expect.poll(()=>snapshot?.displayScale).toBe(80);
 await expect(foreground).toHaveCSS('transform','matrix(0.8, 0, 0, 0.8, 0, 0)',{timeout:15000});
 const smaller=(await foreground.boundingBox())!,backdrop=(await card.boundingBox())!;
 expect(smaller.width/initial.width).toBeCloseTo(.8,2);expect(smaller.height/initial.height).toBeCloseTo(.8,2);
 expect(smaller.x+smaller.width/2).toBeCloseTo(initial.x+initial.width/2,1);
 expect(smaller.y+smaller.height/2).toBeCloseTo(initial.y+initial.height/2,1);
 expect(backdrop.width).toBe(1280);expect(backdrop.height).toBe(720);
 await expect(card).toHaveCSS('transform','none');
 await page.screenshot({path:'/tmp/jt-stream-size-dialog-'+test.info().project.name+'.png'});
 await receiver.screenshot({path:'/tmp/jt-stream-size-receiver-'+test.info().project.name+'.png'});
 // Sender stays untouched; changing settings/closing the dialog does not reset sizing.
 await expect(page.locator('.clock-display')).toHaveCSS('transform','none');
 await page.locator('#tv-close').click();await page.locator('[name=view]').selectOption('orbit',{force:true});
 await expect(receiver.locator('.clock-display')).toHaveAttribute('data-view','orbit',{timeout:15000});
 await expect(foreground).toHaveCSS('transform','matrix(0.8, 0, 0, 0.8, 0, 0)');
 await page.locator('#tv-open').click();await expect(page.locator('#tv-display-size')).toHaveValue('80');
 await page.locator('#tv-detach').click();await expect.poll(()=>ended).toBe(1);
 await expect(receiver.locator('#tv-code')).toBeVisible({timeout:15000});await expect(receiver.locator('body')).not.toHaveClass(/tv-ready/);
 await expect(page.locator('#tv-pair-form')).toBeVisible();
 await page.reload();await page.locator('#tv-open').click();await expect(page.locator('#tv-display-size')).toHaveValue('80');
 expect(await page.evaluate(()=>localStorage.getItem('jacktools-clock-stream-size'))).toBe('80');
});

test('size preference respects storage consent and invalid stored sizes fall back safely',async({page})=>{
 await page.route('**/api/v1/tv/**',route=>route.fulfill({json:route.request().url().endsWith('/claim/')?{id:'test',senderToken:'a'.repeat(64),revision:1}:{state:'active',revision:1,acknowledged:1}}));
 await page.goto('/en/');await page.locator('#tv-open').click();await page.locator('#tv-pair-code').fill('12345678');
 await page.locator('#tv-display-size').fill('60');
 expect(await page.evaluate(()=>localStorage.getItem('jacktools-clock-stream-size'))).toBeNull();
 await page.reload();await page.locator('#tv-open').click();await expect(page.locator('#tv-display-size')).toHaveValue('100');
 await page.evaluate(()=>{localStorage.setItem('jacktools.clock.storage-consent.v1','yes');localStorage.setItem('jacktools-clock-stream-size','999');});
 await page.reload();await page.locator('#tv-open').click();await expect(page.locator('#tv-display-size')).toHaveValue('100');
});
