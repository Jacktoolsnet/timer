import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {decodeSongScript} from '../src/lib/song-script';
import {songRightsText,videoCreditsForSong} from '../src/lib/video-credits';
const rights={composition:'Original: Example; status unverified.',arrangement:'Arrangement: AI-assisted; rights unverified.',recording:'Recording: synthesized with jacktools Sound.',license:'License: unverified; no permission confirmed.',source:'Source: original example JSON; no external source documented.'};
const song={format:'jacktools-song',version:2,title:'Rights test',rights,bpm:220,style:'classical',loop:false,seed:42,tracks:[{id:'keys',instrument:'piano',volume:.4}],scenes:[{name:'Opening',bars:2,parts:[{track:'keys',notes:[{at:0,duration:1,pitch:0,velocity:.6}]}]}]};
test('v2 requires bounded, complete rights; v1 remains readable without inventing a license',async()=>{
 expect(decodeSongScript(JSON.stringify(song))).not.toBeNull();
 const missing={...song} as any;delete missing.rights;expect(decodeSongScript(JSON.stringify(missing))).toBeNull();
 for(const field of Object.keys(rights))for(const value of [undefined,'','   ',null,42,'x'.repeat(161)]){
  const bad=structuredClone(song);(bad.rights as any)[field]=value;expect(decodeSongScript(JSON.stringify(bad))).toBeNull();
 }
 expect(decodeSongScript(JSON.stringify({...song,rights:{...rights,url:'https://example.com'}}))).toBeNull();
 expect(decodeSongScript(JSON.stringify({...song,rights:Object.fromEntries(Object.keys(rights).map(key=>[key,'x'.repeat(120)]))}))).toBeNull();
 const legacy=decodeSongScript(JSON.stringify({...missing,version:1}))!;expect(legacy).not.toBeNull();expect(songRightsText(legacy,'de')).toContain('Keine Lizenz');
 for(const name of ['sunlit-session','pachelbel-canon-morning-light']){
  const example=decodeSongScript(await readFile('public/examples/'+name+'.song.json','utf8'))!;expect(example?.version).toBe(2);expect(example.rights).toBeTruthy();
 }
 const guide=await readFile('public/song-script-guide.md','utf8');expect(decodeSongScript(guide.match(/```json\n([\s\S]*?)\n```/)![1])?.version).toBe(2);
});
test('mandatory rights cannot be disabled, replaced or truncated by optional text',()=>{
 const parsed=decodeSongScript(JSON.stringify(song))!;
 for(const enabled of [false,true]){
  const credits=videoCreditsForSong(parsed,{enabled,text:'EXTRA '.repeat(100)},'en');expect(credits.enabled).toBe(true);
  expect(credits.text.startsWith(songRightsText(parsed,'en'))).toBe(true);expect(credits.text.length).toBeLessThanOrEqual(600);
 }
 expect(videoCreditsForSong(null,{enabled:false,text:'saved'},'en')).toEqual({enabled:false,text:'saved'});
});
for(const manual of [false,true])test('song video includes source rights with optional credits off; manual='+manual,async({page})=>{
 await page.addInitScript(()=>{
  (window as any).rightsFrames=[];const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){if(text==='License: unverified; no permission confirmed.')(window as any).rightsFrames.push(performance.now());return fill.call(this,text,x,y,...rest);};
 });
 await page.goto('/de/');await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#song-script-upload').setInputFiles({name:'rights.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(song))});
 await expect(page.locator('#video-song-rights-text')).toContainText(rights.license);await expect(page.locator('#video-credits-enabled')).not.toBeChecked();
 await page.locator('#video-length-mode input[value=song]').check();
 const download=page.waitForEvent('download');await page.locator('#video-record').click();
 if(manual){await page.waitForTimeout(600);await page.locator('#video-stop').click();}
 await download;
 const frames=await page.evaluate(()=>(window as any).rightsFrames as number[]);expect(frames.length).toBeGreaterThan(10);expect(frames.at(-1)!-frames[0]).toBeGreaterThan(2700);
 await page.locator('#files-open').click();const source=decodeSongScript(await page.locator('#song-script-text').inputValue());expect(source?.rights).toEqual(rights);
 const wait=page.waitForEvent('download');await page.locator('#json-export').click();const project=JSON.parse(await readFile((await(await wait).path())!,'utf8'));expect(project.songScript.rights).toEqual(rights);
});
