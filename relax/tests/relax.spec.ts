import {test,expect,type Page} from '@playwright/test';
import {dictionaries} from '../src/lib/relax-i18n';
async function begin(page:Page){await page.locator('#start').click();await page.locator('#safety-continue').click();}
for(const lang of ['de','en','es','fr'] as const){
 test(lang+' safety, playback, focus and stopping',async({page})=>{
  await page.setViewportSize({width:320,height:740});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/'+lang+'/');await expect(page.locator('#state')).toHaveText(dictionaries[lang].ready);
  await expect(page.locator('.sound-shape')).toHaveCount(0);
  await expect(page.locator('.scene-word')).toBeVisible();
  await page.locator('#instrument-dropdown summary').click();
  await page.locator('[name=instrument][value=bowls]').check();
  await expect(page.locator('#instrument-value')).toHaveText(dictionaries[lang].bowls);
  await expect(page.locator('#instrument-dropdown')).not.toHaveAttribute('open', '');
  await begin(page);await expect(page.locator('#start')).toHaveAttribute('aria-label',dictionaries[lang].pause);
  await expect(page.locator('.sound-shape').first()).toBeVisible();
  await expect(page.locator('.scene-word')).toBeHidden();
  await page.locator('#start').click();await expect(page.locator('#state')).toHaveText(dictionaries[lang].paused);
  await page.locator('#start').click();await expect(page.locator('#first-start-dialog')).not.toBeVisible();
  await page.locator('#focus').click();await expect(page.locator('body')).toHaveClass(/focus-view/);
  await page.locator('#safety-open').click();await expect(page.locator('#safety-dialog')).toBeVisible();
  await expect(page.locator('#safety-dialog')).toContainText(dictionaries[lang].safePlace);
  await page.keyboard.press('Escape');await expect(page.locator('body')).toHaveClass(/focus-view/);
  await page.locator('#end-session').click();await expect(page.locator('#state')).toHaveText(dictionaries[lang].done);
  await expect(page.locator('.sound-shape')).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
test('independent layers, noise colours and local storage consent',async({page})=>{
 await page.goto('/en/');await page.locator('#rain').check();await page.locator('#wind').check();await page.locator('#noise').check();
 await page.locator('#rainVolume').evaluate((node)=>{const input=node as HTMLInputElement;input.value='40';input.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#noiseVolume').evaluate((node)=>{const input=node as HTMLInputElement;input.value='10';input.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('[name=noiseType][value=brown]').check();await page.locator('#minutes').fill('0');await page.locator('#minutes').dispatchEvent('input');
 await expect(page.locator('#session')).toHaveText('∞');await expect(page.locator('#session-progress')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('#rain')).toBeChecked();await expect(page.locator('#noiseVolume')).toHaveValue('10');
 await expect(page.locator('[name=noiseType][value=brown]')).toBeChecked();
 await begin(page);await page.locator('#end-session').click();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').uncheck();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});
test('optional background pause never resumes by itself',async({page})=>{
 await page.goto('/en/');await begin(page);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#start')).toHaveAttribute('aria-label','Pause');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.locator('#background').uncheck();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#state')).toHaveText('Paused');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#start')).toHaveAttribute('aria-label','Resume');
});
test('audio engine emits sound and fades to silence on its own deadline',async({page})=>{
 await page.goto('/en/');
 await page.locator('#start').click();await page.locator('#safety-continue').click();await page.locator('#end-session').click();
 const result=await page.evaluate(async()=>{
  const path='/src/lib/audio.ts',settingsPath='/src/lib/relax.ts';
  const {Soundscape}=await import(path),{defaults}=await import(settingsPath);
  const original=AudioContext.prototype.createGain,meters:AnalyserNode[]=[];
  AudioContext.prototype.createGain=function(){const gain=original.call(this),meter=this.createAnalyser();gain.connect(meter);meters.push(meter);return gain;};
  const engine=new Soundscape({...defaults,rain:true,noise:true},()=>{});
  await engine.start({...defaults,rain:true,noise:true},1.2);
  const sample=()=>meters.some(m=>{const data=new Float32Array(m.fftSize);m.getFloatTimeDomainData(data);return data.some(v=>Math.abs(v)>.001);});
  await new Promise(r=>setTimeout(r,500));const audible=sample();
  await new Promise(r=>setTimeout(r,1100));const silent=!sample();
  await engine.close();return {audible,silent};
 });
 expect(result).toEqual({audible:true,silent:true});
});
test('reduced motion and legal pages',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/en/');await expect(page.locator('#motion')).not.toBeChecked();
 await begin(page);await page.waitForTimeout(700);await expect(page.locator('.sound-shape')).toHaveCount(0);await page.locator('#end-session').click();
 await page.goto('/en/usage/');await expect(page.locator('.legal-page')).toContainText('not a reliable alarm');
 await page.goto('/de/privacy/');await expect(page.locator('.legal-page')).toContainText('jacktools.relax.settings.v1');
});
test('stopping an active soundscape silences every layer',async({page})=>{
 await page.addInitScript(()=>{
  const original=AudioContext.prototype.createGain,meters:AnalyserNode[]=[];
  (window as unknown as {meters:AnalyserNode[]}).meters=meters;
  AudioContext.prototype.createGain=function(){const gain=original.call(this),meter=this.createAnalyser();gain.connect(meter);meters.push(meter);return gain;};
 });
 await page.goto('/en/');await page.locator('#rain').check();await page.locator('#wind').check();await page.locator('#noise').check();await begin(page);
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {meters:AnalyserNode[]}).meters.some(m=>{const a=new Float32Array(m.fftSize);m.getFloatTimeDomainData(a);return a.some(v=>Math.abs(v)>.001);}))).toBe(true);
 await page.locator('#end-session').click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {meters:AnalyserNode[]}).meters.every(m=>{const a=new Float32Array(m.fftSize);m.getFloatTimeDomainData(a);return a.every(v=>Math.abs(v)<.0001);}))).toBe(true);
 await expect(page.locator('.sound-shape')).toHaveCount(0);
});

