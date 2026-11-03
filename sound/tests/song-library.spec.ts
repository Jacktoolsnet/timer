import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import catalog from '../public/library/catalog.json' with {type:'json'};
import {songLibrary,libraryStyles,libraryCopy} from '../src/lib/song-library';
import preview from '../public/examples/coffeehouse-chopin-prelude-a.preview.song.json' with {type:'json'};
import {decodeSongScript,scriptScore} from '../src/lib/song-script';
import {videoCreditsForSong,songRightsText} from '../src/lib/video-credits';
async function music(page:any,lang='de'){
 await page.goto('/'+lang+'/');
 await page.locator('#animation-settings-open').click();
 await page.locator('[data-animation-open=music]').click();
}
test('catalog: exactly three v3 productions per initial style, valid deterministic scores and mandatory credits',async()=>{
 expect(catalog).toHaveLength(12);expect(new Set(catalog.map(s=>s.id)).size).toBe(12);
 for(const style of ['classical','house','jazz','lofi'])expect(catalog.filter(s=>s.style===style)).toHaveLength(3);
 for(const entry of catalog){
  const song=decodeSongScript(await readFile(new URL('../public'+entry.path,import.meta.url),'utf8'));
  expect(song,entry.id).not.toBeNull();expect(song!.version).toBe(3);expect(song!.style).toBe(entry.style);expect(song!.loop).toBe(false);
  for(const scene of song!.scenes)for(const part of scene.parts){
   const score=scriptScore(part,scene.variation??0,song!.seed,song!.version===3?song!.meter:undefined);
   expect(score).toEqual(scriptScore(part,scene.variation??0,song!.seed,song!.version===3?song!.meter:undefined));
  }
  const credits=videoCreditsForSong(song!,{enabled:false,text:''},'en');
  expect(credits.enabled).toBe(true);expect(credits.text).toBe(songRightsText(song!,'en'));expect(credits.text).toContain(song!.rights!.source);
 }
});
test('opening a sibling folder does not change style/music; keyboard dismiss restores focus',async({page})=>{
 await music(page);expect(await page.locator('[data-library-open]').count()).toBe(5);
 const selected=await page.locator('[data-style-preset][aria-pressed=true]').getAttribute('data-style-preset');
 const opener=page.locator('[data-library-open=house]');await opener.focus();await page.keyboard.press('Enter');
 await expect(page.locator('#song-library-dialog')).toBeVisible();
 await expect(page.locator('[data-library-section=house] [data-library-song]')).toHaveCount(3);
 await expect(page.locator('[data-library-section=classical]')).toBeHidden();
 await expect(page.locator('[data-style-preset][aria-pressed=true]')).toHaveAttribute('data-style-preset',selected!);
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.keyboard.press('Escape');await expect(page.locator('#song-library-dialog')).not.toBeVisible();await expect(opener).toBeFocused();
});
test('all library songs and previews load their source, start playback and expose rights; Random returns to generator',async({page})=>{
 await music(page);
 for(const entry of songLibrary){
  await page.locator(`[data-library-open=${entry.style}]`).click();
  await page.locator(`[data-library-song=${entry.id}]`).click();
  await expect(page.locator('#song-library-dialog')).not.toBeVisible();
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
  const loaded=decodeSongScript(await page.locator('#song-script-text').inputValue());
  expect(loaded?.style).toBe(entry.style);expect(loaded?.rights?.composition).toContain(entry.composer);
  await expect(page.locator('#video-song-rights-text')).toContainText(loaded!.rights!.license);
  await expect(page.locator('#recording-random')).toBeDisabled();
 }
 await page.locator('[data-library-open=house]').click();await page.locator('[data-library-random=house]').click();
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#script-now')).toBeHidden();
 await expect(page.locator('[data-style-preset=house]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#video-song-rights')).toBeHidden();
});
for(const lang of ['de','en','es','fr'] as const)test('Coffeehouse folder exposes its preview with exact source rights: '+lang,async({page})=>{
 expect(libraryStyles).toContain('coffeehouse');
 expect(songLibrary.filter(s=>s.style==='coffeehouse')).toHaveLength(1);
 await music(page,lang);
 const opener=page.locator('[data-library-open=coffeehouse]');
 await opener.focus();await page.keyboard.press('Enter');
 const section=page.locator('[data-library-section=coffeehouse]');
 await expect(section).toBeVisible();
 await expect(section.locator('[data-library-song]')).toHaveCount(1);
 await expect(section.locator('[data-library-preview]')).toContainText(libraryCopy[lang].preview);
 const row=section.locator('li').first();await row.locator('summary').click();
 await expect(row.locator('.library-rights')).toHaveText(Object.values(preview.rights).join('\n'));
 await expect(row.locator('.library-rights')).not.toContainText('Pachelbel');
 await expect(row.locator('a')).toHaveAttribute('href',preview.rights.source);
 await expect(section).not.toContainText('Schumann');await expect(section).not.toContainText('Brahms');
 await page.keyboard.press('Escape');await expect(opener).toBeFocused();
 await opener.click();await section.locator('[data-library-song]').click();
 await expect(page.locator('#song-library-dialog')).not.toBeVisible();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 expect(JSON.parse(await page.locator('#song-script-text').inputValue())).toEqual(preview);
 await expect(page.locator('[data-style-preset=coffeehouse]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#video-song-rights-text')).toContainText('Magnus Lewis-Smith');
 await expect(page.locator('#video-song-rights-text')).not.toContainText('Pachelbel');
 await opener.click();await section.locator('[data-library-random=coffeehouse]').click();
 await expect(page.locator('#video-song-rights')).toBeHidden();
 await expect(page.locator('#evolve')).toHaveAttribute('aria-pressed','true');
});
test('failed and cancelled fetches are atomic and retryable',async({page})=>{
 await music(page);
 await page.route('**/library/house-canon.song.json',route=>route.fulfill({status:503,body:'unavailable'}));
 await page.locator('[data-library-open=house]').click();await page.locator('[data-library-song=house-canon]').click();
 await expect(page.locator('#song-library-status')).toContainText('nicht geladen');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-style-preset=electronic]')).toHaveAttribute('aria-pressed','true');
 await page.unroute('**/library/house-canon.song.json');
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 await page.route('**/library/house-canon.song.json',async route=>{await gate;await route.continue().catch(()=>{});});
 await page.locator('[data-library-song=house-canon]').click();await expect(page.locator('[data-library-random=house]')).toBeDisabled();
 await page.locator('#song-library-close').click();release();
 await expect(page.locator('[data-library-open=house]')).toBeEnabled();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.unroute('**/library/house-canon.song.json');
 await page.locator('[data-library-open=house]').click();await page.locator('[data-library-song=house-canon]').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
});
for(const lang of ['de','en','es','fr'])test('localized library and visible provenance: '+lang,async({page})=>{
 await music(page,lang);await page.locator('[data-library-open=lofi]').click();
 await expect(page.locator('#song-library-hint')).not.toContainText('4/4');
 const row=page.locator('[data-library-section=lofi] li').first();await row.locator('summary').click();
 await expect(row.locator('details p').first()).toContainText('3/4');await expect(row.locator('details p').first()).not.toContainText('→ 4/4');await expect(row.locator('a')).toHaveAttribute('rel','noopener noreferrer');
 await expect(row.locator('a')).toHaveAttribute('href',/id=37$/);
 const overflow=await page.locator('#song-library-dialog').evaluate(el=>el.scrollWidth>el.clientWidth);expect(overflow).toBe(false);
});
test('library controls cannot replace a song during video capture',async({page})=>{
 await music(page);await page.locator('#files-open').click();test.skip(await page.locator('#video-record').isDisabled(),'No native MP4');
 const source=JSON.parse(await readFile(new URL('../public/library/house-canon.song.json',import.meta.url),'utf8'));
 source.scenes=source.scenes.slice(0,1);source.bpm=220;
 expect(decodeSongScript(JSON.stringify(source))).not.toBeNull();
 await page.locator('#song-script-upload').setInputFiles({name:'starter.song.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
 await page.locator('#video-length-mode input[value=song]').check();
 const download=page.waitForEvent('download');await page.locator('#video-record').click();
 await expect(page.locator('[data-library-open=house]')).toBeDisabled();await expect(page.locator('[data-library-song=house-canon]')).toBeDisabled();
 await expect(page.locator('[data-library-random=house]')).toBeDisabled();await download;
 await expect(page.locator('[data-library-open=house]')).toBeEnabled();
 const loaded=JSON.parse(await page.locator('#song-script-text').inputValue());expect(loaded.rights).toEqual(source.rights);
});
