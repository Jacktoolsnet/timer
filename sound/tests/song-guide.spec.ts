import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {decodeSongScript,scriptScore} from '../src/lib/song-script';
import {unitsPerPattern,scriptSeconds} from '../src/lib/song-meter';
import {instrumentIds} from '../src/lib/instruments';
import {styleIds} from '../src/lib/presets';
import {validScore} from '../src/lib/note-score';

const readGuide=()=>readFile(new URL('../public/song-script-guide.md',import.meta.url),'utf8');
const examples=(guide:string)=>[...guide.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m=>JSON.parse(m[1]));

test('every complete JSON example in the downloaded AI guide imports and compiles',async()=>{
 const guide=await readGuide();const scripts=examples(guide);expect(scripts).toHaveLength(2);
 for(const raw of scripts){
  const song=decodeSongScript(JSON.stringify(raw));expect(song).not.toBeNull();
  if(!song||song.version!==3)throw Error('Guide must author v3');
  for(const scene of song.scenes)for(const part of scene.parts)expect(validScore(scriptScore(part,0,song.seed,song.meter))).toBe(true);
 }
 const six=decodeSongScript(JSON.stringify(scripts[1]))!;
 expect(unitsPerPattern(six)).toBe(12);expect(scriptSeconds(six)).toBe(4);
 expect(scriptSeconds({...six,version:3,meter:{numerator:6,denominator:8,groups:[3,3]},tempoUnit:{denominator:4,dotted:false}})).toBe(6);
 expect(guide).not.toContain('curated studies deliberately remain v2');
 expect(guide).toMatch(/register\s+compensation/);
 expect(guide).toContain('cross-scene tie');
});

test('guide instrument/style lists match current importer IDs, not merely generator presets',async()=>{
 const guide=await readGuide();
 const instruments=guide.match(/Instrument IDs: ([^\n]+)\./)![1].split(', ');
 const styles=guide.match(/- `style`: one of ([^.]+)\./)![1].split(', ');
 expect(instruments.sort()).toEqual([...instrumentIds].sort());
 expect(styles.sort()).toEqual(styleIds.filter(id=>!['slowwaltz','tango'].includes(id)).sort());
 const base=examples(guide)[0];
 for(const style of styleIds)expect(decodeSongScript(JSON.stringify({...base,style}))!==null).toBe(!['slowwaltz','tango'].includes(style));
});

test('every documented meter table row and all 48 bounded meter combinations are accepted',async()=>{
 const guide=await readGuide(),base=examples(guide)[0];
 const fixture=(numerator:number,denominator:number,groups:number[],unit:number,dotted:boolean)=>({
  ...base,bpm:60,meter:{numerator,denominator,groups},tempoUnit:{denominator:unit,dotted},
  scenes:[{name:'Two native bars',bars:2,parts:[{track:'keys',notes:[
   {at:0,duration:.1,pitch:0,velocity:.6},{at:numerator,duration:.1,pitch:4,velocity:.6}
  ]}]}]
 });
 const rows=[...guide.matchAll(/^\| (\d+)\/(\d+) \| (\[[\d,]+\]) \| (\d+) \| (true|false) \| (\d+) \|$/gm)];
 expect(rows).toHaveLength(15);
 for(const [,n,d,g,u,dotted,window] of rows){
  const raw=fixture(+n,+d,JSON.parse(g),+u,dotted==='true'),song=decodeSongScript(JSON.stringify(raw));
  expect(song,`${n}/${d}`).not.toBeNull();expect(unitsPerPattern(song!)).toBe(+window);
  expect(scriptSeconds(song!)).toBeCloseTo(2*(+n*4/+d)*60/(60*(4/+u)*(dotted==='true'?1.5:1)),10);
 }
 for(let numerator=1;numerator<=12;numerator++)for(const denominator of [2,4,8,16]){
  expect(decodeSongScript(JSON.stringify(fixture(numerator,denominator,Array(numerator).fill(1),denominator,false)))).not.toBeNull();
 }
 const raw=fixture(6,8,[3,3],4,true);
 expect(decodeSongScript(JSON.stringify({...raw,scenes:[{...raw.scenes[0],bars:1}]}))).toBeNull();
 expect(decodeSongScript(JSON.stringify({...raw,scenes:[{...raw.scenes[0],meter:raw.meter}]}))).toBeNull();
 expect(decodeSongScript(JSON.stringify({...raw,swing:.2}))).toBeNull();
});

for(const lang of ['de','en','es','fr'])test('AI guide download is current and its 6/8 example plays on the native clock: '+lang,async({page})=>{
 const guide=await readGuide();
 await page.goto('/'+lang+'/');await page.locator('#files-open').click();
 const pending=page.waitForEvent('download');await page.locator('a[href="/song-script-guide.md"]').click();
 const downloaded=await readFile((await (await pending).path())!,'utf8');expect(downloaded).toBe(guide);
 const song=examples(downloaded)[1];
 await page.locator('#song-script-upload').setInputFiles({name:'guide-six-eight.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(song))});
 await expect(page.locator('#song-script-text')).toHaveValue(JSON.stringify(song,null,2));
 await expect(page.locator('#meter-value')).toHaveText('6/8');
 await expect(page.locator('#sound-app')).toHaveAttribute('data-steps','12');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('#files-close').click();
 const begin=Date.now();await page.locator('#play').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false',{timeout:6500});
 expect((Date.now()-begin)/1000).toBeGreaterThan(3.7);expect((Date.now()-begin)/1000).toBeLessThan(5.2);
});
