import {test,expect} from '@playwright/test';
import {instrumentGroups} from '../src/lib/instrument-picker';
import {instrumentIds} from '../src/lib/instruments';

test('instrument groups contain every supported voice exactly once',()=>{
 const ids=Object.values(instrumentGroups).flat();
 expect([...ids].sort()).toEqual([...instrumentIds].sort());expect(new Set(ids).size).toBe(ids.length);
});
for(const lang of ['de','en','es','fr'])test(`selected-pad tools and grouped tiles are localized and keyboard accessible: ${lang}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/'+lang+'/');await page.locator('[data-pad-mode=rhythm]').click();
 await expect(page.locator('#pad-instrument-actions')).toBeHidden();
 await page.keyboard.press('Numpad5');await expect(page.locator('#pad-instrument-actions')).toBeVisible();
 await expect(page.locator('#pad-mute')).toHaveAttribute('title',/.+/);
 await page.locator('#pad-instrument').click();const dialog=page.locator('#instrument-dialog');
 await expect(dialog).toBeVisible();await expect(dialog.getByRole('tab')).toHaveCount(7);
 await expect(dialog.locator('[data-pick-instrument]')).toHaveCount(25);
 await expect(dialog.locator('[data-pick-instrument=marimba]')).toHaveAttribute('aria-pressed','true');
 await dialog.getByRole('tab',{selected:true}).focus();await page.keyboard.press('End');
 await expect(dialog.locator('[data-instrument-group=synths]')).toBeFocused();
 await expect(dialog.locator('#instrument-panel-synths')).toBeVisible();
 await page.keyboard.press('Home');await expect(dialog.locator('[data-instrument-group=drums]')).toBeFocused();
 await dialog.locator('[data-instrument-group=strings]').click();
 if(lang==='de')await dialog.screenshot({path:'test-results/instrument-picker-'+test.info().project.name+'.png'});
 const tile=dialog.locator('[data-pick-instrument=harp]');await expect(tile.locator('svg')).toBeVisible();
 await expect(tile.locator('span')).not.toBeEmpty();await tile.click();await expect(dialog).toBeHidden();
 await expect(page.locator('[data-track="4"] .instrument-select')).toHaveValue('harp');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','0');
 await page.keyboard.press('Escape');await expect(page.locator('[data-track="4"] .instrument-select')).toHaveValue('marimba');
 expect(errors).toEqual([]);
});

test('muting and instrument changes are undoable together; accepted muted pads can be selected and unmuted',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();await page.locator('#play').click();
 await page.keyboard.press('Numpad5');await page.locator('#pad-mute').click();
 await expect(page.locator('#pad-mute')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-track="4"] .mute')).toBeChecked();
 expect((await page.locator('#drawing').getAttribute('data-lane-levels'))!.split(',')[4]).toBe('0');
 await page.locator('#pad-instrument').click();await page.locator('[data-instrument-group=winds]').click();
 await page.locator('[data-pick-instrument=saxophone]').click();await page.keyboard.press('Enter');
 await expect(page.locator('#pad-instrument-actions')).toBeHidden();
 await page.keyboard.press('Numpad5');await expect(page.locator('#pad-mute')).toHaveAttribute('aria-pressed','true');
 await page.locator('#pad-mute').click();await expect(page.locator('[data-track="4"] .mute')).not.toBeChecked();
 await page.keyboard.press('Escape'); // restore the accepted muted saxophone
 await expect(page.locator('[data-track="4"] .mute')).toBeChecked();
 await expect(page.locator('[data-track="4"] .instrument-select')).toHaveValue('saxophone');
 await page.keyboard.press('Numpad5');await page.locator('#pad-mute').click();
 await page.locator('#pad-instrument').click();await page.locator('[data-instrument-group=keys]').click();
 await page.locator('[data-pick-instrument=piano]').click();await page.keyboard.press('Escape');
 await expect(page.locator('[data-track="4"] .mute')).toBeChecked();
 await expect(page.locator('[data-track="4"] .instrument-select')).toHaveValue('saxophone');
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
});

test('Escape closes only the picker in focus view; the next Escape cancels the selected pad',async({page})=>{
 await page.goto('/de/');await page.locator('[data-pad-mode=rhythm]').click();await page.locator('#focus').click();
 await page.keyboard.press('Numpad5');await page.keyboard.press('1');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','1');
 await page.locator('#pad-instrument').click();await page.keyboard.press('8');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','1');
 await page.keyboard.press('Escape');await expect(page.locator('#instrument-dialog')).toBeHidden();
 await expect(page.locator('#drawing')).toHaveAttribute('data-selected-pad','4');
 await expect(page.locator('body')).toHaveClass(/focus-view/);
 await expect(page.locator('#pad-instrument')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#drawing')).toHaveAttribute('data-selected-pad','');
 await expect(page.locator('#drawing')).toHaveAttribute('data-rhythm-hits','0');
 await expect(page.locator('body')).toHaveClass(/focus-view/);
});
