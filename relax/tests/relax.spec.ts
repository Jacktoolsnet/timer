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

test('wind circle follows audio, pauses and can be switched off independently',async({page})=>{
 await page.goto('/en/');await expect(page.locator('#windAnimation')).not.toBeChecked();
 await page.locator('#wind').check();await page.locator('#windAnimation').check();
 await page.locator('#instrumentAnimation').uncheck();await begin(page);
 const glow=page.locator('.ambient-glow');
 await expect(glow).toHaveAttribute('data-wind-animated','true');
 await expect.poll(()=>glow.evaluate(n=>Number((n as HTMLElement).style.getPropertyValue('--wind-level')))).toBeGreaterThan(.01);
 await page.locator('#start').click();
 const paused=await glow.evaluate(n=>(n as HTMLElement).style.getPropertyValue('--wind-level'));
 await page.waitForTimeout(150);
 expect(await glow.evaluate(n=>(n as HTMLElement).style.getPropertyValue('--wind-level'))).toBe(paused);
 await page.locator('#start').click();
 await page.locator('#windAnimation').uncheck();await expect(glow).toHaveAttribute('data-wind-animated','false');
 await expect(page.locator('#start')).toHaveAttribute('aria-label','Pause');
 await page.locator('#end-session').click();
});

test('chimes follow wind gusts only when wind is enabled',async({page})=>{
 await page.goto('/en/');
 const result=await page.evaluate(async()=>{
  const path='/src/lib/audio.ts',settingsPath='/src/lib/relax.ts';
  const {Soundscape}=await import(path),{defaults}=await import(settingsPath);
  let coupled=true;
  const notes:{coupled:boolean;wind:number;time:number}[]=[];
  const audio=new Soundscape({...defaults},()=>notes.push({coupled,wind:audio.windStrength(),time:audio.time}));
  const random=Math.random;
  // A five-second gust followed by a predictable lull.
  Math.random=()=>0;
  try{await audio.start({...defaults,wind:true,windActivity:1,density:10},0);}finally{Math.random=random;}
  await new Promise(r=>setTimeout(r,6500));
  const before=notes.length;
  coupled=false;audio.update({...defaults,wind:false,density:10});
  await new Promise(r=>setTimeout(r,1200));
  const during=notes.filter(n=>n.coupled);
  const quiet=notes.filter(n=>n.coupled&&n.time>5.15&&n.time<6.5);
  await audio.close();
  return {played:during.length,quiet:quiet.length,following:during.every(n=>n.wind>.05),independent:notes.length>before};
 });
 expect(result.played).toBeGreaterThan(2);
 expect(result.quiet).toBe(0);expect(result.following).toBe(true);expect(result.independent).toBe(true);
});

for(const instrument of ['kalimba','handpan','bells','gong','harp'] as const){
 test(instrument+' plays, animates, retunes and persists',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/en/');await page.locator('#instrument-dropdown summary').click();
  await expect(page.locator('[name=instrument][value='+instrument+']').locator('..')).toContainText(({kalimba:'metal tines',handpan:'steel instrument',bells:'bright tones',gong:'long pauses',harp:'plucked string'} as const)[instrument]);
  await page.locator('[name=instrument][value='+instrument+']').check();
  await expect(page.locator('#instrument-description')).toHaveCount(0);
  await begin(page);await expect(page.locator('.instrument-'+instrument).first()).toBeVisible();
  await page.locator('#pitch').fill('-6');
  await page.locator('#instrumentAnimation').uncheck();
  await expect(page.locator('.sound-shape')).toHaveCount(0);
  await page.locator('#end-session').click();
  await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
  await page.reload();await expect(page.locator('[name=instrument][value='+instrument+']')).toBeChecked();
  expect(errors).toEqual([]);
 });
}

test('instrument switch leaves background audio and rain animation running',async({page})=>{
 await page.goto('/en/');await page.locator('#rain').check();await page.locator('#rainAnimation').check();await begin(page);
 await expect(page.locator('.sound-shape').first()).toBeVisible();
 await page.locator('#instrumentsEnabled').uncheck();
 await expect(page.locator('.sound-shape')).toHaveCount(0);
 await expect(page.locator('.rain-drop').first()).toBeVisible();
 await expect(page.locator('#start')).toHaveAttribute('aria-label','Pause');
 await page.locator('#instrumentsEnabled').check();
 await expect(page.locator('.sound-shape').first()).toBeVisible({timeout:20000});
 await page.locator('#end-session').click();
});
test('presets apply live, preserve duration and stay editable with consent persistence',async({page})=>{
 await page.goto('/en/');await page.locator('#minutes').fill('42');await begin(page);
 for(const name of ['summer','evening','focus','nature']){
  await page.locator('#preset-dropdown summary').click();await page.locator('[name=preset][value='+name+']').check();
  await expect(page.locator('[name=preset][value='+name+']')).toBeChecked();
  await expect(page.locator('#minutes')).toHaveValue('42');
  await expect(page.locator('#start')).toHaveAttribute('aria-label','Pause');
 }
 await expect(page.locator('#instrumentsEnabled')).not.toBeChecked();
 await expect(page.locator('#rain')).toBeChecked();await expect(page.locator('#wind')).toBeChecked();
 await expect(page.locator('.sound-shape')).toHaveCount(0);
 await page.locator('#rainDensity').fill('10');await expect(page.locator('#preset-value')).toHaveText('Custom mix');
 await page.locator('#end-session').click();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('#instrumentsEnabled')).not.toBeChecked();await expect(page.locator('#rainDensity')).toHaveValue('10');
});
test('disabled instruments produce no new notes, but re-enabling resumes them',async({page})=>{
 await page.goto('/en/');
 const result=await page.evaluate(async()=>{
  const path='/src/lib/audio.ts',settingsPath='/src/lib/relax.ts';
  const {Soundscape}=await import(path),{defaults}=await import(settingsPath);
  let count=0;const audio=new Soundscape(defaults,()=>count++);
  await audio.start({...defaults,instrumentsEnabled:false,rain:true,density:10},0);
  await new Promise(r=>setTimeout(r,700));const silent=count===0;
  audio.update({...defaults,instrumentsEnabled:true,rain:true,density:10});
  await new Promise(r=>setTimeout(r,600));const resumed=count>0;
  audio.update({...defaults,instrumentsEnabled:false,rain:true,density:10});
  const before=count;await new Promise(r=>setTimeout(r,800));
  const stopped=count===before;await audio.close();return {silent,resumed,stopped};
 });
 expect(result).toEqual({silent:true,resumed:true,stopped:true});
});

