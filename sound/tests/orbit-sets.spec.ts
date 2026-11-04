import {test,expect,type Page} from '@playwright/test';
import {decodeOrbitProject,type OrbitProject} from '../src/lib/orbit-project';
import {decodeSettings,type SoundSettings} from '../src/lib/sound-settings';
import {orbitPair} from '../src/lib/orbit-sequence';
import {partsForStyle} from '../src/lib/presets';
const score=[{start:0,duration:.15,points:[{offset:0,pitch:0,velocity:.7}]}];
function fixture():SoundSettings{return {version:2,style:'classical',bpm:220,volume:.3,center:'off',background:'off',orbit:'dot',tracks:partsForStyle('classical').map((p,i)=>({score:i===0?structuredClone(score):null,enabled:i===0,mute:false,instrument:i===0?'piano':p.instrument,points:Array.from({length:16},(_,s)=>i===0&&s===0),volume:.4,pitch:0,phase:0,direction:1,directionMode:'forward',randomDynamics:false,morph:null}))};}
async function upload(page:Page,data:unknown){
 await page.locator('#files-open').click();await page.locator('#json-file').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await page.locator('#files-close').click();
}
async function exported(page:Page){
 await page.locator('#files-open').click();const wait=page.waitForEvent('download');await page.locator('#json-export').click();const stream=await(await wait).createReadStream(),chunks:Buffer[]=[];for await(const part of stream!)chunks.push(part);await page.locator('#files-close').click();return JSON.parse(Buffer.concat(chunks).toString());
}
async function grid(page:Page){if(!await page.locator('#orbit-sets-panel').isVisible())await page.locator('#orbit-sets-open').click();await expect(page.locator('#orbit-sets-panel')).toBeVisible();}
async function choose(page:Page,i:number){await grid(page);await page.locator(`[data-orbit-select="${i}"]`).click();await expect(page.locator('#orbit-sets-panel')).toBeVisible();}
async function rename(page:Page,index:number,name:string){
 await grid(page);await page.locator(`[data-orbit-select="${index}"]`).dblclick();await expect(page.locator('#orbit-rename-dialog')).toBeVisible();await page.locator('#orbit-set-name').fill(name);await page.locator('#orbit-rename-save').click();await expect(page.locator('#orbit-rename-dialog')).not.toBeVisible();
}
function project():OrbitProject{return {format:'jacktools-orbit-project',version:1,active:0,bpm:220,volume:.3,clock:{meter:{numerator:4,denominator:4,groups:[1,1,1,1]},tempoUnit:{denominator:4,dotted:false},quarters:4,steps:16,swing:0},sets:Array.from({length:9},(_,i)=>({name:'Set '+i,muted:false,settings:i<2?fixture():null,barOffset:0}))};}

test('project validation is bounded, atomic, nonrecursive and backward compatible',()=>{
 expect(decodeSettings(JSON.stringify(fixture()))).not.toBeNull();expect(decodeOrbitProject(JSON.stringify(project()))).not.toBeNull();
 for(const mutate of [(p:any)=>p.sets.pop(),(p:any)=>p.active=9,(p:any)=>p.clock.steps=32,(p:any)=>p.sets[0].settings.tracks[0].instrument='unknown',(p:any)=>p.sets[0].settings=project(),(p:any)=>p.sets[0].barOffset=.5]){const p=project();mutate(p);expect(decodeOrbitProject(JSON.stringify(p))).toBeNull();}
 const p=project();p.clock={meter:{numerator:5,denominator:8,groups:[3,2]},tempoUnit:{denominator:8,dotted:false},quarters:2.5,steps:10,swing:0};
 for(const slot of p.sets)if(slot.settings){slot.settings.meter=p.clock.meter;slot.settings.pad={mode:'draw',beats:2.5,hits:Array.from({length:9},()=>Array(20).fill(false))};}
 expect(decodeOrbitProject(JSON.stringify(p))).not.toBeNull();
 expect(orbitPair(fixture(),0,project().clock)[0].score).toEqual(score);
});

