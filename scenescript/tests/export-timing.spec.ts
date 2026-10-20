import {test,expect,type Page} from './helpers/editor-test';
async function setup(page:Page,lang='en'){
 await page.addInitScript(()=>{(window as any).exportTestNow=0;Object.defineProperty(performance,'now',{configurable:true,value:()=>(window as any).exportTestNow});});
 // Isolate timing/UI lifecycle from codecs; real MP4/WebM coverage lives in export.spec.ts.
 await page.route('**/src/scripts/video-export.ts*',route=>route.fulfill({contentType:'text/javascript',body:`
 export const exportSupported=async()=>true;
 export const exportVideo=async(p,o,signal,progress)=>{
  window.reportExportProgress=progress;
  return new Promise((resolve,reject)=>{
   window.finishTestExport=()=>{progress(1);resolve(new Blob(['timing UI fixture'],{type:'video/webm'}));};
   window.failTestExport=()=>reject(new Error('Test write failed'));
   signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true});
  });
 };
 export const exportVideoToFile=exportVideo;
 `}));
 await page.goto(`/${lang}/`);await page.locator('#open-export').click();await expect(page.locator('#export-settings')).toBeVisible();await expect(page.locator('#export-setup-hint')).toBeVisible();await expect(page.locator('#start-export')).toBeVisible();await expect(page.locator('#export-timing')).toBeHidden();await page.locator('#export-destination').selectOption('download');await page.locator('#start-export').click();await page.waitForFunction(()=>typeof (window as any).reportExportProgress==='function');await expect(page.locator('#export-settings')).toBeHidden();await expect(page.locator('#export-setup-hint')).toBeHidden();await expect(page.locator('#clear-export-files')).toBeHidden();await expect(page.locator('#start-export')).toBeHidden();await expect(page.locator('#cancel-export')).toBeFocused();
}
async function report(page:Page,at:number,progress:number){await page.evaluate(({at,progress})=>{(window as any).exportTestNow=at;(window as any).reportExportProgress(progress);},{at,progress});}
async function warmup(page:Page){for(let i=1;i<=10;i++)await report(page,i*1000,i*.01);}

test('elapsed time and ETA use measured throughput; saving does not claim zero remaining',async({page})=>{
 await setup(page);await expect(page.locator('#export-progress-label')).toHaveText('0 %');await expect(page.locator('#export-timing')).toBeVisible();await expect(page.locator('#export-elapsed')).toHaveText('00:00');await expect(page.locator('#export-remaining')).toHaveText('Calculating …');
 await warmup(page);await expect(page.locator('#export-elapsed')).toHaveText('00:10');await expect(page.locator('#export-remaining')).toHaveText('about 01:28');await expect(page.locator('#export-progress-label')).toHaveText('10.0 %');await expect(page.locator('#export-status')).toBeEmpty();await expect(page.locator('#export-status')).toBeHidden();
 await report(page,11000,.98);await expect(page.locator('#export-remaining')).toHaveText('Finalizing / saving …');await expect(page.locator('#export-status')).toBeEmpty();await expect(page.locator('#export-progress-label')).toHaveText('98.0 %');
 await page.evaluate(()=>(window as any).exportTestNow=12000);const download=page.waitForEvent('download');await page.evaluate(()=>(window as any).finishTestExport());await download;await expect(page.locator('#export-dialog')).not.toBeVisible();await expect(page.locator('#export-elapsed')).toHaveText('00:12');await expect(page.locator('#export-progress-label')).toHaveText('100.0 %');
 await page.locator('#open-export').click();await expect(page.locator('#export-timing')).toBeHidden();await expect(page.locator('#export-progress-row')).toBeHidden();await expect(page.locator('#export-settings')).toBeVisible();await expect(page.locator('#start-export')).toBeVisible();
});
test('no-progress intervals withdraw a stale estimate and resumed progress recalibrates',async({page})=>{
 await setup(page);await warmup(page);await page.evaluate(()=>(window as any).exportTestNow=21000);await expect(page.locator('#export-remaining')).toHaveText('Re-estimating …',{timeout:3000});await expect(page.locator('#export-elapsed')).toHaveText('00:21');
 await report(page,30000,.11);await expect(page.locator('#export-remaining')).toHaveText('Calculating …');for(let i=1;i<=5;i++)await report(page,30000+i*1000,.11+i*.01);await expect(page.locator('#export-remaining')).toContainText('about');await page.locator('#cancel-export').click();
});
for(const action of ['cancel','error'])test(`${action} freezes elapsed time, removes ETA and resets timing on retry`,async({page})=>{
 await setup(page);await warmup(page);if(action==='cancel')await page.locator('#cancel-export').click();else await page.evaluate(()=>(window as any).failTestExport());
 await expect(page.locator('#export-status')).toContainText(action==='cancel'?'Export cancelled':'Test write failed');await expect(page.locator('#export-settings')).toBeVisible();await expect(page.locator('#export-setup-hint')).toBeVisible();await expect(page.locator('#start-export')).toBeVisible();await expect(page.locator('#start-export')).toBeFocused();await expect(page.locator('#export-status')).toBeInViewport();await expect(page.locator('#export-remaining')).toHaveText('—');await expect(page.locator('#start-export')).toBeEnabled();await page.evaluate(()=>(window as any).exportTestNow=100000);await page.waitForTimeout(1100);await expect(page.locator('#export-elapsed')).toHaveText('00:10');
 await page.locator('#start-export').click();await expect(page.locator('#export-elapsed')).toHaveText('00:00');await expect(page.locator('#export-remaining')).toHaveText('Calculating …');await page.locator('#cancel-export').click();
});
test('timing labels are localized and do not overflow the export dialog',async({page})=>{
 for(const [lang,elapsed,remaining] of [['de','Vergangene Zeit','Geschätzte Restzeit'],['en','Elapsed time','Estimated time remaining'],['es','Tiempo transcurrido','Tiempo restante estimado'],['fr','Temps écoulé','Temps restant estimé']]){
  await setup(page,lang);await expect(page.locator('#export-timing dt').nth(0)).toHaveText(elapsed);await expect(page.locator('#export-timing dt').nth(1)).toHaveText(remaining);expect(await page.locator('#export-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);await page.locator('#cancel-export').click();await expect(page.locator('#start-export')).toBeEnabled();
 }
});


test('percentage label uses localized decimals, fits next to the bar and resets on retry',async({page})=>{
 await setup(page,'de');await report(page,1000,.427);await expect(page.locator('#export-progress-label')).toHaveText('42,7 %');await expect(page.locator('#export-progress')).toHaveJSProperty('value',.427);await expect(page.locator('#export-progress')).toHaveAttribute('aria-describedby','export-progress-label');
 const bar=(await page.locator('#export-progress').boundingBox())!,label=(await page.locator('#export-progress-label').boundingBox())!,row=(await page.locator('#export-progress-row').boundingBox())!;
 expect(label.x).toBeGreaterThanOrEqual(bar.x+bar.width);expect(label.x+label.width).toBeLessThanOrEqual(row.x+row.width+1);
 await page.locator('#cancel-export').click();await expect(page.locator('#start-export')).toBeEnabled();await expect(page.locator('#export-progress-label')).toHaveText('42,7 %');await page.locator('#start-export').click();await expect(page.locator('#export-progress-label')).toHaveText('0 %');await page.locator('#cancel-export').click();
});
