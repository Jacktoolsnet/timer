import {test,expect} from '@playwright/test';
import type {TvSnapshot} from '../src/scripts/tv';

for(const initiallyShared of [true,false])test('stream location is opt-in, works without receiver geolocation, and can be revoked (initial: '+initiallyShared+')',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:51.500444,longitude:.000444});
 await page.clock.install({time:new Date('2026-06-21T12:00:00Z')});
 let snapshot:TvSnapshot|undefined,state='waiting',revision=0,acknowledged=0;
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await context.route('**/api/v1/tv/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/receivers/'))return route.fulfill({json:{id:'test',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:600}});
  if(path.endsWith('/claim/')){snapshot=route.request().postDataJSON().snapshot;state='pending';revision=1;return route.fulfill({json:{id:'test',senderToken:'c'.repeat(64),revision}});}
  if(path.endsWith('/approve/')){state='active';return route.fulfill({status:204});}
  if(path.endsWith('/settings/')){snapshot=route.request().postDataJSON().snapshot;revision++;return route.fulfill({json:{revision}});}
  if(path.endsWith('/ack/')){acknowledged=revision;return route.fulfill({status:204});}
  return route.fulfill({json:{state,revision,acknowledged,snapshot}});
 });
 await page.goto('/de/');
 await page.locator('[name=view]').selectOption('sundial',{force:true});
 await page.locator('[name=background]').selectOption('seasonal',{force:true});
 await page.locator('#tv-open').click();
 const share=page.locator('#tv-share-location');
 await expect(share).toHaveRole('switch');await expect(share).toHaveAccessibleName('Standort mitsenden');
 await expect(share).not.toBeChecked();await expect(share).toBeDisabled();
 await page.locator('#tv-close').click();
 await page.locator('#seasonal-location').check();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await page.locator('#tv-open').click();await expect(share).toBeEnabled();
 await expect(page.locator('#tv-share-location-hint')).toHaveText('Für die standortbasierte Sonnenuhr und Jahressimulation auf dem Empfangsgerät benötigt.');
 if(initiallyShared)await share.check();
 const receiver=await context.newPage();
 receiver.on('pageerror',error=>errors.push(error.message));
 await receiver.clock.install({time:new Date('2026-06-21T12:00:00Z')});
 await receiver.addInitScript(()=>{
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){throw Error('Receiver must not request location');},watchPosition(){throw Error('Receiver must not watch location');},clearWatch(){}}});
 });
 await receiver.goto('/de/stream/');await expect(receiver.locator('#tv-code')).toHaveText('1234 5678');
 await page.locator('#tv-pair-code').fill('12345678');
 await expect(receiver.locator('#tv-approve')).toBeVisible();
 expect(snapshot?.coordinates).toEqual(initiallyShared?{latitude:51.5,longitude:0}:undefined);
 await expect(receiver.frameLocator('#tv-preview').locator('#sundial-view')).toHaveAttribute('data-location-state',initiallyShared?'ready':'missing');
 await receiver.locator('#tv-approve').click();
 await expect(receiver.locator('#sundial-view')).toHaveAttribute('data-location-state',initiallyShared?'ready':'missing');
 await expect(receiver.locator('#sundial-enable-location')).toBeHidden();
 const missingHint=receiver.locator('#sundial-notice > #sundial-status');
 if(!initiallyShared){
  await expect(missingHint).toBeVisible();
  await expect(missingHint).toHaveText('Bitte am Sender den Standort in den Einstellungen freigeben und „Standort mitsenden“ aktivieren.');
  const fits=await missingHint.evaluate(el=>el.scrollHeight<=el.clientHeight&&el.getBoundingClientRect().bottom<=document.getElementById('sundial-notice-area')!.getBoundingClientRect().bottom+1);
  expect(fits).toBe(true);
 }

 await expect(page.locator('#tv-dialog')).toBeVisible();
 if(!initiallyShared)await share.check();
 await expect(receiver.locator('#sundial-shadow')).toHaveAttribute('visibility','visible',{timeout:15000});
 await expect(missingHint).toHaveCount(0);
 await expect(receiver.locator('#sundial-coordinates #sundial-status')).toBeVisible();
 await expect(receiver.locator('#seasonal-background')).toHaveAttribute('data-location-based','true');
 // Position updates are propagated only while explicit sharing remains enabled.
 await context.setGeolocation({latitude:-33.9249,longitude:18.4241});
 await expect.poll(()=>snapshot?.coordinates?.latitude,{timeout:15000}).toBe(-33.925);
 await expect(receiver.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await share.uncheck();
 await expect.poll(()=>snapshot?.coordinates,{timeout:15000}).toBeUndefined();
 await expect(receiver.locator('#sundial-view')).toHaveAttribute('data-location-state','missing');
 await expect(receiver.locator('#sundial-shadow')).toHaveAttribute('visibility','hidden');
 await expect(missingHint).toBeVisible();
 await expect(missingHint).toContainText('Standort in den Einstellungen freigeben');
 await expect(receiver.locator('#seasonal-background')).toHaveAttribute('data-location-based','false');
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toMatch(/latitude|longitude|51\.5|33\.925/);
 expect(await receiver.evaluate(()=>JSON.stringify(localStorage))).not.toMatch(/latitude|longitude|51\.5|33\.925/);
 expect(errors).toEqual([]);
});

