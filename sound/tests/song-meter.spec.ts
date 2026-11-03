import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {decodeSongScript,scriptScore,type SongScript} from '../src/lib/song-script';
import {meterAccent,quartersPerBar,tempoQuarters,scriptSeconds,unitsPerPattern,type SongMeter,type TempoUnit} from '../src/lib/song-meter';
import {validScore} from '../src/lib/note-score';
import {decodeSettings} from '../src/lib/sound-settings';
const rights={composition:'Original meter test; rights unverified.',arrangement:'AI-assisted test.',recording:'Synthesized test; no external recording.',license:'License unverified.',source:'Original test JSON.'};
const cases:[string,SongMeter,TempoUnit][]=[
 ['2/2',{numerator:2,denominator:2,groups:[1,1]},{denominator:2,dotted:false}],
 ['2/4',{numerator:2,denominator:4,groups:[1,1]},{denominator:4,dotted:false}],
 ['3/4',{numerator:3,denominator:4,groups:[1,1,1]},{denominator:4,dotted:false}],
 ['4/4',{numerator:4,denominator:4,groups:[1,1,1,1]},{denominator:4,dotted:false}],
 ['5/4',{numerator:5,denominator:4,groups:[3,2]},{denominator:4,dotted:false}],
 ['3/8',{numerator:3,denominator:8,groups:[3]},{denominator:8,dotted:false}],
 ['6/8',{numerator:6,denominator:8,groups:[3,3]},{denominator:4,dotted:true}],
 ['7/8',{numerator:7,denominator:8,groups:[2,2,3]},{denominator:8,dotted:false}],
 ['9/8',{numerator:9,denominator:8,groups:[3,3,3]},{denominator:4,dotted:true}],
 ['12/8',{numerator:12,denominator:8,groups:[3,3,3,3]},{denominator:4,dotted:true}]
];
function fixture(meter:SongMeter,tempoUnit:TempoUnit):SongScript{
 return {format:'jacktools-song',version:3,title:'Native meter test',rights,meter,tempoUnit,bpm:220,style:'classical',loop:false,seed:42,
 tracks:[{id:'lead',instrument:'piano',volume:.35}],scenes:[{name:'Native phrase',bars:2,parts:[{track:'lead',notes:[0,meter.numerator,meter.numerator*2-1].map(at=>({at,duration:.5,pitch:12,velocity:.8}))}]}]};
}
test('bounded v3 meters, exact duration/score conversion, accents and legacy compatibility',async()=>{
 for(const [,meter,unit] of cases){
  const source=fixture(meter,unit),song=decodeSongScript(JSON.stringify(source));expect(song).not.toBeNull();
  expect(unitsPerPattern(source)).toBe(meter.numerator*2);
  const expected=2*(meter.numerator*4/meter.denominator)*60/(220*(4/unit.denominator*(unit.dotted?1.5:1)));
  expect(scriptSeconds(source)).toBeCloseTo(expected,10);
  const score=scriptScore(source.scenes[0].parts[0],0,42,meter);expect(validScore(score)).toBe(true);
  expect(score[1].start).toBe(.5);expect(score[1].duration).toBe(.5/(meter.numerator*2));
  expect(score[1].points[0].velocity).toBe(.8);
 }
 const six=fixture(cases[6][1],cases[6][2]);six.bpm=60;expect(scriptSeconds(six)).toBe(4);
 expect(scriptSeconds({...six,tempoUnit:{denominator:4,dotted:false}})).toBe(6);
 expect(quartersPerBar(six)).toBe(3);expect(tempoQuarters(six)).toBe(1.5);
 const accents=[0,1,2,3,4,5,6].map(at=>meterAccent(cases[6][1],at));expect(accents).toEqual([1,.88,.88,.94,.88,.88,1]);
 const seven=cases[7][1];expect([0,2,4,7].map(at=>meterAccent(seven,at))).toEqual([1,.94,.94,1]);
 const legacy=JSON.parse(await readFile('public/examples/pachelbel-canon-morning-light.song.json','utf8'));
 expect(scriptSeconds(legacy)).toBeCloseTo(50*4*60/72);expect(quartersPerBar(legacy)).toBe(4);expect(tempoQuarters(legacy)).toBe(1);
 const guide=await readFile('public/song-script-guide.md','utf8');expect(decodeSongScript(guide.match(/```json\n([\s\S]*?)\n```/)![1])?.version).toBe(3);
 expect(decodeSongScript(await readFile('public/examples/meter-study-6-8.song.json','utf8'))?.version).toBe(3);
});
test('reject incomplete, ambiguous, malformed and overflowing native meter data atomically',()=>{
 const base=fixture(cases[6][1],cases[6][2]);
 const invalid=[(s:any)=>delete s.meter,(s:any)=>delete s.tempoUnit,(s:any)=>delete s.rights,
  (s:any)=>s.meter=null,(s:any)=>s.meter.groups=[],(s:any)=>s.meter.groups=[3,2],(s:any)=>s.meter.groups=[3,3,0],(s:any)=>s.meter.groups=['3',3],
  (s:any)=>s.meter.numerator=3.5,(s:any)=>s.meter.numerator=13,(s:any)=>s.meter.denominator=3,(s:any)=>s.meter.url='remote',
  (s:any)=>s.tempoUnit.dotted=1,(s:any)=>s.tempoUnit.denominator=0,(s:any)=>s.tempoUnit.extra=true,
  (s:any)=>s.scenes[0].meter=s.meter,(s:any)=>s.scenes[0].parts[0].notes[0].at=12,(s:any)=>s.scenes[0].parts[0].notes[0].duration=13,
  (s:any)=>s.scenes[0].parts[0].notes[0].duration=.016,(s:any)=>s.version=2,(s:any)=>s.version=1];
 for(const change of invalid){const value=structuredClone(base);change(value);expect(decodeSongScript(JSON.stringify(value))).toBeNull();}
 const widest=fixture({numerator:12,denominator:2,groups:[4,4,4]},{denominator:2,dotted:false});
 widest.scenes[0].parts[0].notes=[{at:23.952,duration:.048,pitch:0,velocity:.5}];expect(decodeSongScript(JSON.stringify(widest))).not.toBeNull();
 expect(validScore(scriptScore(widest.scenes[0].parts[0],0,42,widest.version===3?widest.meter:undefined))).toBe(true);
});
for(const [name,meter,tempoUnit] of cases)test('native playback clock and visual meter: '+name,async({page})=>{
 const song=fixture(meter,tempoUnit);await page.goto('/de/');await page.locator('#files-open').click();
 await page.locator('#song-script-upload').setInputFiles({name:'meter.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(song))});
 await expect(page.locator('#song-script-status')).toContainText('Geladen');
 await expect(page.locator('#meter-value')).toHaveText(name);await expect(page.locator('#sound-app')).toHaveAttribute('data-steps',String(meter.numerator*16/meter.denominator));
 await expect(page.locator('#tempo-value')).toContainText(name);await page.locator('#files-close').click();
 const begin=Date.now();await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false',{timeout:8000});
 expect((Date.now()-begin)/1000).toBeGreaterThan(scriptSeconds(song)-.2);expect((Date.now()-begin)/1000).toBeLessThan(scriptSeconds(song)+1.1);
 await expect(page.locator('#song-script-status')).toContainText(name);
 await page.locator('[data-pad-mode=notes]').click();await page.locator('#score-instruments [data-score-track="0"]').click();
 await expect(page.locator('#score-grid .score-beat-name')).toHaveCount(meter.numerator*2);
 await expect(page.locator('#score-grid .score-beat-name')).toHaveText(Array.from({length:2},(_,bar)=>Array.from({length:meter.numerator},(_,beat)=>`${bar+1}.${beat+1}`)).flat());
 await expect(page.locator('#score-grid .score-accent')).toHaveCount((meter.groups.length-1)*2);
});
test('v3 settings/source roundtrip and correctly timed MP4 retain native meter and mandatory rights',async({page})=>{
 const source=fixture(cases[6][1],cases[6][2]);await page.goto('/de/');await page.locator('#files-open').click();
 await page.locator('#song-script-upload').setInputFiles({name:'six.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
 const exported=page.waitForEvent('download');await page.locator('#json-export').click();
 const raw=await readFile((await(await exported).path())!,'utf8'),settings=decodeSettings(raw);expect(settings?.songScript).toEqual(source);expect(settings?.pad?.beats).toBe(3);
 await page.locator('#json-file').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(raw)});
 expect(JSON.parse(await page.locator('#song-script-text').inputValue())).toEqual(source);
 test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 await page.locator('#video-length-mode input[value=song]').check();await expect(page.locator('#video-song-duration')).toContainText('00:03');
 const begin=Date.now(),download=page.waitForEvent('download');await page.locator('#video-record').click();await download;
 const elapsed=(Date.now()-begin)/1000;expect(elapsed).toBeGreaterThan(scriptSeconds(source)+4.5);expect(elapsed).toBeLessThan(scriptSeconds(source)+7);
 await page.locator('#files-open').click();await expect(page.locator('#video-song-rights-text')).toContainText(rights.license);
});
test('native denominator-note onsets, scene boundaries and looping use the same audio clock',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).meterStarts=[];
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(when=0,...rest:any[]){(window as any).meterStarts.push(when);return start.call(this,when,...rest);};
 });
 const source=fixture(cases[6][1],cases[6][2]);source.scenes.push({...structuredClone(source.scenes[0]),name:'Second native phrase'});
 await page.goto('/de/');await page.locator('#files-open').click();await page.locator('#song-script-upload').setInputFiles({name:'six.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
 await page.locator('#files-close').click();await page.locator('#play').click();
 await expect(page.locator('#song-script-status')).toContainText('Second native phrase');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 const starts=await page.evaluate(()=>(window as any).meterStarts as number[]),times=[...new Set(starts.filter(t=>t>0).map(t=>Math.round(t*1000)/1000))].sort((a,b)=>a-b);
 // 6 eighth-note units = one bar = two dotted-quarter pulses, NOT six quarter beats.
 const barSeconds=scriptSeconds(source)/4;
 expect(times.some(a=>times.some(b=>Math.abs(b-a-barSeconds)<.025))).toBe(true);
 source.scenes=source.scenes.slice(0,1);source.loop=true;
 await page.locator('#files-open').click();await page.locator('#song-script-upload').setInputFiles({name:'loop.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});await page.locator('#files-close').click();
 await page.locator('#play').click();await page.waitForTimeout(scriptSeconds(source)*1800);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.locator('#play').click();
});
for(const [name,meter,tempoUnit] of cases.filter(([name])=>['3/8','7/8','9/8','12/8'].includes(name)))test('native pad quarter-grid buffers roundtrip without relaxing legacy validation: '+name,async({page})=>{
 const source=fixture(meter,tempoUnit);await page.goto('/de/');await page.locator('#files-open').click();
 await page.locator('#song-script-upload').setInputFiles({name:'native.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
 const wait=page.waitForEvent('download');await page.locator('#json-export').click();const raw=await readFile((await(await wait).path())!,'utf8');
 const settings=decodeSettings(raw)!;expect(settings?.songScript).toEqual(source);expect(settings.pad?.beats).toBe(quartersPerBar(source));expect(settings.pad?.hits[0]).toHaveLength(quartersPerBar(source)*8);
 const legacy=JSON.parse(raw);delete legacy.songScript;expect(decodeSettings(JSON.stringify(legacy))).toBeNull();
 await page.locator('#json-file').setInputFiles({name:'restored.json',mimeType:'application/json',buffer:Buffer.from(raw)});await expect(page.locator('#meter-value')).toHaveText(name);
 await page.locator('#song-script-leave').click();await expect(page.locator('#meter-value')).toHaveText('4/4');
});
