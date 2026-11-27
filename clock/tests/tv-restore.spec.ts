import {test,expect} from '@playwright/test';
import {receiverDisplay,receiverDisplayKey} from '../src/scripts/tv-receiver-storage';
const snapshot={version:1 as const,language:'de',displayScale:85,settings:{view:'orbit',analogReadout:'off',binaryReadout:'flip',orbitReadout:'flip',sundialReadout:'flip',analogDesign:'square-roman',background:'mountains',animateBackground:true,hemisphere:'north',transparency:35,date:'long',dateView:'calendarDate',format:'medium',hourCycle:'24',zone:'Europe/Berlin',seconds:true,numbers:true,smooth:true},appearance:{palette:'blue',style:'technical',theme:'dark',fontSize:'1'},senderName:'Private device',coordinates:{latitude:52.52,longitude:13.405}};

test('remembered display has a strict allowlist, no personal data and validated settings',()=>{
 const safe=receiverDisplay({...snapshot,token:'secret',settings:{...snapshot.settings,alarm:'secret',awake:true}})!;
 expect(safe).toBeDefined();expect(safe).not.toHaveProperty('coordinates');expect(safe).not.toHaveProperty('senderName');expect(safe).not.toHaveProperty('token');
 expect(safe.settings).not.toHaveProperty('awake');expect(safe.settings).not.toHaveProperty('alarm');
 for(const invalid of [null,[],{}, {...snapshot,version:2},{...snapshot,language:'xx'},{...snapshot,displayScale:300},{...snapshot,appearance:{...snapshot.appearance,palette:'evil'}},{...snapshot,settings:{...snapshot.settings,zone:'invalid/zone'}},{...snapshot,settings:{...snapshot.settings,view:'evil'}},{...snapshot,settings:{...snapshot.settings,seconds:'true'}}])expect(receiverDisplay(invalid)).toBeUndefined();
});

for(const view of ['analog','orbit','binaryFlip','sundial'])test('receiver restores latest '+view+' display after reopening; only explicit disconnect shows QR',async({page,context})=>{
 let active=false,revision=1,created=0,restoredRequests=0,phase='pairing';
 let current={...snapshot,settings:{...snapshot.settings,view}};
 await context.route('**/api/v1/tv/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(phase==='restoring'){restoredRequests++;return route.fulfill({status:503,json:{error:'offline'}});}
  if(path.endsWith('/receivers/')){created++;return route.fulfill({json:{id:'restore-'+created,receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:600}});}
  if(path.endsWith('/approve/')){active=true;return route.fulfill({status:204});}
  if(path.endsWith('/ack/'))return route.fulfill({status:204});
  return route.fulfill({json:{state:phase==='disconnected'?'waiting':active?'active':'pending',revision,acknowledged:revision,snapshot:current}});
 });
 await page.goto('/en/stream/');await expect(page.locator('#tv-approve')).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),receiverDisplayKey)).toBeNull();
 await page.locator('#tv-approve').click();await expect(page.locator('body')).toHaveClass(/tv-ready/);
 current={...current,displayScale:75,appearance:{...current.appearance,palette:'violet'}};revision++;
 await expect(page.locator('html')).toHaveAttribute('data-palette','violet');
 await expect(page.locator('.clock-display')).toHaveCSS('transform','matrix(0.75, 0, 0, 0.75, 0, 0)');
 const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),receiverDisplayKey);
 expect(stored.language).toBe('de');expect(stored.displayScale).toBe(75);expect(stored).not.toHaveProperty('coordinates');expect(stored).not.toHaveProperty('senderName');
 expect(JSON.stringify(stored)).not.toMatch(/receiverToken|pairToken|senderToken|latitude|longitude|Private device/);
 await page.close();phase='restoring';
 const reopened=await context.newPage();await reopened.goto('/stream/');
 await expect(reopened.locator('body')).toHaveClass(/tv-ready/);
 await expect(reopened.locator('.clock-display')).toHaveAttribute('data-view',view);
 await expect(reopened.locator('html')).toHaveAttribute('lang','de');await expect(reopened.locator('html')).toHaveAttribute('data-palette','violet');
 await expect(reopened.locator('.clock-card')).toHaveAttribute('data-background','mountains');
 await expect(reopened.locator('.clock-display')).toHaveCSS('transform','matrix(0.75, 0, 0, 0.75, 0, 0)');
 await expect(reopened.locator('#tv-code')).toBeHidden();await expect(reopened.locator('#tv-receiver-panel')).toBeHidden();
 if(view==='sundial')await expect(reopened.locator('#sundial-notice > #sundial-status')).toContainText('Standort in den Einstellungen freigeben');
 expect(created).toBe(1);expect(restoredRequests).toBe(0);
 phase='disconnected';await reopened.locator('#tv-stop').click();
 await expect(reopened.locator('#tv-code')).toHaveText('1234 5678');
 expect(await reopened.evaluate(key=>localStorage.getItem(key),receiverDisplayKey)).toBeNull();
 await reopened.reload();await expect(reopened.locator('#tv-qr')).toBeVisible();
 await expect(reopened.locator('body')).not.toHaveClass(/tv-ready/);expect(created).toBe(3);
});

for(const blocked of [true,false])test('receiver falls back to pairing when storage is '+(blocked?'blocked':'corrupt'),async({page})=>{
 await page.addInitScript(({blocked,key})=>{
  if(blocked)Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked');}});
  else localStorage.setItem(key,'{"version":1,"settings":{"zone":"evil"}}');
 },{blocked,key:receiverDisplayKey});
 let created=0;
 await page.route('**/api/v1/tv/**',route=>{
  if(new URL(route.request().url()).pathname.endsWith('/receivers/')){created++;return route.fulfill({json:{id:'test',receiverToken:'a'.repeat(64),pairToken:'b'.repeat(64),code:'12345678',pairSeconds:600}});}
  return route.fulfill({json:{state:'waiting',revision:0,acknowledged:0}});
 });
 await page.goto('/en/stream/');await expect(page.locator('#tv-code')).toHaveText('1234 5678');expect(created).toBe(1);
 if(!blocked)expect(await page.evaluate(key=>localStorage.getItem(key),receiverDisplayKey)).toBeNull();
});
