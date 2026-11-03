import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import catalog from '../public/library/catalog.json' with {type:'json'};
import report from '../public/library/production-report.json' with {type:'json'};
import {decodeSongScript,scriptScore} from '../src/lib/song-script';
import {scriptSeconds} from '../src/lib/song-meter';
import {validScore} from '../src/lib/note-score';
const load=async(path:string)=>decodeSongScript(await readFile(new URL('../public'+path,import.meta.url),'utf8'))!;
test('all productions are complete-source native-meter data, with bounded scores and exact timing',async()=>{
 for(const entry of catalog){
  const song=await load(entry.path);expect(song,entry.id).not.toBeNull();
  if(song.version!==3)throw Error('Expected v3');
  expect(song.meter.numerator+'/'+song.meter.denominator).toBe(entry.originalMeter);
  expect(song.scenes.reduce((n,s)=>n+s.bars,0)).toBe(entry.bars);
  expect(Math.round(scriptSeconds(song))).toBe(entry.durationSeconds);
  expect(entry.durationSeconds).toBeGreaterThan(100);
  expect(song.scenes.length).toBeGreaterThan(9);
  const production=report[entry.id as keyof typeof report];
  const source=await readFile(new URL('../scripts/scores/'+production.source,import.meta.url));
  expect(createHash('sha256').update(source).digest('hex')).toBe(production.sha256);
  const copies=entry.id==='house-canon'?3:entry.id==='house-ode'?2:1;
  expect(production.transferredSourceNotes).toBe(production.sourceNotes*copies);
  const notes=song.scenes.flatMap(s=>s.parts.flatMap(p=>p.notes));
  expect(notes.length).toBe(production.outputNotes);
  expect(notes.length).toBeGreaterThanOrEqual(production.transferredSourceNotes);
  for(const scene of song.scenes)for(const part of scene.parts){
   expect(validScore(scriptScore(part,0,song.seed,song.meter)),entry.id+': '+scene.name+': '+part.track).toBe(true);
  }
  expect(new Set(notes.map(n=>n.velocity)).size).toBeGreaterThan(12);
  expect(song.rights.license).toContain(entry.id==='classical-canon'?'CC BY 4.0':entry.id==='house-canon'?'CC BY 3.0':'Public Domain');
  expect(entry.scopeLabel.de).not.toContain('4/4');
 }
 const gymno=catalog.find(e=>e.id==='lofi-gymnopedie')!;expect(gymno.bars).toBe(78);
 expect((await load('/library/house-elise.song.json')).version).toBe(3);
});

test('first Canon retains every original four-part note, entrance, register and ending',async()=>{
 const song=await load('/library/classical-canon.song.json');
 if(song.version!==3)throw Error('Expected native score');
 expect(song.tracks.map(t=>[t.id,t.instrument])).toEqual([['violin1','strings'],['violin2','strings'],['violin3','strings'],['basso','cello']]);
 expect(song.bpm).toBe(55);expect(song.meter).toMatchObject({numerator:4,denominator:4});
 const source=JSON.parse(execFileSync('python3',['-B','-c',[
  'import sys,json,pathlib',
  "sys.path.insert(0,'scripts')",
  'from score_midi import read_score',
  "s=read_score(pathlib.Path('scripts/scores/canon-original.mid'))",
  "print(json.dumps([t['notes'] for t in s['tracks']]))"
 ].join('\n')],{cwd:new URL('..',import.meta.url),encoding:'utf8'})) as number[][][];
 for(let track=0;track<4;track++){
  const id=song.tracks[track].id;
  const actual=song.scenes.flatMap((scene,index)=>(scene.parts.find(p=>p.track===id)?.notes??[]).map(n=>[index*8+n.at,n.duration,Number(n.pitch)+60-(track===3?12:0)]));
  const expected=source[track];
  expect(actual.length).toBe(expected.length);
  for(let n=0;n<actual.length;n++){
   expect(actual[n][0]).toBeCloseTo(expected[n][0],6);
   expect(actual[n][2]).toBe(expected[n][2]);
   expect(actual[n][1]).toBeCloseTo(expected[n][1]*.97,5);
  }
 }
 const starts=song.tracks.map(t=>song.scenes.flatMap((s,i)=>(s.parts.find(p=>p.track===t.id)?.notes??[]).map(n=>i*8+n.at))[0]);
 expect(starts).toEqual([8,16,24,0]);
 expect(report['classical-canon'].boundaryRearticulations).toBe(0);
 expect(song.scenes.flatMap(s=>s.parts.flatMap(p=>p.notes))).toHaveLength(1956);
 expect(song.rights.arrangement).toContain('Michael Fischer v. Mollard');
 expect(song.rights.source).toMatch(/id=2047$/);
});

