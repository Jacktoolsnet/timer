import {test,expect} from '@playwright/test';
import {cloneRhythm,emptyRhythm,recordRhythmHit} from '../src/lib/tap-rhythm';

test('editing snapshots do not share mutable patterns or activity state',()=>{
 const rhythm=emptyRhythm(4);recordRhythmHit(rhythm,0,0);recordRhythmHit(rhythm,3,8);
 const copy=cloneRhythm(rhythm);recordRhythmHit(rhythm,5,0);rhythm.lastTap[8]=20;
 expect(copy.hits[0][5]).toBe(false);expect(copy.lastTap[8]).toBe(3);
 copy.hits[8].fill(false);expect(rhythm.hits[8][3]).toBe(true);
});

test('accidental Record again can be cancelled immediately without changing the retained rhythm',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 await page.keyboard.press('Numpad7');await page.keyboard.press('Numpad8');await page.locator('#rhythm-done').click();
 const pad=page.locator('#drawing'),original=await pad.getAttribute('data-rhythm-pattern');
 await page.locator('#rhythm-record').click();await expect(pad).toHaveAttribute('data-rhythm-hits','0');
 await expect(page.locator('#rhythm-cancel')).toBeEnabled();
 await page.locator('#rhythm-cancel').click();
 await expect(pad).toHaveAttribute('data-rhythm-pattern',original!);await expect(pad).toHaveAttribute('data-music-level','1');
 await expect(page.locator('#rhythm-cancel')).toBeDisabled();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 expect(errors).toEqual([]);
});

test('Cancel restores the previous take after new hits, repeated resets and a pause/restart',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad7');
 await page.locator('#rhythm-done').click();
 const pad=page.locator('#drawing'),original=await pad.getAttribute('data-rhythm-pattern');
 await page.locator('#rhythm-record').click();await page.keyboard.press('Numpad3');
 const beforeLastReset=await pad.getAttribute('data-rhythm-pattern');
 await page.locator('#rhythm-record').click();await page.locator('#rhythm-record').click();await page.keyboard.press('Numpad9');
 await expect(pad).not.toHaveAttribute('data-rhythm-pattern',original!);
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('#play').click();await page.locator('#rhythm-cancel').click();
 await expect(pad).toHaveAttribute('data-rhythm-pattern',beforeLastReset!);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.waitForTimeout(300);await expect(pad).toHaveAttribute('data-rhythm-pattern',beforeLastReset!);
});

test('Cancel also restores untouched generated rhythms and prior orbit offsets',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>.9;});
 await page.goto('/de/');await page.locator('#random').click();
 const row=page.locator('[data-track="4"]'),phase=await row.getAttribute('data-phase');
 const original=await page.locator('.instrument .count').allTextContents();
 await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad5');
 await expect(row).toHaveAttribute('data-phase','0');
 await page.locator('#rhythm-cancel').click();
 await expect(row).toHaveAttribute('data-phase',phase!);await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','0');
 expect(await page.locator('.instrument .count').allTextContents()).toEqual(original);
 await expect(page.locator('#drawing')).toHaveAttribute('data-music-level','1');
});

test('unaccepted replacement never overwrites persisted music; Finish saves the new take',async({page})=>{
 await page.goto('/de/');await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad7');await page.locator('#rhythm-done').click();
 const pad=page.locator('#drawing'),original=await pad.getAttribute('data-rhythm-pattern');
 const stored=()=>page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('jacktools.sound.settings.v1')!).pad.hits));
 await expect.poll(stored).toBe(original);
 await page.locator('#rhythm-record').click();await page.keyboard.press('Numpad3');await page.waitForTimeout(350);
 await expect.poll(stored).toBe(original);
 await page.reload();await expect(pad).toHaveAttribute('data-rhythm-pattern',original!);await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('#rhythm-record').click();await page.keyboard.press('Numpad9');await page.locator('#rhythm-done').click();
 const replacement=await pad.getAttribute('data-rhythm-pattern');expect(replacement).not.toBe(original);
 await expect.poll(stored).toBe(replacement);
 await page.reload();await expect(pad).toHaveAttribute('data-rhythm-pattern',replacement!);
});

test('returning to Draw accepts edits and a new style never revives stale undo history',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad7');
 await page.locator('[data-pad-mode=draw]').click();await page.locator('[data-pad-mode=rhythm]').click();
 const pad=page.locator('#drawing'),accepted=await pad.getAttribute('data-rhythm-pattern');
 await page.locator('#rhythm-record').click();await page.locator('#rhythm-cancel').click();await expect(pad).toHaveAttribute('data-rhythm-pattern',accepted!);
 await page.locator('#play').click();await page.locator('[data-style-preset=jazz]').click();
 await expect(page.locator('#rhythm-cancel')).toBeDisabled();await expect(pad).toHaveAttribute('data-rhythm-hits','0');
});


test('Record again keeps the last audible take even when Finish was never pressed',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 await page.keyboard.press('Numpad7');await page.keyboard.press('Numpad8');
 const pad=page.locator('#drawing'),previous=await pad.getAttribute('data-rhythm-pattern');
 await page.locator('#rhythm-record').click();await page.keyboard.press('Numpad3');
 await page.locator('#rhythm-cancel').click();
 await expect(pad).toHaveAttribute('data-rhythm-pattern',previous!);await expect(pad).toHaveAttribute('data-music-level','1');
});