test('nine complete independent slots; duplicate, rename, mute and switch preserve the original set and old JSON',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/de/');await upload(page,fixture());
 expect((await exported(page)).format).toBeUndefined(); // untouched old projects retain their format
 await grid(page);await expect(page.locator('[data-orbit-select]')).toHaveCount(9);await expect(page.locator('[data-orbit-slot="1"]')).toHaveAttribute('data-empty','true');
 await page.locator('[data-orbit-duplicate="0"]').click();await expect(page.locator('[data-orbit-slot="1"]')).toHaveAttribute('data-empty','false');
 await page.locator('[data-orbit-select="1"]').click();
 await page.locator('[data-track="0"] .track-volume').evaluate((el:HTMLInputElement)=>{el.value='.2';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await rename(page,1,'Second layer');await page.locator('[data-orbit-mute="0"]').click();await page.locator('#orbit-sets-close').click();
 let p=await exported(page);expect(p.format).toBe('jacktools-orbit-project');expect(p.active).toBe(1);expect(p.sets[0].settings.tracks[0].volume).toBe(.4);expect(p.sets[1].settings.tracks[0].volume).toBe(.2);expect(p.sets[0].muted).toBe(true);expect(p.sets[1].name).toBe('Second layer');
 await choose(page,8);p=await exported(page);expect(p.active).toBe(8);expect(p.sets[8].settings.tracks).toHaveLength(9);expect(p.sets[8].settings.tracks.every((t:any)=>!t.score?.length&&!t.points.some(Boolean))).toBe(true);expect(p.sets[1].name).toBe('Second layer');
 await upload(page,p);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');await choose(page,1);expect((await exported(page)).sets[1].settings.tracks[0].volume).toBe(.2);
 expect(errors).toEqual([]);
});

test('both complete sets sound on the same audio clock and selecting a different set never restarts transport',async({page})=>{
 await page.addInitScript(()=>{(window as any).orbitStarts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(when=0,...args){if(when>0)(window as any).orbitStarts.push(when);return start.call(this,when,...args);};});
 await page.goto('/de/');await upload(page,project());await page.locator('#play').click();
 await page.waitForTimeout(2600);
 const starts=await page.evaluate(()=>(window as any).orbitStarts as number[]);
 expect(starts.some((a,i)=>starts.some((b,j)=>i!==j&&Math.abs(a-b)<.003))).toBe(true);
 await choose(page,1);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.waitForTimeout(2500);expect((await page.evaluate(()=>(window as any).orbitStarts as number[])).length).toBeGreaterThan(starts.length);
 await grid(page);await page.locator('[data-orbit-mute="0"]').click();await page.locator('[data-orbit-mute="1"]').click();await page.locator('#orbit-sets-close').click();
 await page.waitForTimeout(200);const muted=await page.evaluate(()=>(window as any).orbitStarts.length);await page.waitForTimeout(2400);expect(await page.evaluate(()=>(window as any).orbitStarts.length)).toBe(muted);
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});

test('a finite background composition keeps playing after the selected shorter song ends, then the whole project stops',async({page})=>{
 const p=project();const source={format:'jacktools-song',version:2,title:'Short',bpm:220,style:'classical',loop:false,seed:1,rights:{composition:'Test',arrangement:'Test',recording:'Synthetic',license:'Test',source:'Local'},tracks:[{id:'piano',instrument:'piano',volume:.3}],scenes:[{name:'A',bars:2,parts:[{track:'piano',notes:[{at:0,duration:1,pitch:0,velocity:.7}]}]}]};
 p.sets[0].settings!.songScript=source as any;p.sets[1].settings!.songScript={...structuredClone(source),title:'Long',scenes:Array.from({length:3},(_,i)=>({...structuredClone(source.scenes[0]),name:'Section '+i}))} as any;
 await page.goto('/de/');await upload(page,p);await page.locator('#play').click();await page.waitForTimeout(3000);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false',{timeout:6500});
});

test('meter mismatch is rejected without replacing the current song or damaging other sets',async({page})=>{
 await page.goto('/de/');await upload(page,project());
 const before=await exported(page);
 const script={format:'jacktools-song',version:3,title:'Waltz',bpm:180,style:'classical',loop:false,seed:1,meter:{numerator:3,denominator:4,groups:[1,1,1]},tempoUnit:{denominator:4,dotted:false},rights:{composition:'Test',arrangement:'Test',recording:'Synthetic',license:'Test',source:'Local'},tracks:[{id:'p',instrument:'piano',volume:.3}],scenes:[{name:'A',bars:2,parts:[{track:'p',notes:[{at:0,duration:1,pitch:0,velocity:.7}]}]}]};
 await upload(page,script);const after=await exported(page);expect(after.sets).toEqual(before.sets);
 await grid(page);await expect(page.locator('#orbit-sets-grid')).toBeVisible();const box=(await page.locator('#orbit-sets-grid').boundingBox())!;expect(box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('all nine sets with nine instruments can sound together; the grid fits mobile and full-bank actions are bounded',async({page},info)=>{
 await page.addInitScript(()=>{(window as any).starts=0;const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){(window as any).starts++;return start.apply(this,args);};});
 const p=project();for(const slot of p.sets){slot.settings=fixture();slot.settings.tracks.forEach((tr,i)=>{tr.enabled=true;tr.instrument='piano';tr.score=structuredClone(score);tr.score[0].points[0].pitch=i*2;});}
 await page.goto('/de/');await upload(page,p);await page.locator('#play').click();await expect.poll(()=>page.evaluate(()=>(window as any).starts),{timeout:7000}).toBeGreaterThanOrEqual(81);
 await grid(page);await page.locator('[data-orbit-duplicate="0"]').click();await expect(page.locator('#orbit-sets-status')).toContainText('belegt');
 const box=(await page.locator('[data-orbit-slot="8"]').boundingBox())!;expect(box.width).toBeLessThan(page.viewportSize()!.width);await page.locator('#orbit-sets-panel').scrollIntoViewIfNeeded();
 await page.screenshot({path:'/tmp/orbit-sets-'+info.project.name+'.png'});
 await page.locator('[data-orbit-clear="0"]').click();await page.locator('#orbit-confirm-accept').click();await expect(page.locator('#orbit-confirm-dialog')).not.toBeVisible();await expect(page.locator('[data-orbit-select="1"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-orbit-slot="0"]')).toHaveAttribute('data-empty','true');
 await page.locator('#orbit-project-new').click();await page.locator('#orbit-confirm-accept').click();await expect(page.locator('#orbit-confirm-dialog')).not.toBeVisible();await expect(page.locator('[data-orbit-slot="1"]')).toHaveAttribute('data-empty','true');await page.locator('#orbit-sets-close').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');expect((await exported(page)).sets.every((slot:any)=>slot.settings===null)).toBe(true);
});

test('orbit projects persist only after consent and restore every set without autoplay',async({page})=>{
 await page.goto('/de/');await upload(page,project());
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.sound.settings.v1'))).toBeNull();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await choose(page,1);await rename(page,1,'Remembered layer');await page.locator('#orbit-sets-close').click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.sound.settings.v1')!).sets[1].name)).toBe('Remembered layer');
 await page.reload();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');await grid(page);await expect(page.locator('[data-orbit-select="1"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-orbit-slot="1"] [data-orbit-name]')).toHaveText('Remembered layer');
});


test('a new silent set accepts notes immediately and remains audible after leaving its editor',async({page})=>{
 await page.addInitScript(()=>{(window as any).newLayerStarts=0;const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){(window as any).newLayerStarts++;return start.apply(this,args);};});
 await page.goto('/de/');await upload(page,fixture());await grid(page);await page.locator('[data-orbit-mute="0"]').click();await page.locator('[data-orbit-select="8"]').click();
 await page.locator('[data-pad-mode=notes]').click();await page.locator('#score-instruments [data-score-track="0"]').click();
 const box=(await page.locator('#score-grid').boundingBox())!;await page.mouse.click(box.x+box.width*.35,box.y+box.height*.5);await page.locator('#score-done').click();await expect(page.locator('#score-expanded-dialog')).not.toBeVisible();
 const p=await exported(page);expect(p.sets[8].settings.tracks[0].enabled).toBe(true);expect(p.sets[8].settings.tracks[0].score).toHaveLength(1);expect(p.sets[0].muted).toBe(true);
 await page.locator('#play').click();await expect.poll(()=>page.evaluate(()=>(window as any).newLayerStarts),{timeout:4000}).toBeGreaterThan(0);
});

test('orbit sets are inline pad navigation, keep the main orbit and transport usable and never open a modal',async({page})=>{
 await page.goto('/de/');await grid(page);
 await expect(page.locator('dialog[open]')).toHaveCount(0);
 await expect(page.locator('#orbit-sets-panel')).toHaveJSProperty('tagName','SECTION');
 await expect(page.locator('.flow-side #orbit-sets-panel')).toBeVisible();
 await expect(page.locator('#orbit-sets-open')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#drawing')).not.toBeVisible();await expect(page.locator('#orbit')).toBeVisible();await expect(page.locator('#play')).toBeVisible();
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-orbit-select="8"]').click();await expect(page.locator('#orbit-sets-panel')).toBeVisible();await expect(page.locator('[data-orbit-select="8"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-pad-mode=rhythm]').click();await expect(page.locator('#orbit-sets-panel')).not.toBeVisible();await expect(page.locator('#rhythm-zones')).toBeVisible();await expect(page.locator('[data-pad-mode=rhythm]')).toHaveAttribute('aria-pressed','true');
 await grid(page);await page.locator('#music-settings-open').click();await expect(page.locator('#orbit-sets-panel')).not.toBeVisible();await expect(page.locator('#animation-settings')).toBeVisible();
 await grid(page);await expect(page.locator('#animation-settings')).not.toBeVisible();await page.locator('[data-pad-mode=notes]').click();await expect(page.locator('#orbit-sets-panel')).not.toBeVisible();await expect(page.locator('#note-editor')).toBeVisible();
 await grid(page);await page.keyboard.press('Escape');await expect(page.locator('#orbit-sets-panel')).not.toBeVisible();await expect(page.locator('#note-editor')).toBeVisible();await expect(page.locator('#orbit-sets-open')).toBeFocused();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
});

test('destructive actions use themed confirmation with safe focus, cancel and Escape; only an explicit acceptance clears the selected set',async({page},info)=>{
 const browserDialogs:string[]=[];page.on('dialog',d=>{browserDialogs.push(d.type());void d.dismiss();});
 await page.goto('/de/');await upload(page,project());await rename(page,0,'My melody');
 const before=await exported(page);await page.locator('#play').click();
 await page.locator('[data-orbit-clear="0"]').click();const modal=page.locator('#orbit-confirm-dialog');
 await expect(modal).toBeVisible();await expect(modal).toHaveAttribute('aria-labelledby','orbit-confirm-title');await expect(page.locator('#orbit-confirm-target')).toContainText('My melody');await expect(page.locator('#orbit-confirm-cancel')).toBeFocused();
 await page.waitForTimeout(300);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 const bounds=(await modal.boundingBox())!;expect(bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width-24);
 await page.screenshot({path:'/tmp/orbit-confirm-'+info.project.name+'.png'});
 await page.evaluate(()=>document.documentElement.dataset.theme='light');await expect(page.locator('#orbit-confirm-accept')).toHaveCSS('color','rgb(165, 47, 72)');
 await page.evaluate(()=>document.documentElement.dataset.theme='dark');
 await page.keyboard.press('Enter');await expect(modal).not.toBeVisible();expect((await exported(page)).sets).toEqual(before.sets);
 await page.locator('[data-orbit-clear="0"]').click();await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();await expect(page.locator('#orbit-sets-panel')).toBeVisible();await expect(page.locator('[data-orbit-clear="0"]')).toBeFocused();
 expect((await exported(page)).sets).toEqual(before.sets);
 await page.locator('[data-orbit-clear="0"]').click();await page.locator('#orbit-confirm-accept').click();await expect(modal).not.toBeVisible();
 const cleared=await exported(page);expect(cleared.sets[0].settings).toBeNull();expect(cleared.active).toBe(1);expect(cleared.sets[1]).toEqual(before.sets[1]);
 await page.locator('#orbit-project-new').click();await expect(page.locator('#orbit-confirm-title')).toContainText('Neues Projekt');await page.locator('#orbit-confirm-cancel').click();await expect(modal).not.toBeVisible();expect((await exported(page)).sets[1]).toEqual(before.sets[1]);
 expect(browserDialogs).toEqual([]);
});

test('orbit actions use icons and localized tooltips, including both confirmation actions',async({page})=>{
 for(const lang of ['de','en','es','fr']){
  await page.goto('/'+lang+'/');await grid(page);
  for(const selector of ['[data-orbit-duplicate="0"]','[data-orbit-clear="0"]','#orbit-project-new']){
   const button=page.locator(selector);await expect(button.locator('svg')).toBeVisible();
   expect((await button.textContent())?.trim()).toBe('');expect(await button.getAttribute('title')).toBeTruthy();expect(await button.getAttribute('aria-label')).toBe(await button.getAttribute('title'));
  }
  await page.locator('[data-orbit-clear="0"]').click();const accept=page.locator('#orbit-confirm-accept');
  await expect(accept.locator('[data-icon=clear]')).toBeVisible();await expect(accept.locator('[data-icon=new]')).not.toBeVisible();
  for(const id of ['orbit-confirm-cancel','orbit-confirm-accept']){const button=page.locator('#'+id);expect((await button.textContent())?.trim()).toBe('');expect(await button.getAttribute('aria-label')).toBe(await button.getAttribute('title'));}
  const clearTitle=await accept.getAttribute('title');await page.locator('#orbit-confirm-cancel').click();
  await page.locator('#orbit-project-new').click();await expect(accept.locator('[data-icon=new]')).toBeVisible();await expect(accept.locator('[data-icon=clear]')).not.toBeVisible();
  expect(await accept.getAttribute('title')).not.toBe(clearTitle);await expect(accept).toHaveAttribute('aria-label',await page.locator('#orbit-project-new').getAttribute('aria-label') as string);
  await page.locator('#orbit-confirm-cancel').click();
 }
});

test('double-click or real double-tap renames only the chosen set, with draft cancellation and keyboard support',async({page},info)=>{
 await page.goto('/de/');await upload(page,project());await grid(page);
 const tile=page.locator('[data-orbit-select="1"]'),modal=page.locator('#orbit-rename-dialog'),input=page.locator('#orbit-set-name');
 await tile.click();await expect(modal).not.toBeVisible();await expect(tile).toHaveAttribute('aria-pressed','true');
 await page.locator('#play').click();
 if(info.project.name==='mobile'){
  await tile.scrollIntoViewIfNeeded();const box=(await tile.boundingBox())!;await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await page.waitForTimeout(80);await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
 }else await tile.dblclick();
 await expect(modal).toBeVisible();await expect(input).toBeFocused();await expect(input).toHaveValue('Set 1');
 await input.fill('  Violin ensemble  ');await page.screenshot({path:'/tmp/orbit-rename-'+info.project.name+'.png'});await page.keyboard.press('Enter');await expect(modal).not.toBeVisible();
 await expect(page.locator('[data-orbit-slot="1"] [data-orbit-name]')).toHaveText('Violin ensemble');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 let p=await exported(page);expect(p.sets[1].name).toBe('Violin ensemble');expect(p.sets[0].name).toBe('Set 0');
 await tile.focus();await page.keyboard.press('F2');await expect(modal).toBeVisible();await input.fill('Not accepted');await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();await expect(tile).toBeFocused();await expect(page.locator('#orbit-sets-panel')).toBeVisible();
 expect((await exported(page)).sets[1].name).toBe('Violin ensemble');
 await tile.dblclick();await input.fill('');await page.locator('#orbit-rename-cancel').click();await expect(modal).not.toBeVisible();expect((await exported(page)).sets[1].name).toBe('Violin ensemble');
 await tile.dblclick();await input.fill('x'.repeat(80));await page.locator('#orbit-rename-save').click();await expect(modal).not.toBeVisible();p=await exported(page);expect(p.sets[1].name).toHaveLength(80);expect(decodeOrbitProject(JSON.stringify(p))).not.toBeNull();
});

test('tile actions sit beside mute and affect that tile without selecting it or altering another set',async({page},info)=>{
 await page.goto('/de/');await upload(page,project());await grid(page);await page.locator('#play').click();
 const original=await exported(page),duplicate=page.locator('[data-orbit-duplicate="1"]'),mute=page.locator('[data-orbit-mute="1"]'),clear=page.locator('[data-orbit-clear="1"]');
 const boxes=await Promise.all([duplicate,mute,clear].map(el=>el.boundingBox()));
 expect(boxes[0]!.x+boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x+1);expect(boxes[1]!.x+boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x+1);
 await duplicate.click();let p=await exported(page);expect(p.active).toBe(0);expect(p.sets[2].settings).toEqual(p.sets[1].settings);expect(p.sets[0]).toEqual(original.sets[0]);
 await clear.click();await expect(page.locator('#orbit-confirm-target')).toContainText('2 · Set 1');await page.locator('#orbit-confirm-cancel').click();await expect(page.locator('#orbit-confirm-dialog')).not.toBeVisible();expect((await exported(page)).sets[1]).toEqual(original.sets[1]);
 await clear.click();await page.locator('#orbit-confirm-accept').click();await expect(page.locator('#orbit-confirm-dialog')).not.toBeVisible();
 p=await exported(page);expect(p.active).toBe(0);expect(p.sets[1].settings).toBeNull();expect(p.sets[0]).toEqual(original.sets[0]);expect(p.sets[2].settings).not.toBeNull();
 for(const action of ['duplicate','mute','clear'])await expect(page.locator(`[data-orbit-${action}="1"]`)).toBeDisabled();
 await expect(page.locator('[data-orbit-select="0"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.locator('#orbit-sets-panel').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/orbit-tile-actions-'+info.project.name+'.png'});
});

test('orbit numbers match the numpad layout; tapping the number and number keys activate the corresponding editable set',async({page},info)=>{
 const p=project();p.active=1;p.sets[1].settings!.tracks[0].volume=.2;
 await page.goto('/de/');await upload(page,p);await grid(page);
 expect(await page.locator('[data-orbit-select]').evaluateAll(buttons=>buttons.map(b=>Number((b as HTMLElement).dataset.orbitSelect)+1))).toEqual([7,8,9,4,5,6,1,2,3]);
 const one=page.locator('[data-orbit-select="0"]'),seven=page.locator('[data-orbit-select="6"]'),three=page.locator('[data-orbit-select="2"]');
 const boxes=await Promise.all([one,seven,three].map(b=>b.boundingBox()));expect(boxes[0]!.y).toBeGreaterThan(boxes[1]!.y);expect(boxes[0]!.x).toBeLessThan(boxes[2]!.x);
 await expect(page.locator('[data-orbit-slot="1"]')).toHaveAttribute('data-active','true');
 if(info.project.name==='mobile')await one.locator('b').tap();else await one.locator('b').click();
 await expect(one).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-orbit-slot="0"]')).toHaveAttribute('data-active','true');await expect(one.locator('.orbit-set-selected')).toBeVisible();
 await expect(page.locator('#orbit-active-label')).toContainText('1 · Set 0');await expect(page.locator('[data-track="0"] .track-volume')).toHaveValue('0.4');expect((await exported(page)).active).toBe(0);
 await page.keyboard.press('Digit9');await expect(page.locator('[data-orbit-select="8"]')).toHaveAttribute('aria-pressed','true');expect((await exported(page)).active).toBe(8);
 await page.keyboard.press('Numpad1');await expect(one).toHaveAttribute('aria-pressed','true');await expect(page.locator('[data-track="0"] .track-volume')).toHaveValue('0.4');
 await page.locator('#orbit-sets-panel').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/orbit-numbering-'+info.project.name+'.png'});
});

test('removing the last orbit leaves a restartable empty plus tile; plus creates a fresh orbit without restoring old music',async({page},info)=>{
 await page.goto('/de/');await upload(page,fixture());await grid(page);await page.locator('#play').click();
 await page.locator('[data-orbit-clear="0"]').click();await expect(page.locator('#orbit-confirm-title')).toContainText('entfernen');await page.locator('#orbit-confirm-accept').click();await expect(page.locator('#orbit-confirm-dialog')).not.toBeVisible();
 const tile=page.locator('[data-orbit-slot="0"]');await expect(tile).toHaveAttribute('data-empty','true');await expect(tile.locator('.orbit-empty-plus')).toBeVisible();await expect(tile.locator('.orbit-tile-actions')).not.toBeVisible();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#play')).toBeDisabled();
 const empty=await exported(page);expect(empty.sets.every((slot:any)=>slot.settings===null)).toBe(true);expect(decodeOrbitProject(JSON.stringify(empty))).not.toBeNull();
 await upload(page,empty);await grid(page);await expect(tile).toHaveAttribute('data-empty','true');await expect(page.locator('#play')).toBeDisabled();
 await page.locator('#orbit-sets-panel').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/orbit-empty-'+info.project.name+'.png'});
 if(info.project.name==='mobile')await tile.locator('.orbit-empty-plus').tap();else await tile.locator('.orbit-empty-plus').click();
 await expect(tile).toHaveAttribute('data-empty','false');await expect(tile.locator('.orbit-empty-plus')).not.toBeVisible();await expect(tile.locator('.orbit-tile-actions')).toBeVisible();await expect(page.locator('#play')).toBeEnabled();
 const fresh=await exported(page);expect(fresh.sets[0].settings.tracks.every((t:any)=>!t.score?.length&&!t.points.some(Boolean))).toBe(true);expect(fresh.sets.slice(1).every((slot:any)=>slot.settings===null)).toBe(true);
});
