import {test,expect,type Page} from '@playwright/test';
import {cloneRhythm,emptyRhythm,recordRhythmHit} from '../src/lib/tap-rhythm';
async function take(page:Page,key:string){
 await page.keyboard.press(key);await page.keyboard.press(key);await page.locator('#rhythm-done').click();
}
test('editing snapshots do not share mutable patterns or activity state',()=>{
 const rhythm=emptyRhythm(4);recordRhythmHit(rhythm,0,0);recordRhythmHit(rhythm,3,8);
 const copy=cloneRhythm(rhythm);recordRhythmHit(rhythm,5,0);rhythm.lastTap[8]=20;
 expect(copy.hits[0][5]).toBe(false);expect(copy.lastTap[8]).toBe(3);
 copy.hits[8].fill(false);expect(rhythm.hits[8][3]).toBe(true);
});
test('accidental Record again clears only the selected lane and Cancel restores the accepted music',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 await take(page,'Numpad7');await take(page,'Numpad8');
 const pad=page.locator('#drawing'),original=await pad.getAttribute('data-rhythm-pattern');
 await page.keyboard.press('Numpad7');await page.locator('#rhythm-record').click();
 await expect(pad).toHaveAttribute('data-rhythm-hits','1');
 await page.locator('#rhythm-cancel').click();
 await expect(pad).toHaveAttribute('data-rhythm-pattern',original!);
 await expect(pad).toHaveAttribute('data-music-level','1');await expect(pad).toHaveAttribute('data-selected-pad','');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
});
test('new hits, repeated draft resets and a pause/restart remain cancelable to the accepted take',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();await take(page,'Numpad7');
 const pad=page.locator('#drawing'),original=await pad.getAttribute('data-rhythm-pattern');
 await page.keyboard.press('Numpad9');await page.keyboard.press('Numpad9');
 await page.locator('#rhythm-record').click();await page.locator('#rhythm-record').click();await page.keyboard.press('Numpad9');
 await expect(pad).not.toHaveAttribute('data-rhythm-pattern',original!);
 await page.locator('#play').click();await page.locator('#play').click();await page.locator('#rhythm-cancel').click();
 await expect(pad).toHaveAttribute('data-rhythm-pattern',original!);
 await page.waitForTimeout(300);await expect(pad).toHaveAttribute('data-rhythm-pattern',original!);
});
test('Cancel restores the selected generated rhythm and prior orbit offset without altering other patterns',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>.9;});
 await page.goto('/de/');await page.locator('#random').click();
 const row=page.locator('[data-track="4"]'),phase=await row.getAttribute('data-phase');
 const original=await page.locator('.instrument .count').allTextContents();
 await page.locator('[data-pad-mode=rhythm]').click();await page.keyboard.press('Numpad5');await page.keyboard.press('Numpad5');
 await expect(row).toHaveAttribute('data-phase','0');await page.locator('#rhythm-cancel').click();
 await expect(row).toHaveAttribute('data-phase',phase!);
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','0');
 expect(await page.locator('.instrument .count').allTextContents()).toEqual(original);
});
test('unaccepted drafts never overwrite persisted music; Finish saves a chosen new part',async({page})=>{
 await page.goto('/de/');await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.locator('[data-pad-mode=rhythm]').click();await take(page,'Numpad7');
 const pad=page.locator('#drawing'),original=await pad.getAttribute('data-rhythm-pattern');
 const stored=()=>page.evaluate(()=>JSON.stringify(JSON.parse(localStorage.getItem('jacktools.sound.settings.v1')!).pad.hits));
 await expect.poll(stored).toBe(original);
 await page.keyboard.press('Numpad3');await page.keyboard.press('Numpad3');await expect.poll(stored).toBe(original);
 await page.reload();await expect(pad).toHaveAttribute('data-rhythm-pattern',original!);
 await expect(pad).toHaveAttribute('data-selected-pad','');await expect(pad).toHaveAttribute('data-music-level','1');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await take(page,'Numpad9');
 const replacement=await pad.getAttribute('data-rhythm-pattern');expect(replacement).not.toBe(original);
 await expect.poll(stored).toBe(replacement);
 await page.reload();await expect(pad).toHaveAttribute('data-rhythm-pattern',replacement!);
});
test('returning to Draw discards unaccepted edits and changing style clears stale undo state',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();
 await page.keyboard.press('Numpad7');await page.keyboard.press('Numpad7');
 await page.locator('[data-pad-mode=draw]').click();await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','0');
 await page.locator('[data-pad-mode=rhythm]').click();await expect(page.locator('#rhythm-cancel')).toBeDisabled();
 await take(page,'Numpad7');await page.locator('#play').click();await page.locator('#music-settings-open').click();await page.locator('[data-style-preset=jazz]').click();
 await expect(page.locator('#rhythm-cancel')).toBeDisabled();await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','0');
});
test('Record again discards only the draft; Cancel still returns to the last explicit acceptance',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();await take(page,'Numpad7');
 const pad=page.locator('#drawing'),accepted=await pad.getAttribute('data-rhythm-pattern');
 await page.keyboard.press('Numpad8');await page.keyboard.press('Numpad8');await page.locator('#rhythm-record').click();
 await page.keyboard.press('Numpad8');await page.locator('#rhythm-cancel').click();
 await expect(pad).toHaveAttribute('data-rhythm-pattern',accepted!);await expect(pad).toHaveAttribute('data-music-level','1');
});
