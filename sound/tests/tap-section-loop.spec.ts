import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const source=(six=false)=>({format:'jacktools-song',version:3,title:'Tap section loop',bpm:180,style:'coffeehouse',loop:false,seed:42,
 rights:{composition:'Project test.',arrangement:'Test.',recording:'Synthetic.',license:'Test.',source:'Local fixture.'},
 meter:{numerator:six?6:3,denominator:six?8:4,groups:six?[3,3]:[1,1,1]},tempoUnit:{denominator:4,dotted:six},
 tracks:[{id:'keys',instrument:'piano',volume:.35},{id:'layer',instrument:'epiano',volume:.2}],
 scenes:['Opening','Middle','Ending'].map((name,i)=>({name,bars:2,parts:[
  {track:'keys',notes:[{at:0,duration:.5,pitch:i*12,velocity:.7}]},
  {track:'layer',notes:[{at:0,duration:.5,pitch:7,velocity:.5}]}
 ]}))});
async function load(page:Page,s=source()){
 await page.goto('/de/');await page.locator('#files-open').click();
 await page.locator('#song-script-upload').setInputFiles({name:'tap.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
 await page.locator('#files-close').click();await page.locator('[data-pad-mode=rhythm]').click();
}
async function exportSettings(page:Page){
 await page.locator('#files-open').click();const pending=page.waitForEvent('download');await page.locator('#json-export').click();
 const p=JSON.parse(await readFile((await(await pending).path())!,'utf8'));await page.locator('#files-close').click();return p;
}
for(const six of [false,true])test(`${six?'6/8':'3/4'} tap editing repeats the current pair, retains draft and resumes at the next source section`,async({page})=>{
 await page.addInitScript(()=>{(window as any).tapLoopAttacks=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(at=0,...rest){if(at>0)(window as any).tapLoopAttacks.push(at);return start.call(this,at,...rest);};});
 const song=source(six);await load(page,song);await page.locator('#play').click();
 await page.keyboard.press('Numpad7');await expect(page.locator('#drawing')).toHaveAttribute('data-section-loop','true');
 await page.keyboard.press('Numpad7');const draft=await page.locator('#drawing').getAttribute('data-rhythm-pattern');
 await page.waitForTimeout(6500);await expect(page.locator('#song-script-status')).toContainText('Opening');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#drawing')).toHaveAttribute('data-selected-pad','0');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-pattern',draft!);
 expect(await page.evaluate(()=>(window as any).tapLoopAttacks.length)).toBeGreaterThan(6);
 await page.locator(six?'#rhythm-done':'#rhythm-cancel').click();
 await expect(page.locator('#song-script-status')).toContainText('Middle',{timeout:3000});
 await expect(page.locator('#drawing')).not.toHaveAttribute('data-section-loop','true');
 expect((await exportSettings(page)).songScript).toEqual(song);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false',{timeout:6500});
});

test('selection while stopped stays silent; switching untouched pads keeps one pair; cancel and mode changes release it',async({page})=>{
 await load(page);await page.keyboard.press('Numpad7');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.keyboard.press('Numpad8');await expect(page.locator('#drawing')).toHaveAttribute('data-selected-pad','1');
 await page.locator('#play').click();await page.waitForTimeout(2600);await expect(page.locator('#drawing')).toHaveAttribute('data-section-loop','true');await expect(page.locator('#song-script-status')).not.toContainText('Middle');
 await page.locator('[data-pad-mode=draw]').click();await expect(page.locator('#song-script-status')).toContainText('Middle',{timeout:3000});
 await expect(page.locator('#drawing')).not.toHaveAttribute('data-section-loop','true');
});

test('a final section does not finish during a tap take and can stop normally after acceptance',async({page})=>{
 const s=source();s.scenes=s.scenes.slice(0,1);await load(page,s);await page.keyboard.press('Numpad7');await page.keyboard.press('Numpad7');
 await page.waitForTimeout(3300);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#rhythm-done').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false',{timeout:3000});
});

test('generated accompaniment is held without persisting frozen scores; Random Play resumes on exit',async({page})=>{
 await page.goto('/de/');await page.locator('#tempo').evaluate((el:HTMLInputElement)=>{el.value='220';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#evolve').click();await page.locator('[data-pad-mode=rhythm]').click();
 const before=await exportSettings(page);await page.keyboard.press('Numpad7');
 await expect(page.locator('#drawing')).toHaveAttribute('data-section-loop','true');await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','false');
 const during=await exportSettings(page);expect(during.tracks.map((t:any)=>t.score)).toEqual(before.tracks.map((t:any)=>t.score));
 await page.locator('#rhythm-cancel').click();await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','true',{timeout:6000});
});


test('quickly transferring from the note grid to Tap does not leave a stuck editing loop',async({page})=>{
 await load(page);await page.locator('#play').click();await page.locator('[data-pad-mode=notes]').click();
 await page.locator('#score-instruments [data-score-track="0"]').click();await page.locator('#score-done').click();
 await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad7');
 await expect(page.locator('#drawing')).toHaveAttribute('data-section-loop','true');
 await page.locator('#rhythm-cancel').click();await expect(page.locator('#drawing')).not.toHaveAttribute('data-section-loop','true',{timeout:3000});
 await expect(page.locator('#song-script-status')).toContainText('Middle',{timeout:3000});
});
