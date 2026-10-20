import {test,expect} from './helpers/editor-test';
import {aiGuide,aiGuideExamples,aiCameraExample} from '../src/lib/guide';
import {parseProject} from '../src/lib/model';

test('one offline-ready copy includes notation, all field types and complete examples',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copiedGuide=text;}}}));
 await page.goto('/de/ai/');await expect(page.locator('.legal-page>p').filter({hasText:'offline'})).toBeVisible();await page.locator('#copy-guide').click();
 const copied=await page.evaluate(()=>(window as any).copiedGuide as string);expect(copied).toBe(aiGuide);expect(copied.length).toBeLessThan(82000);
 expect(copied).toContain('Identify the target audience FIRST');expect(copied).toContain('proposed YOUTUBE DESCRIPTION');expect(copied).toContain('MUST have a suitable cover in Project.thumbnail');
 for(const p of aiGuideExamples){expect(copied).toContain(JSON.stringify(p,null,2));expect(parseProject(JSON.stringify(p)).scenes).toHaveLength(1);}
 expect(copied).toContain('required field');expect(copied).toContain('inherit the containing element');expect(copied).toContain('not a JSON discriminator');expect(copied).not.toContain('Fetch and import');
 // Clipboard unavailable: the fallback selects exactly the same complete guide.
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('unavailable');}}}));await page.locator('#copy-guide').click();expect(await page.evaluate(()=>window.getSelection()?.toString())).toBe(aiGuide);
});

test('a newcomer can paste each compact example and render the documented comic reading route',async({page})=>{
 page.on('dialog',d=>d.accept());await page.goto('/en/');
 for(const p of aiGuideExamples){await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();await expect(page.locator('#json-dialog')).not.toBeVisible();await expect(page.locator('#project-title')).toHaveValue(p.title);await page.locator('#timeline').fill('1');}
 const result=await page.evaluate(async(p)=>{const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);try{const colors=[];for(const t of [0,4,5,8,9,11]){const c:HTMLCanvasElement=await renderer.frame(t,480,270);colors.push(Array.from(c.getContext('2d')!.getImageData(40,80,1,1).data.slice(0,3)));}return colors;}finally{renderer.dispose();media.dispose();}},parseProject(JSON.stringify(aiCameraExample)));
 // Pauses hold the same view; the route visits distinct colored panels, then returns.
 expect(result[1]).toEqual(result[2]);expect(result[3]).toEqual(result[4]);expect(result[1]).not.toEqual(result[3]);expect(result[0]).toEqual(result[5]);
});