test('active shapes follow every palette and light/dark appearance',async({page})=>{
 await page.goto('/en/');await begin(page);
 const shape=page.locator('.sound-shape').first();await expect(shape).toBeVisible();
 const colours=new Set<string>();
 for(const palette of ['terracotta','blue','green','orange','red','violet','teal','rose']){
  await page.evaluate(p=>{document.documentElement.dataset.palette=p;},palette);
  const colour=await shape.evaluate(n=>getComputedStyle(n).backgroundImage);
  expect(colour).toContain('oklch');colours.add(colour);
 }
 expect(colours.size).toBe(8);
 // Every note retains its own colour, in both light and dark mode.
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
  const tones=await page.evaluate(()=>{
   const probe=document.createElement('span');document.body.append(probe);
   const colours=Array.from({length:8},(_,i)=>{
    probe.style.color='var(--relax-tone-'+i+')';return getComputedStyle(probe).color;
   });probe.remove();return colours;
  });
  expect(new Set(tones).size).toBe(8);expect(tones.every(c=>c.includes('oklch'))).toBe(true);
 }
 await page.evaluate(()=>{document.documentElement.dataset.theme='light';});
 const light=await shape.evaluate(n=>getComputedStyle(n).backgroundImage);
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
 const dark=await shape.evaluate(n=>getComputedStyle(n).backgroundImage);
 expect(dark).not.toBe(light);
 await page.locator('#end-session').click();
});

