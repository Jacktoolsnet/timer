import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import reports from '../docs/coffeehouse-productions-report.json' with {type:'json'};
import {decodeSongScript,scriptScore} from '../src/lib/song-script';
import {scriptSeconds} from '../src/lib/song-meter';
import {validScore} from '../src/lib/note-score';

const additions=reports.filter(r=>r.entry.id!=='coffeehouse-chopin-prelude-a');
const load=async(path:string)=>decodeSongScript(await readFile(new URL('../public'+path,import.meta.url),'utf8'))!;
function source(name:string){
 return JSON.parse(execFileSync('python3',['-B','-c',[
  'import sys,json,pathlib',"sys.path.insert(0,'scripts')",'from score_midi import read_score',
  `s=read_score(pathlib.Path('scripts/scores/${name}'))`,'print(json.dumps(s))'
 ].join('\n')],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
}

test('both new productions and their overlay entries regenerate without changing Chopin or the original catalog',()=>{
 execFileSync('python3',['-B','-c',[
  'import sys,json,importlib.util,pathlib,tempfile',"sys.path.insert(0,'scripts')",
  "spec=importlib.util.spec_from_file_location('preview','scripts/build-coffeehouse-preview.py')",
  'm=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)',
  'productions=m.build_all()',
  'for song,report in productions:',
  " path=pathlib.Path('public')/report['entry']['path'].lstrip('/')",
  " assert json.dumps(song,ensure_ascii=False,indent=2)+'\\n'==path.read_text(),path",
  "assert json.dumps([r for _,r in productions],ensure_ascii=False,indent=2)+'\\n'==pathlib.Path('docs/coffeehouse-productions-report.json').read_text()",
  'module=m.production;original=module.OUT',
  "original=pathlib.Path('public/library')",
  'with tempfile.TemporaryDirectory() as directory:',
  ' module.OUT=pathlib.Path(directory);module.main()',
  ' for output in module.OUT.iterdir():',
  '  assert output.read_bytes()==(original/output.name).read_bytes(),output.name'
 ].join('\n')],{cwd:new URL('..',import.meta.url)});
});

test('Schumann performs both complete repeated sections in all four voices, without truncating ties',()=>{
 const base=source('schumann-foreign.mid'),performed=source('schumann-foreign.performance.mid');
 expect(base.end).toBe(44);expect(performed.end).toBe(88);
 expect(base.tracks.map((t:any)=>t.notes.length)).toEqual([58,129,47,6]);
 expect(performed.tracks.map((t:any)=>t.notes.length)).toEqual([116,258,94,12]);
 base.tracks.forEach((track:any,i:number)=>{
  const expected:number[][]=[];
  for(const [from,to,destination] of [[0,16,0],[0,16,16],[16,44,32],[16,44,60]]){
   track.notes.filter((n:number[])=>n[0]>=from&&n[0]<to).forEach(([a,d,p,v]:number[])=>expected.push([a-from+destination,d,p,v]));
  }
  expect(performed.tracks[i].notes.length).toBe(expected.length);
  expected.forEach((n,index)=>n.forEach((v,j)=>expect(performed.tracks[i].notes[index][j]).toBeCloseTo(v,9)));
 });
});

for(const item of additions){
 const schumann=item.entry.id.includes('schumann');
 test('complete native-meter score, preserved source events and sounding register: '+item.entry.id,async()=>{
  const song=await load(item.entry.path);expect(song).not.toBeNull();
  if(song.version!==3)throw Error('Expected v3');
  expect(song.style).toBe('coffeehouse');expect(song.loop).toBe(false);
  expect(song.bpm).toBe(schumann?72:104);
  expect(song.meter).toEqual({numerator:schumann?2:3,denominator:4,groups:schumann?[1,1]:[1,1,1]});
  expect(song.scenes.reduce((n,s)=>n+s.bars,0)).toBe(44);
  expect(scriptSeconds(song)).toBeCloseTo(schumann?88*60/72:132*60/104,8);
  expect(song.tracks.map(t=>t.instrument)).toEqual(['piano','epiano','doublebass']);
  expect(song.rights.arrangement).toContain(schumann?'Ying-Chun Liu':'Brian D. Rude');
  expect(item.production.sourceNotes).toBe(schumann?480:720);
  const bytes=await readFile(new URL('../scripts/scores/'+item.production.source,import.meta.url));
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(item.production.sha256);
  const score=source(item.production.source);
  const expected:{track:string,at:number,duration:number,pitch:number}[]=[];
  const window=song.meter.numerator*2;
  score.tracks.forEach((track:any,ti:number)=>track.notes.forEach(([a,d,p]:number[])=>{
   const id=ti===0?'piano':schumann?(ti===2?'upright':'warmth'):(p<48?'upright':'warmth');
   for(let i=0;i<song.scenes.length;i++){
    const start=i*window,stop=start+window,onset=Math.max(a,start),end=Math.min(a+d,stop);
    if(end>onset+1e-8)expected.push({track:id,at:onset,duration:(end-onset)*.97,pitch:p});
   }
  }));
  const actual=song.scenes.flatMap((scene,i)=>scene.parts.flatMap(part=>part.notes.map(n=>({track:part.track,at:i*window+n.at,duration:n.duration,pitch:Number(n.pitch)+60-(part.track==='upright'?24:0)}))));
  const order=(a:any,b:any)=>a.at-b.at||a.track.localeCompare(b.track)||a.pitch-b.pitch;
  actual.sort(order);expected.sort(order);expect(actual.length).toBe(expected.length);
  expect(actual.length).toBe(item.production.sourceNotes+item.production.boundaryRearticulations);
  actual.forEach((n,i)=>{
   expect(n.track).toBe(expected[i].track);expect(n.pitch).toBe(expected[i].pitch);
   expect(n.at).toBeCloseTo(expected[i].at,5);expect(n.duration).toBeCloseTo(expected[i].duration,5);
  });
  for(const scene of song.scenes)for(const part of scene.parts)expect(validScore(scriptScore(part,0,song.seed,song.meter))).toBe(true);
 });

 for(const section of ['opening','climax','ending'])test('rendered WAV signal and headroom: '+item.entry.id+' '+section,async({page},info)=>{
  const song=await load(item.entry.path);
  const dense=[...song.scenes].sort((a,b)=>b.parts.reduce((n,p)=>n+p.notes.length,0)-a.parts.reduce((n,p)=>n+p.notes.length,0))[0];
  const scene=section==='opening'?song.scenes[0]:section==='ending'?song.scenes.at(-1)!:dense;
  const excerpt={...song,loop:true,scenes:[scene]};
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/de/');await page.locator('#files-open').click();
  await page.locator('#song-script-upload').setInputFiles({name:'coffeehouse.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(excerpt))});
  await expect(page.locator('#song-script-status')).toContainText('Geladen');
  await page.locator('#wav-record').click();await page.waitForTimeout(4000);
  const pending=page.waitForEvent('download');await page.locator('#wav-stop').click();
  const bytes=await readFile((await (await pending).path())!);
  let peak=0,sum=0,count=0,clipped=0;
  for(let i=44;i<bytes.length;i+=2){const v=bytes.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));sum+=v*v;count++;if(Math.abs(v)>.985)clipped++;}
  const rms=Math.sqrt(sum/count);
  expect(peak).toBeGreaterThan(.001);expect(peak).toBeLessThan(.98);expect(rms).toBeGreaterThan(.0001);expect(clipped).toBe(0);expect(errors).toEqual([]);
  await info.attach(section+'.wav',{body:bytes,contentType:'audio/wav'});
  await info.attach('levels.json',{body:JSON.stringify({peak,rms,clipped}),contentType:'application/json'});
 });

 test('overlay playback exports the entire song naturally: '+item.entry.id,async({page},info)=>{
  test.setTimeout(110000);
  await page.goto('/de/');await page.locator('#music-settings-open').click();
  await page.locator('[data-library-open=coffeehouse]').click();
  await page.locator(`[data-library-song=${item.entry.id}]`).click();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  const loaded=JSON.parse(await page.locator('#song-script-text').inputValue());
  expect(loaded).toEqual(JSON.parse(await readFile(new URL('../public'+item.entry.path,import.meta.url),'utf8')));
  await page.locator('#play').click();await page.locator('#files-open').click();
  const jsonDownload=page.waitForEvent('download');await page.locator('#song-script-export').click();
  expect(JSON.parse(await readFile((await (await jsonDownload).path())!,'utf8'))).toEqual(loaded);
  const download=page.waitForEvent('download',{timeout:95000});await page.locator('#wav-record').click();
  const bytes=await readFile((await (await download).path())!);
  const seconds=(bytes.length-44)/bytes.readUInt32LE(28);
  expect(seconds).toBeGreaterThan(item.production.durationSeconds-1);expect(seconds).toBeLessThan(item.production.durationSeconds+3);
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
  await info.attach(item.entry.id+'.wav',{body:bytes,contentType:'audio/wav'});
 });
}
