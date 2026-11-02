import {test,expect,type Page} from '@playwright/test';
import {padBounds,focusedPadAt,focusedPadCenter,type OrbitPad} from '../src/lib/orbit-layout';
async function clickPad(page:Page,lane:number){
 await page.locator('#drawing').scrollIntoViewIfNeeded();
 const zone=(await page.locator('#rhythm-zones>[data-lane="'+lane+'"]').boundingBox())!,canvas=(await page.locator('#drawing').boundingBox())!;
 await page.locator('#drawing').click({position:{x:zone.x+zone.width/2-canvas.x,y:zone.y+zone.height/2-canvas.y}});
}
test('focused geometry has one central editable surface and two neighbours on every side',()=>{
 for(let selected=0;selected<9;selected++){
  const bounds=Array.from({length:9},(_,i)=>padBounds(i as OrbitPad,700,440,selected as OrbitPad));
  expect(bounds[selected]).toEqual({x:140,y:88,width:420,height:264});
  expect(bounds.filter(b=>b.y===0)).toHaveLength(2);
  expect(bounds.filter(b=>b.x===574)).toHaveLength(2);
  expect(bounds.filter(b=>Math.abs(b.y-360.8)<.001)).toHaveLength(2);
  expect(bounds.filter(b=>b.x===0)).toHaveLength(2);
  for(let i=0;i<9;i++){
   const p=focusedPadCenter(i as OrbitPad,700,440,selected as OrbitPad);
   expect(focusedPadAt(p.x,p.y,700,440,selected as OrbitPad)).toBe(i);
  }
  expect(focusedPadAt(135,84,700,440,selected as OrbitPad)).toBeNull();
 }
});
test('entering Rhythm keeps normal mix; selecting enlarges one pad without recording a note',async({page})=>{
 await page.goto('/de/');await page.locator('#play').click();
 await page.locator('[data-pad-mode=rhythm]').click();
 const drawing=page.locator('#drawing');
 await expect(drawing).toHaveAttribute('data-selected-pad','');
 await expect(drawing).toHaveAttribute('data-music-level','1');
 await expect(page.locator('#rhythm-done')).toBeDisabled();
 await expect(page.locator('#rhythm-record')).toBeDisabled();
 await clickPad(page,0);
 await expect(drawing).toHaveAttribute('data-selected-pad','0');
 await expect(drawing).toHaveAttribute('data-rhythm-hits','0');
 await expect(drawing).toHaveAttribute('data-music-level','0.1');
 await expect(drawing).toHaveAttribute('data-lane-levels','1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1');
 await page.waitForTimeout(350);
 const big=(await page.locator('#rhythm-zones>[data-lane="0"]').boundingBox())!,box=(await drawing.boundingBox())!;
 expect(big.width/box.width).toBeCloseTo(.6,2);expect(big.height/box.height).toBeCloseTo(.6,2);
 // A click on a different preview before any editing switches selection, without any hit.
 await clickPad(page,8);await expect(drawing).toHaveAttribute('data-selected-pad','8');
 await expect(drawing).toHaveAttribute('data-rhythm-hits','0');
 await page.locator('#rhythm-cancel').click();
 await expect(drawing).toHaveAttribute('data-selected-pad','');
 await expect(drawing).toHaveAttribute('data-music-level','1');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
});
test('central overdubs can be accepted or discarded independently and never overwrite other orbits',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 const drawing=page.locator('#drawing');
 await page.keyboard.press('Numpad7');await expect(drawing).toHaveAttribute('data-rhythm-hits','0');
 await page.keyboard.press('Numpad7');await expect(drawing).toHaveAttribute('data-rhythm-hits','1');
 await page.keyboard.press('Numpad9');await expect(drawing).toHaveAttribute('data-selected-pad','0');
 await expect(page.locator('#rhythm-status')).toContainText('übernehmen');
 await page.locator('#rhythm-done').click();
 const accepted=JSON.parse((await drawing.getAttribute('data-rhythm-pattern'))!);
 await expect(drawing).toHaveAttribute('data-selected-pad','');await expect(drawing).toHaveAttribute('data-music-level','1');
 await page.keyboard.press('Numpad9');await page.keyboard.press('Numpad9');
 await expect(drawing).toHaveAttribute('data-rhythm-hits','2');
 await page.locator('#rhythm-cancel').click();
 expect(JSON.parse((await drawing.getAttribute('data-rhythm-pattern'))!)).toEqual(accepted);
 await page.keyboard.press('Numpad9');await page.keyboard.press('Numpad9');await page.locator('#rhythm-done').click();
 const both=JSON.parse((await drawing.getAttribute('data-rhythm-pattern'))!);
 expect(both[0]).toEqual(accepted[0]);expect(both[2].some(Boolean)).toBe(true);
 // Clearing the selected second pattern is a reversible local draft.
 await page.keyboard.press('Numpad9');await page.locator('#rhythm-clear').click();
 const cleared=JSON.parse((await drawing.getAttribute('data-rhythm-pattern'))!);
 expect(cleared[0]).toEqual(both[0]);expect(cleared[2].some(Boolean)).toBe(false);
 await page.locator('#rhythm-cancel').click();
 expect(JSON.parse((await drawing.getAttribute('data-rhythm-pattern'))!)).toEqual(both);
});
test('all eight outer previews continue showing scheduled music while the selected pad is edited',async({page})=>{
 await page.goto('/de/');await page.locator('#clear').click();
 for(let i=0;i<9;i++){const row=page.locator('[data-track="'+i+'"]');await row.locator('summary').click();await row.locator('[data-step="0"]').click();}
 await page.locator('[data-pad-mode=rhythm]').click();await clickPad(page,4);await page.waitForTimeout(350);
 await page.locator('#play').click();
 await expect.poll(()=>page.locator('#drawing').evaluate((canvas)=>{
  const c=canvas as HTMLCanvasElement,ctx=c.getContext('2d')!,r=c.getBoundingClientRect();
  return [...document.querySelectorAll('#rhythm-zones>[data-lane]')].filter(zone=>{
   const b=zone.getBoundingClientRect(),x=Math.floor((b.left+b.width/2-r.left)/r.width*c.width),y=Math.floor((b.top+b.height/2-r.top)/r.height*c.height);
   return ctx.getImageData(x,y,1,1).data[3]>0;
  }).length;
 })).toBe(9);
 await page.locator('.flow-side').screenshot({path:'test-results/pad-focus-'+test.info().project.name+'.png'});
 await page.locator('#rhythm-done').click();
 await expect(page.locator('#drawing')).toHaveAttribute('data-music-level','1');
});

test('percussion companion gain is genuinely quieter without changing the selected instrument volume',async({page})=>{
 await page.goto('/de/');await page.locator('#play').click();
 const ratio=await page.evaluate(async()=>{
  const path='/src/lib/rhythm-player.ts',module=await import(path);
  const ctx=new OfflineAudioContext(2,48000*3,48000),player=module.createRhythmPlayer(ctx,ctx.destination);
  player.setLaneLevel(0,.1);player.setLaneLevel(1,1);
  player.hit(0,1,'kick',.5);player.hit(1,2,'kick',.5);
  const buffer=await ctx.startRendering(),data=buffer.getChannelData(0);
  const rms=(start:number)=>{let sum=0;for(let i=start;i<start+19200;i++)sum+=data[i]**2;return Math.sqrt(sum/19200);};
  return rms(48000)/rms(96000);
 });
 expect(ratio).toBeCloseTo(.1,2);
});
