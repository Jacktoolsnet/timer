import {test,expect} from '@playwright/test';
import {demoProject,newElement} from '../src/lib/model';
test('particle exits are selectable, deterministic, reversible and survive import',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).particleJSON=text;}}}));
 await page.goto('/en/');const p=demoProject(),e=newElement('shape');p.scenes=p.scenes.slice(0,1);p.scenes[0].transition='none';p.scenes[0].elements=[e];Object.assign(e,{animation:'none',exitAnimation:'particles-dust',exitDuration:2});
 await page.locator('#open-json').click();await page.locator('#json-input').fill(JSON.stringify(p));await page.locator('#import-json').click();
 await page.locator('#element-list button').click();
 await expect(page.locator('#element-form [name=exitAnimation]')).toHaveValue('particles-dust');
 for(const kind of ['particles-dust','particles-sparks','particles-confetti']){
  await page.locator('#element-form [name=exitAnimation]').selectOption(kind);
  await page.locator('#timeline').fill('4');
  const overlay=page.locator('[data-particle-overlay]');await expect(overlay).toHaveCount(1);
  const tiles=overlay.locator(':scope > div');await expect(tiles).toHaveCount(48);
  const transforms=await tiles.evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.transform));
  await expect(page.locator('.scene-element[data-element-id]')).toHaveCSS('visibility','hidden');
  await page.locator('#timeline').fill('1');await expect(overlay).toHaveCount(0);
  await expect(page.locator('.scene-element[data-element-id]')).toHaveCSS('visibility','visible');
  await page.locator('#timeline').fill('4');expect(await tiles.evaluateAll(nodes=>nodes.map(n=>(n as HTMLElement).style.transform))).toEqual(transforms);
  await page.locator('#timeline').fill('5');await expect(overlay.locator(':scope > div')).toHaveCount(0);
 }
 await page.locator('#copy-project-json').click();
 const saved=await page.evaluate(()=>(window as any).particleJSON as string);
 expect(JSON.parse(saved).scenes[0].elements[0].exitAnimation).toBe('particles-confetti');
 await page.locator('#open-json').click();await page.locator('#json-input').fill(saved);page.on('dialog',d=>d.accept());await page.locator('#import-json').click();
 await page.locator('#element-list button').click();await expect(page.locator('#element-form [name=exitAnimation]')).toHaveValue('particles-confetti');
});

test('particle export renders real fragment colors and removes everything at the end',async({page})=>{
 await page.goto('/en/');const p=demoProject();p.scenes=p.scenes.slice(0,1);const s=p.scenes[0];s.duration=3;s.transition='none';s.background='#000000';
 const e=newElement('shape');Object.assign(e,{x:25,y:25,width:50,height:50,animation:'none',fillColor:'#00ff00',exitDuration:2});s.elements=[e];
 const results=await page.evaluate(async(p)=>{
  const {ExportMedia}=await import(/* @vite-ignore */ '/src/scripts/export-media.ts' as string),{ExportRenderer}=await import(/* @vite-ignore */ '/src/scripts/export-renderer.ts' as string);
  const results=[];
  for(const kind of ['particles-dust','particles-sparks','particles-confetti'] as const){
   p.scenes[0].elements[0].exitAnimation=kind;
   const media=new ExportMedia(p,new AbortController().signal),renderer=new ExportRenderer(p,media);
   try{const samples=[];
    for(const t of [0,2,3]){
     const canvas=await renderer.frame(t,480,270),data=canvas.getContext('2d')!.getImageData(0,0,480,270).data;
     let pixels=0;for(let i=0;i<data.length;i+=4)if(data[i+1]>20&&data[i]<10&&data[i+2]<10)pixels++;
     samples.push(pixels);
    }results.push(samples);
   }finally{renderer.dispose();media.dispose();}
  }return results;
 },p);
 for(const [start,middle,end] of results){expect(start).toBeGreaterThan(10000);expect(middle).toBeGreaterThan(100);expect(middle).toBeLessThan(start);expect(end).toBe(0);}
});