test('offline generator is byte-for-byte reproducible from vendored score inputs',async()=>{
 const paths=[...catalog.map(e=>'../public'+e.path),'../public/library/catalog.json','../public/library/production-report.json'];
 const before=await Promise.all(paths.map(async p=>createHash('sha256').update(await readFile(new URL(p,import.meta.url))).digest('hex')));
 execFileSync('python3',['-B','-c',[
  'import importlib.util,sys,tempfile,pathlib',
  "sys.path.insert(0,'scripts')",
  "spec=importlib.util.spec_from_file_location('production','scripts/build-song-library.py')",
  'm=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)',
  'original=m.OUT',
  'with tempfile.TemporaryDirectory() as folder:',
  ' m.OUT=pathlib.Path(folder);m.main()',
  ' for output in m.OUT.iterdir():',
  '  assert output.read_bytes()==(original/output.name).read_bytes(),output.name'
 ].join('\n')],{cwd:new URL('..',import.meta.url),timeout:30000});
 const after=await Promise.all(paths.map(async p=>createHash('sha256').update(await readFile(new URL(p,import.meta.url))).digest('hex')));
 expect(after).toEqual(before);
});
test('long v3 works remain bounded while legacy scene limits are unchanged',async()=>{
 const s=await load('/library/classical-nachtmusik.song.json');
 expect(s.scenes.length).toBe(96);expect(s.version).toBe(3);
 expect(decodeSongScript(JSON.stringify({...s,scenes:Array.from({length:257},()=>s.scenes[0])}))).toBeNull();
 const {meter,tempoUnit,...legacy}=s as any;expect(decodeSongScript(JSON.stringify({...legacy,version:2}))).toBeNull();
});
for(const entry of catalog)test('actual dense-section audio has signal and headroom: '+entry.id,async({page},info)=>{
 test.setTimeout(25000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const song=await load(entry.path);
 // Test the densest two-bar section, not just the often-silent introduction.
 const dense=[...song.scenes].sort((a,b)=>b.parts.reduce((n,p)=>n+p.notes.length,0)-a.parts.reduce((n,p)=>n+p.notes.length,0))[0];
 const excerpt={...song,title:'Production audio QA',loop:true,scenes:[dense]};
 await page.goto('/de/');await page.locator('#files-open').click();
 await page.locator('#song-script-upload').setInputFiles({name:'production.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(excerpt))});
 await expect(page.locator('#song-script-status')).toContainText('Geladen');
 await page.locator('#wav-record').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.waitForTimeout(3000);
 const pending=page.waitForEvent('download');await page.locator('#wav-stop').click();const download=await pending;
 const bytes=await readFile((await download.path())!);
 let peak=0,sum=0,clipped=0,count=0;
 for(let i=44;i<bytes.length;i+=2){const v=bytes.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));sum+=v*v;if(Math.abs(v)>.985)clipped++;count++;}
 const rms=Math.sqrt(sum/count);
 expect(peak).toBeGreaterThan(.001);expect(peak).toBeLessThan(.98);
 expect(rms).toBeGreaterThan(.0001);expect(clipped).toBe(0);expect(errors).toEqual([]);
 await info.attach(entry.id+'.wav',{body:bytes,contentType:'audio/wav'});
 await info.attach('audio-levels.json',{body:JSON.stringify({id:entry.id,scene:dense.name,peak,rms,clipped}),contentType:'application/json'});
});
