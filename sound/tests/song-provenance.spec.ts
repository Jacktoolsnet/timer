import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {songLibrary} from '../src/lib/song-library';
import {decodeSongScript} from '../src/lib/song-script';
import {songRightsText,videoCreditsForSong} from '../src/lib/video-credits';

const workflow=/pending|unverified|not approved|not an approved|noch offen|noch zu prüfen|nicht abschließend geprüft|Prüfung.*fehl|reconciliation pending/i;

test('all bundled metadata is factual provenance, while music and existing licence terms are preserved',()=>{
 execFileSync('python3',['-B','-c',[
  'import json,hashlib,pathlib',
  "audit=json.loads(pathlib.Path('docs/song-rights-display-audit.json').read_text())",
  "for row in audit['songs']:",
  " song=json.loads((pathlib.Path('public').parent/row['path']).read_text())",
  " rights=song.pop('rights')",
  " assert hashlib.sha256(json.dumps(song,sort_keys=True,ensure_ascii=False).encode()).hexdigest()==row['musicSha256'],row['path']",
  " previous=row['previousRights']",
  " if 'CC BY' in previous['license']: assert rights['license']==previous['license']",
  " text=rights['license'].lower()",
  " assert 'no separate usage license granted' in text or 'no separate license granted' in text or 'keine gesonderte nutzungslizenz erteilt' in text"
 ].join('\n')],{cwd:new URL('..',import.meta.url)});
});

test('all library songs have composer dates, source, synthesis and mandatory non-workflow video credits',async()=>{
 for(const entry of songLibrary){
  const song=decodeSongScript(await readFile(new URL('../public'+entry.path,import.meta.url),'utf8'))!;
  expect(song).not.toBeNull();
  expect(song.rights!.composition).toMatch(/\d{4}–\d{4}/);
  expect(song.rights!.composition).toMatch(/original.*public domain/i);
  expect(song.rights!.recording).toContain('jacktools Sound');
  expect(song.rights!.recording).toContain('synthetic instruments');
  expect(song.rights!.source).toMatch(/^https:\/\//);
  for(const lang of ['de','en','es','fr'] as const){
   expect(Object.values(song.rights!).join('\n')).not.toMatch(workflow);
   expect(entry.scopeLabel[lang]).not.toMatch(workflow);
   const text=songRightsText(song,lang);expect(text).not.toMatch(workflow);
   expect(videoCreditsForSong(song,{enabled:false,text:''},lang)).toEqual({enabled:true,text});
  }
 }
});

for(const lang of ['de','en','es','fr'])test('every folder shows provenance without internal review notices: '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await page.locator('#music-settings-open').click();
 for(const style of ['classical','house','jazz','lofi','coffeehouse']){
  await page.locator(`[data-library-open=${style}]`).click();
  const section=page.locator(`[data-library-section=${style}]`);
  for(const row of await section.locator('li').all()){
   await row.locator('summary').click();
   await expect(row).not.toContainText(workflow);
   await expect(row.locator('.library-rights')).toContainText('synthetic instruments');
   await expect(row.locator('a')).toHaveAttribute('rel','noopener noreferrer');
  }
  await page.locator('#song-library-close').click();
 }
});
