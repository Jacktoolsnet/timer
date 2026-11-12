import { test, expect } from '@playwright/test';
test.beforeEach(async ({page}) => {
 await page.route('**/*',route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
test('style scenes, palette, pause switch and BFCache restoration', async ({page}) => {
 const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/de/');
 const canvas=page.locator('#ambient-background');
 await expect(canvas).toBeVisible();
 await expect(canvas).toHaveAttribute('aria-hidden','true');
 expect(await canvas.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
 const scenes:string[]=[];
 for(const style of ['warm','minimal','technical','soft']){
  await page.evaluate(value=>{document.documentElement.dataset.style=value},style);
  await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(scenes.at(-1));
  scenes.push(await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL()));
 }
 expect(new Set(scenes).size).toBe(4);
 const previous=scenes.at(-1);
 await page.evaluate(()=>{document.documentElement.dataset.palette='blue';document.documentElement.dataset.theme='dark'});
 await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(previous);
 expect(await canvas.evaluate(el=>(el as HTMLCanvasElement).width*(el as HTMLCanvasElement).height)).toBeLessThanOrEqual(2200000);
 await page.getByLabel('Einstellungen',{exact:true}).click();
 const toggle=page.locator('#background-motion');
 await expect(toggle).toBeEnabled();
 await toggle.uncheck(); await expect(canvas).toBeHidden();
 await toggle.check(); await expect(canvas).toBeVisible();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 await page.evaluate(()=>{
  window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
  window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
 });
 await expect(canvas).toHaveAttribute('data-initialized','true');
 await expect(canvas).toBeVisible();
 expect(errors).toEqual([]);
});
test('system reduced motion and forced colours disable decoration',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'}); await page.goto('/de/');
 await expect(page.locator('#ambient-background')).toBeHidden();
 await expect(page.locator('#background-motion')).toBeDisabled();
 await expect(page.locator('#background-motion-status')).toContainText('reduzierte Bewegung');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await expect(page.locator('#ambient-background')).toBeVisible();
 await expect(page.locator('#background-motion')).toBeEnabled();
 await page.emulateMedia({forcedColors:'active'});
 await page.reload();
 await expect(page.locator('#ambient-background')).toBeHidden();
 await expect(page.locator('#background-motion')).toBeDisabled();
});
test('translated switch and unsupported canvas fallback',async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext});
 for(const [lang,label] of Object.entries({de:'Hintergrundanimation',en:'Background animation',es:'Animación de fondo',fr:'Animation de fond'})){
  await page.goto('/'+lang+'/');
  await page.locator('.preferences-trigger').click();
  await expect(page.getByRole('switch',{name:label,exact:true})).toBeDisabled();
  await expect(page.locator('#ambient-background')).toBeHidden();
 }
});