test('English receiver adopts sender language for preview, sundial, date and stream controls without re-pairing',async({page})=>{
 await page.clock.install({time:new Date('2026-06-21T12:00:00Z')});
 let active=false,revision=1,coordinates:{latitude:number;longitude:number}|undefined;
 let language='de',created=0;
 const settings={view:'sundial',analogReadout:'off',binaryReadout:'off',orbitReadout:'off',sundialReadout:'flip',analogDesign:'standard',background:'mountains',animateBackground:false,hemisphere:'north',transparency:35,date:'long',dateView:'calendarDate',format:'medium',hourCycle:'24',zone:'Europe/Berlin',seconds:true,numbers:true,smooth:true};
 await page.route('**/api/v1/tv/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/receivers/')){created++;return route.fulfill({json:{id:'language',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:600}});}
  if(path.endsWith('/approve/')){active=true;return route.fulfill({status:204});}
  if(path.endsWith('/ack/'))return route.fulfill({status:204});
  return route.fulfill({json:{state:active?'active':'pending',revision,acknowledged:revision,snapshot:{version:1,language,coordinates,settings,appearance:{palette:'green',style:'technical',theme:'light',fontSize:'0'}}}});
 });
 await page.goto('/en/stream/');
 await expect(page.locator('#tv-approve')).toHaveText('Verbindung erlauben');
 const preview=page.frameLocator('#tv-preview');
 await expect(preview.locator('#sundial-status')).toContainText('Standort in den Einstellungen freigeben');
 await page.locator('#tv-approve').click();
 await expect(page.locator('body')).toHaveClass(/tv-ready/);
 await expect(page.locator('#sundial-status')).toContainText('Standort in den Einstellungen freigeben');
 coordinates={latitude:52.52,longitude:13.405};revision++;
 for(const [lang,solar,month,stop,sunrise] of [
  ['de','Wahre Sonnenzeit','Juni','Stream beenden','Sonnenaufgang'],
  ['fr','Heure solaire vraie','juin','Arrêter la diffusion','Lever du soleil'],
  ['es','Hora solar verdadera','junio','Finalizar transmisión','Amanecer'],
  ['en','Apparent solar time','June','End stream','Sunrise']
 ]){
  language=lang;revision++;
  await expect(page.locator('#sundial-time')).toContainText(solar,{timeout:10000});
  await expect(page.locator('html')).toHaveAttribute('lang',lang);
  await expect(page.locator('.date-month')).toHaveText(new RegExp(month,'i'));
  await expect(page.locator('#tv-stop')).toHaveAttribute('aria-label',stop);
  await expect(page.locator('#sundial-sunrise-label')).toHaveAttribute('aria-label',new RegExp(sunrise));
 }
 language='de';coordinates=undefined;revision++;
 await expect(page.locator('#sundial-notice > #sundial-status')).toContainText('Standort in den Einstellungen freigeben');
 coordinates={latitude:52.52,longitude:13.405};revision++;
 await page.clock.setSystemTime(new Date('2026-06-21T00:00:00Z'));
 await expect(page.locator('#sundial-night-hint')).toHaveText('Sonne unter dem Horizont – kein Sonnenschatten.');
 expect(created).toBe(1);expect(new URL(page.url()).pathname).toBe('/en/stream/');
});
