import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {decodeSongScript,scriptPosition,scriptScore,scriptCopy,type SongScript} from '../src/lib/song-script';
import {validScore} from '../src/lib/note-score';
import {videoInfoCopy} from '../src/lib/video-info';
import {decodeSettings} from '../src/lib/sound-settings';
const fixture=(loop=true):SongScript=>({format:'jacktools-song',version:1,title:'Test composition',bpm:220,style:'house',loop,seed:42,
 tracks:[{id:'beat',instrument:'kick',volume:.6},{id:'keys',instrument:'piano',volume:.4}],
 scenes:[{name:'Opening',bars:2,parts:[{track:'keys',notes:[{at:0,duration:1,pitch:[0,4,7],velocity:.7},{at:4,duration:1,pitch:4,velocity:.8}]}]},
 {name:'Chorus',bars:2,variation:.05,parts:[{track:'beat',notes:[0,1,2,3,4,5,6,7].map(at=>({at,duration:.2,pitch:0,velocity:.8}))},{track:'keys',notes:[{at:0,duration:2,pitch:12,velocity:.8,toPitch:7,toVelocity:.4}]}]}]});
test('strict script validation accepts the original example and rejects malformed or excessive data',async()=>{
 const guide=await readFile('public/song-script-guide.md','utf8');expect(decodeSongScript(guide.match(/```json\n([\s\S]*?)\n```/)![1])).not.toBeNull();
 const example=JSON.parse(await readFile('public/examples/sunlit-session.song.json','utf8'));expect(decodeSongScript(JSON.stringify(example))).not.toBeNull();
 for(const scene of example.scenes)for(const part of scene.parts)expect(validScore(scriptScore(part,scene.variation,42))).toBe(true);
 expect(decodeSongScript('not json')).toBeNull();expect(decodeSongScript(' '.repeat(1024*1024+1))).toBeNull();
 const invalid=[(s:any)=>s.version=2,(s:any)=>s.url='https://example.com', (s:any)=>s.bpm=NaN,(s:any)=>s.style='slowwaltz',
 (s:any)=>s.tracks[1].id='beat',(s:any)=>s.tracks[0].instrument='missing',(s:any)=>s.scenes[0].bars=3,
 (s:any)=>s.scenes[0].parts[0].track='missing',(s:any)=>s.scenes[0].parts[0].notes[0].duration=9,
 (s:any)=>s.scenes[0].parts[0].notes[0].pitch=[0,0],(s:any)=>s.scenes[0].parts[0].notes[0].toPitch=7,
 (s:any)=>s.scenes[0].parts[0].notes[0].velocity=1.1,(s:any)=>s.scenes[0].variation=.2,
 (s:any)=>s.scenes=Array.from({length:10},()=>({...s.scenes[0],bars:64})),
 (s:any)=>s.scenes[0].parts[0].notes=Array.from({length:128},()=>({at:0,duration:.2,pitch:[0,4],velocity:.5}))];
 for(const change of invalid){const value=fixture();change(value);expect(decodeSongScript(JSON.stringify(value))).toBeNull();}
});
test('scene timing, chords, glides and seeded dynamics preserve the source composition',()=>{
 const song=fixture(),raw=JSON.stringify(song);
 expect(scriptPosition(song,0)).toEqual({index:0,bar:0,turn:0});expect(scriptPosition(song,2)).toEqual({index:1,bar:0,turn:0});
 expect(scriptPosition(song,4)).toEqual({index:0,bar:0,turn:1});expect(scriptPosition({...song,loop:false},4)).toBeNull();
 const chord=scriptScore(song.scenes[0].parts[0]);expect(chord).toHaveLength(4);expect(chord[0].start).toBe(0);expect(chord[0].duration).toBe(.125);
 const part=song.scenes[1].parts[1],score=scriptScore(part,.1,42);expect(validScore(score)).toBe(true);expect(score[0].points[1].pitch).toBe(7);
 expect(scriptScore(part,.1,42)).toEqual(score);expect(scriptScore(part,.1,43)).not.toEqual(score);
 expect(scriptScore(undefined)).toEqual([]);expect(JSON.stringify(song)).toBe(raw);
});
async function open(page:Page){await page.goto('/de/');await page.locator('#files-open').click();}
async function load(page:Page,song=fixture()){await page.locator('#song-script-upload').setInputFiles({name:'song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(song))});await expect(page.locator('#song-script-export')).toBeEnabled();}
async function settings(page:Page){const wait=page.waitForEvent('download');await page.locator('#json-export').click();return JSON.parse(await readFile((await(await wait).path())!,'utf8'));}
for(const lang of ['de','en','es','fr'] as const)test('example and AI guide work without autoplay, with localized mobile-friendly controls: '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();
 await expect(page.locator('#song-script-load')).toHaveAccessibleName(scriptCopy[lang].load);
 await page.locator('#song-script-example').click();await expect(page.locator('#song-script-status')).toContainText('Sunlit Session');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 expect(decodeSongScript(await page.locator('#song-script-text').inputValue())?.tracks).toHaveLength(9);
 const guide=await page.request.get('/song-script-guide.md');expect(guide.ok()).toBe(true);expect(await guide.text()).toContain('jacktools-song');
 expect(await page.locator('#files-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth)).toBe(true);
});
test('the checkmark applies pasted JSON, closes the dialog and starts scene one; invalid JSON stays open without stopping music',async({page})=>{
 await open(page);await page.locator('#song-script-text').fill(JSON.stringify(fixture()));await page.locator('#song-script-load').click();
 await expect(page.locator('#files-dialog')).toBeHidden();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#script-now')).toContainText('Opening');
 await page.locator('#files-open').click();await page.locator('#song-script-text').fill('{bad');await page.locator('#song-script-load').click();
 await expect(page.locator('#files-dialog')).toBeVisible();await expect(page.locator('#song-script-status')).toHaveText(scriptCopy.de.invalid);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');expect((await settings(page)).songScript).toEqual(fixture());
});
test('file import, source export and settings export retain the full song; invalid input is atomic',async({page})=>{
 await open(page);await load(page);const initial=await settings(page);expect(initial.songScript).toEqual(fixture());expect(decodeSettings(JSON.stringify(initial))?.songScript).toEqual(fixture());
 const wait=page.waitForEvent('download');await page.locator('#song-script-export').click();expect(JSON.parse(await readFile((await(await wait).path())!,'utf8'))).toEqual(fixture());
 await page.locator('#song-script-text').fill('{"bad":true}');await page.locator('#song-script-load').click();await expect(page.locator('#song-script-status')).toHaveText(scriptCopy.de.invalid);
 expect((await settings(page)).songScript).toEqual(fixture());
 await page.locator('#song-script-leave').click();expect((await settings(page)).songScript).toBeUndefined();
 await page.locator('#song-script-upload').setInputFiles({name:'song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});
 await expect(page.locator('#song-script-status')).toContainText('Test composition');
 await page.locator('#song-script-leave').click();await page.locator('#json-file').setInputFiles({name:'song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture()))});
 expect((await settings(page)).songScript).toEqual(fixture());
 await page.locator('#json-file').setInputFiles({name:'settings.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(initial))});
 expect((await settings(page)).songScript).toEqual(fixture());await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
});
test('normal Play follows scenes on the audible clock, stops finite songs and restarts at scene one',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await load(page,fixture(false));await page.locator('#files-close').click();
 await expect(page.locator('#script-now')).toContainText('Opening');await page.locator('#play').click();
 await expect(page.locator('#script-now')).toContainText('Chorus',{timeout:6000});await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false',{timeout:6000});
 await page.locator('#play').click();await expect(page.locator('#script-now')).toContainText('Opening');await page.locator('#play').click();expect(errors).toEqual([]);
});
test('looping songs continue, Random Play and style changes deliberately leave script mode',async({page})=>{
 await open(page);await load(page);await page.locator('#files-close').click();await page.locator('#play').click();
 await expect(page.locator('#script-now')).toContainText('Chorus',{timeout:6000});await expect(page.locator('#script-now')).toContainText('Opening',{timeout:6000});
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.locator('#evolve').click();await expect(page.locator('#script-now')).toBeHidden();
 await page.locator('#play').click();await page.locator('#files-open').click();await load(page);await page.locator('#files-close').click();
 await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=music]').click();await page.locator('[data-style-preset=pop]').click();await expect(page.locator('#script-now')).toBeHidden();
});
test('script source restores only with optional preference storage and never autoplays',async({page})=>{
 await open(page);await load(page);await page.locator('#files-close').click();
 await page.locator('#animation-settings-open').click();await page.locator('[data-animation-open=controls]').click();
 await page.locator('#tempo').fill('145');await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#transpose').fill('3');await page.locator('#transpose').dispatchEvent('input');await page.locator('#animation-settings-close').click();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();await page.waitForTimeout(350);await page.reload();
 await expect(page.locator('#script-now')).toContainText('Opening');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#tempo')).toHaveValue('145');await expect(page.locator('#transpose')).toHaveValue('3');
 await page.locator('#files-open').click();const restored=await settings(page);expect(restored.songScript).toEqual(fixture());expect(restored.bpm).toBe(145);expect(restored.transpose).toBe(3);
});
test('script controls lock during native MP4 recording and the composed scene sequence remains active',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).scriptCaptions=[];const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){if(this.canvas.width===1280&&this.canvas.height===720)(window as any).scriptCaptions.push(text);return fill.call(this,text,x,y,...args);};
 });
 await open(page);await load(page);test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#video-info-enabled').check();await page.locator('#video-info-section').check();
 await expect(page.locator('#video-info-title')).toHaveAttribute('placeholder','Test composition');
 await page.locator('#recording-restart').check();await page.locator('#recording-duration').fill('1');await page.locator('#video-record').click();
 await expect(page.locator('#script-now')).toContainText('Chorus',{timeout:6500});
 await expect.poll(()=>page.evaluate(()=>(window as any).scriptCaptions.includes('Chorus'))).toBe(true);
 const captions=await page.evaluate(()=>(window as any).scriptCaptions as string[]);
 expect(captions).toContain('Test composition');expect(captions.join('\n')).toContain(videoInfoCopy.en.scriptNotice);expect(captions.join('\n')).not.toContain(videoInfoCopy.en.randomNotice);
 await page.locator('#files-open').click();await expect(page.locator('#song-script-load')).toBeDisabled();await expect(page.locator('#song-script-text')).toBeDisabled();await page.locator('#files-close').click();
 const download=page.waitForEvent('download');await page.locator('#video-stop').click();const bytes=await readFile((await(await download).path())!,'utf8');expect(bytes).toContain('soun');
});

test('WAV captures audible scripted notes rather than just an empty audio track',async({page})=>{
 await open(page);await load(page);test.skip(await page.locator('#wav-record').isDisabled(),'No WAV support');
 await page.locator('#recording-restart').check();await page.locator('#recording-duration').fill('1');await page.locator('#wav-record').click();
 await page.waitForTimeout(1600);const download=page.waitForEvent('download');await page.locator('#wav-stop').click();
 const data=await readFile((await(await download).path())!);expect(data.subarray(0,4).toString()).toBe('RIFF');
 let peak=0;for(let i=44;i<data.length;i+=2)peak=Math.max(peak,Math.abs(data.readInt16LE(i)));expect(peak).toBeGreaterThan(100);
});