test('pitch control retunes active voices and persists with consent',async({page})=>{
 await page.addInitScript(()=>{
  const original=AudioContext.prototype.createOscillator;
  (window as unknown as {tones:OscillatorNode[]}).tones=[];
  AudioContext.prototype.createOscillator=function(){
   const tone=original.call(this);(window as unknown as {tones:OscillatorNode[]}).tones.push(tone);return tone;
  };
 });
 await page.goto('/en/');await begin(page);await expect(page.locator('.sound-shape').first()).toBeVisible();
 await page.locator('#pitch').fill('12');
 await expect(page.locator('#pitch-value')).toHaveText('+12 semitones');
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {tones:OscillatorNode[]}).tones[0]?.detune.value)).toBeGreaterThan(1190);
 await page.locator('#pitch').fill('-12');
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {tones:OscillatorNode[]}).tones[0]?.detune.value)).toBeLessThan(-1190);
 await page.locator('#end-session').click();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('#pitch')).toHaveValue('-12');
});

test('rain density changes during playback and is saved with consent',async({page})=>{
 await page.goto('/en/');await page.locator('#rain').check();await begin(page);
 await page.locator('#rainDensity').fill('9');
 await expect(page.locator('#rainDensity-value')).toHaveText('9 / 10');
 await expect(page.locator('#start')).toHaveAttribute('aria-label','Pause');
 await page.locator('#rainDensity').fill('2');
 await expect(page.locator('#rainDensity-value')).toHaveText('2 / 10');
 await page.locator('#end-session').click();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('#rainDensity')).toHaveValue('2');
});

test('wind activity is adjustable live and saved with consent',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/en/');await page.locator('#wind').check();await begin(page);
 await page.locator('#windActivity').fill('9');
 await expect(page.locator('#windActivity-value')).toHaveText('9 / 10');
 await expect(page.locator('#start')).toHaveAttribute('aria-label','Pause');
 await page.locator('#windActivity').fill('2');
 await page.locator('#end-session').click();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('#windActivity')).toHaveValue('2');
 expect(errors).toEqual([]);
});

test('optional rain animation follows playback and respects motion',async({page})=>{
 await page.goto('/en/');await expect(page.locator('#rainAnimation')).not.toBeChecked();
 await page.locator('#rain').check();await begin(page);await expect(page.locator('.rain-drop')).toHaveCount(0);
 await page.locator('#rainAnimation').check();await expect(page.locator('.rain-drop').first()).toBeVisible();
 await page.locator('#start').click();
 await expect(page.locator('.rain-drop').first()).toHaveCSS('animation-play-state','paused');
 await page.locator('#start').click();await expect(page.locator('.rain-drop').first()).toBeVisible();
 await page.locator('#rainAnimation').uncheck();await expect(page.locator('.rain-drop')).toHaveCount(0);
 await page.locator('#rainAnimation').check();await expect(page.locator('.rain-drop').first()).toBeVisible();
 await page.locator('#motion').uncheck();await expect(page.locator('.rain-drop')).toHaveCount(0);
 await page.locator('#motion').check();await expect(page.locator('.rain-drop').first()).toBeVisible();
 await page.locator('#rain').uncheck();await expect(page.locator('.rain-drop')).toHaveCount(0);
 await page.locator('#end-session').click();await expect(page.locator('.rain-drop')).toHaveCount(0);
});

test('instrument animation can be disabled independently of rain and audio',async({page})=>{
 await page.goto('/en/');await expect(page.locator('#instrumentAnimation')).toBeChecked();
 await page.locator('#rain').check();await page.locator('#rainAnimation').check();await begin(page);
 await expect(page.locator('.sound-shape').first()).toBeVisible();
 await page.locator('#instrumentAnimation').uncheck();
 await expect(page.locator('.sound-shape')).toHaveCount(0);
 await expect(page.locator('.rain-drop').first()).toBeVisible();
 await expect(page.locator('#start')).toHaveAttribute('aria-label','Pause');
 await page.locator('#instrumentAnimation').check();
 await expect(page.locator('.sound-shape').first()).toBeVisible({timeout:20000});
 await page.locator('#instrumentAnimation').uncheck();await page.locator('#end-session').click();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('#instrumentAnimation')).not.toBeChecked();
});