test('sleep screen dims, keeps audio running and returns by tapping or Escape',async({page})=>{
 await page.goto('/en/');await expect(page.locator('#sleepMode')).not.toBeChecked();
 await page.locator('#sleepMode').check();await begin(page);
 await page.locator('#dim-screen').click();await expect(page.locator('#sleep-screen')).toBeVisible();
 await expect(page.locator('#start')).toHaveAttribute('aria-label','Pause');
 await page.locator('.sleep-screen-surface').click();await expect(page.locator('#sleep-screen')).not.toBeVisible();
 await page.locator('#dim-screen').click();await page.keyboard.press('Escape');
 await expect(page.locator('#sleep-screen')).not.toBeVisible();
 await page.locator('#sleepMode').uncheck();await expect(page.locator('#dim-screen')).toBeHidden();
 await page.locator('#end-session').click();
});
test('sleep fade resumes at the remaining level rather than full volume',async({page})=>{
 await page.goto('/en/');
 const result=await page.evaluate(async()=>{
  const path='/src/lib/audio.ts',settingsPath='/src/lib/relax.ts';
  const {Soundscape}=await import(path),{defaults}=await import(settingsPath);
  const original=AudioContext.prototype.createGain,gains:GainNode[]=[];
  AudioContext.prototype.createGain=function(){const gain=original.call(this);gains.push(gain);return gain;};
  const audio=new Soundscape(defaults,()=>{});
  try{
   await audio.start({...defaults,sleepMode:true,rain:true},2,20);
   await new Promise(r=>setTimeout(r,500));const level=gains[0].gain.value;
   audio.update({...defaults,sleepMode:false,rain:true});
   await new Promise(r=>setTimeout(r,350));const normal=gains[0].gain.value;
   return {soft:level>.05&&level<.25,louder:normal>level};
  }finally{await audio.close();AudioContext.prototype.createGain=original;}
 });
 expect(result).toEqual({soft:true,louder:true});
});

test('focus simulation fills the viewport with compact, accessible overlay controls',async({page})=>{
 await page.goto('/en/');await begin(page);
 // Exercise fallback focus layout so the browser window can be resized in this test.
 await page.evaluate(()=>{Object.defineProperty(document.documentElement,'requestFullscreen',{value:undefined,configurable:true});});
 await page.locator('#focus').click();
 for(const size of [{width:390,height:844},{width:1440,height:900},{width:2560,height:1440},{width:740,height:360}]){
  await page.setViewportSize(size);
  const stage=await page.locator('#sound-stage').boundingBox();
  expect(stage!.width).toBeGreaterThan(size.width*.9);expect(stage!.height).toBeGreaterThan(size.height*.9);
  for(const selector of ['#focus','#start','#end-session','#safety-open']){
   await expect(page.locator(selector)).toBeVisible();
   const box=await page.locator(selector).boundingBox();
   expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);
   expect(box!.x+box!.width).toBeLessThanOrEqual(size.width);
   expect(box!.y+box!.height).toBeLessThanOrEqual(size.height);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 }
 await page.locator('#safety-open').click();await expect(page.locator('#safety-dialog')).toBeVisible();
});

test('focus cursor hides after inactivity and returns for movement, dialogs and exit',async({page})=>{
 await page.goto('/en/');await page.locator('#focus').click();
 await page.mouse.move(200,200);
 await expect(page.locator('body')).toHaveClass(/focus-cursor-hidden/,{timeout:5000});
 await expect(page.locator('#sound-stage')).toHaveCSS('cursor','none');
 await page.mouse.move(210,210);
 await expect(page.locator('body')).not.toHaveClass(/focus-cursor-hidden/);
 await page.locator('#safety-open').click();
 await page.waitForTimeout(3200);
 await expect(page.locator('body')).not.toHaveClass(/focus-cursor-hidden/);
 await page.keyboard.press('Escape');
 await expect(page.locator('body')).toHaveClass(/focus-cursor-hidden/,{timeout:5000});
 await page.keyboard.press('Shift');
 await expect(page.locator('body')).not.toHaveClass(/focus-cursor-hidden/);
 await page.locator('#focus').click();
 await expect(page.locator('body')).not.toHaveClass(/focus-view|focus-cursor-hidden/);
});
