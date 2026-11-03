import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import preview from '../public/examples/coffeehouse-chopin-prelude-a.preview.song.json' with {type:'json'};
import report from '../docs/coffeehouse-preview-report.json' with {type:'json'};
import catalog from '../public/library/catalog.json' with {type:'json'};
import {decodeSongScript,scriptScore} from '../src/lib/song-script';
import {scriptSeconds} from '../src/lib/song-meter';
import {validScore} from '../src/lib/note-score';

test('complete short Prelude: native meter, pickup, ending, credits and no invented repeats/drums',()=>{
 const song=decodeSongScript(JSON.stringify(preview));expect(song).not.toBeNull();
 if(!song||song.version!==3)throw Error('Expected v3');
 expect(song.meter).toEqual({numerator:3,denominator:4,groups:[1,1,1]});
 expect(song.tempoUnit).toEqual({denominator:4,dotted:false});
 expect(song.bpm).toBe(72);expect(scriptSeconds(song)).toBe(45);
 expect(song.scenes.map(s=>s.bars)).toEqual([2,2,2,2,2,2,2,2,2]);
 expect(song.tracks.map(t=>t.instrument)).toEqual(['piano','epiano','doublebass']);
 expect(song.scenes[0].parts.find(p=>p.track==='piano')!.notes[0]).toMatchObject({at:2,pitch:4});
 expect(song.scenes.at(-1)!.parts.flatMap(p=>p.notes).map(n=>n.pitch).sort((a,b)=>Number(a)-Number(b))).toEqual([-3,4,9,13,21]);
 for(const scene of song.scenes)for(const part of scene.parts)expect(validScore(scriptScore(part,0,song.seed,song.meter))).toBe(true);
 expect(report.production.sourceNotes).toBe(168);expect(report.production.transferredSourceNotes).toBe(168);
 expect(report.production.outputNotes).toBe(170);expect(report.production.boundaryRearticulations).toBe(2);
 expect(song.rights.arrangement).toContain('Magnus Lewis-Smith');
 expect(song.rights.arrangement).toContain('Edition Peters');
 expect(song.rights.arrangement).not.toContain('pending');
 expect(catalog.some(e=>e.id==='coffeehouse-chopin-prelude-a')).toBe(false);
});

test('every helper-score event survives with exact sounding register and onset; tied boundary notes are accounted for',()=>{
 const source=JSON.parse(execFileSync('python3',['-B','-c',[
  'import sys,json,pathlib',"sys.path.insert(0,'scripts')",'from score_midi import read_score',
  "s=read_score(pathlib.Path('scripts/scores/chopin-a.mid'))",'print(json.dumps(s))'
 ].join('\n')],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
 expect(source.end).toBe(49);expect(source.tracks.map((t:any)=>t.notes.length)).toEqual([102,66]);
 // Independent harmonic landmarks: B-sharp/D-sharp, A-sharp dominant, deep A/B bass.
 expect(source.tracks[0].notes.filter((n:number[])=>n[0]===7).map((n:number[])=>n[2])).toEqual([72,75]);
 expect(source.tracks[0].notes.filter((n:number[])=>n[0]===34).map((n:number[])=>n[2])).toEqual([70,73,76,82,85]);
 expect(source.tracks[1].notes.filter((n:number[])=>n[0]===19||n[0]===37).map((n:number[])=>n[2])).toEqual([33,35]);
 const expected:{track:string,at:number,duration:number,pitch:number}[]=[];
 source.tracks.forEach((track:any,index:number)=>track.notes.forEach(([a,d,p]:number[])=>{
  const id=index===0?'piano':p<48?'upright':'warmth';
  for(let scene=0;scene<9;scene++){
   const begin=scene*6,finish=begin+6,onset=Math.max(a+2,begin),end=Math.min(a+2+d,finish);
   if(end>onset)expected.push({track:id,at:Number(onset.toFixed(6)),duration:Number(((end-onset)*.97).toFixed(6)),pitch:p});
  }
 }));
 const actual=preview.scenes.flatMap((s,i)=>s.parts.flatMap(part=>part.notes.map(n=>({track:part.track,at:i*6+n.at,duration:n.duration,pitch:n.pitch+60-(part.track==='upright'?24:0)}))));
 const order=(a:any,b:any)=>a.at-b.at||a.track.localeCompare(b.track)||a.pitch-b.pitch;
 expect(actual.sort(order)).toEqual(expected.sort(order));
});

test('preview rebuild is byte-for-byte deterministic and source digest is pinned',async()=>{
 const source=await readFile(new URL('../scripts/scores/chopin-a.mid',import.meta.url));
 expect(createHash('sha256').update(source).digest('hex')).toBe(report.production.sha256);
 execFileSync('python3',['-B','-c',[
  'import sys,json,importlib.util,pathlib',"sys.path.insert(0,'scripts')",
  "s=importlib.util.spec_from_file_location('preview','scripts/build-coffeehouse-preview.py')",
  'm=importlib.util.module_from_spec(s);s.loader.exec_module(m)','song,report=m.build()',
  "assert json.dumps(song,ensure_ascii=False,indent=2)+'\\n'==pathlib.Path('public/examples/coffeehouse-chopin-prelude-a.preview.song.json').read_text()",
  "assert json.dumps(report,ensure_ascii=False,indent=2)+'\\n'==pathlib.Path('docs/coffeehouse-preview-report.json').read_text()"
  ,"assert json.dumps([r['entry'] for _,r in m.build_all()],ensure_ascii=False,indent=2)+'\\n'==pathlib.Path('public/library/preview-catalog.json').read_text()"
 ].join('\n')],{cwd:new URL('..',import.meta.url)});
});

for(const section of ['opening','climax','ending'] as const)test('real WAV import/render has signal and headroom: '+section,async({page},info)=>{
 const dense=[...preview.scenes].sort((a,b)=>b.parts.reduce((n,p)=>n+p.notes.length,0)-a.parts.reduce((n,p)=>n+p.notes.length,0))[0];
 const scene=section==='opening'?preview.scenes[0]:section==='ending'?preview.scenes.at(-1)!:dense;
 const excerpt={...preview,loop:true,scenes:[scene]};
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('#files-open').click();
 await page.locator('#song-script-upload').setInputFiles({name:'coffeehouse.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(excerpt))});
 await expect(page.locator('#song-script-status')).toContainText('Geladen');
 await page.locator('#wav-record').click();await page.waitForTimeout(4000);
 const pending=page.waitForEvent('download');await page.locator('#wav-stop').click();
 const bytes=await readFile((await (await pending).path())!);
 let peak=0,sum=0,count=0,clipped=0;
 for(let i=44;i<bytes.length;i+=2){const v=bytes.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));sum+=v*v;count++;if(Math.abs(v)>.985)clipped++;}
 const rms=Math.sqrt(sum/count);expect(peak).toBeGreaterThan(.001);expect(peak).toBeLessThan(.98);expect(rms).toBeGreaterThan(.0001);expect(clipped).toBe(0);expect(errors).toEqual([]);
 await info.attach(section+'.wav',{body:bytes,contentType:'audio/wav'});
 await info.attach(section+'-levels.json',{body:JSON.stringify({peak,rms,clipped}),contentType:'application/json'});
});

test('complete preview imports, exports unchanged JSON and finishes its full WAV naturally',async({page},info)=>{
 test.setTimeout(75000);
 await page.goto('/de/');await page.locator('#files-open').click();
 await page.locator('#song-script-upload').setInputFiles({name:'coffeehouse.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(preview))});
 await expect(page.locator('#song-script-status')).toContainText('Geladen');
 const jsonDownload=page.waitForEvent('download');await page.locator('#song-script-export').click();
 expect(JSON.parse(await readFile((await (await jsonDownload).path())!,'utf8'))).toEqual(preview);
 const wavDownload=page.waitForEvent('download',{timeout:65000});
 await page.locator('#wav-record').click();
 const bytes=await readFile((await (await wavDownload).path())!);
 const seconds=(bytes.length-44)/bytes.readUInt32LE(28);
 expect(seconds).toBeGreaterThan(44);expect(seconds).toBeLessThan(48);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await info.attach('complete-chopin-coffeehouse.wav',{body:bytes,contentType:'audio/wav'});
});
