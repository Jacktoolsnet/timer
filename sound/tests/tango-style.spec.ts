import {test,expect} from '@playwright/test';
import {presets,styleIds,styleCopy} from '../src/lib/presets';
import {dances} from '../src/lib/dances';
import {resolveGroove} from '../src/lib/groove';
import {performanceProfile} from '../src/lib/performance';

test('Tango style shares its protected straight marcato arrangement with the legacy rhythm engine',()=>{
 expect(styleIds).toContain('tango');expect(presets.tango).toBe(dances.tango.preset);expect(presets.tango.bpm).toBe(128);
 expect(presets.tango.parts[0].steps).toEqual([0,4,8,12]);expect(presets.tango.parts[1].steps).toEqual([0,6,8,12]);expect(presets.tango.parts[3].steps).toEqual([0,6,8,12]);
 expect(resolveGroove('tango','auto')).toMatchObject({beats:4,steps:16,swing:0,dance:'tango'});
 expect(performanceProfile('tango','strings').legato).toBe(false);
 for(const lang of ['de','en','es','fr'] as const){expect(styleCopy[lang].names).toHaveLength(styleIds.length);expect(styleCopy[lang].names[styleIds.indexOf('tango')]).toBe('Tango');}
});
for(const lang of ['de','en','es','fr'])test('Tango is selected from the visible music styles in '+lang,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/'+lang+'/');
 const button=page.locator('[data-style-preset=tango]');await expect(button).toBeVisible();await expect(button).toHaveText(/Tango/);await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.style-tile[aria-pressed=true]')).toHaveCount(1);await expect(page.locator('#tempo')).toHaveValue('128');await expect(page.locator('#orbit')).toHaveAttribute('data-steps','16');
 await expect(page.locator('.dances-tile')).toBeHidden();await expect(page.locator('.groove-controls')).toBeHidden();
 await page.locator('#play').click();await page.waitForTimeout(250);await page.locator('#play').click();
 await page.locator('[data-style-preset=jazz]').click();await expect(button).toHaveAttribute('aria-pressed','false');await expect(page.locator('#sound-app')).toHaveAttribute('data-active-dance','');expect(errors).toEqual([]);
});
test('random Tango preserves its pulse while drawing reshapes accompaniment',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});await page.goto('/de/');await page.locator('[data-style-preset=tango]').click();
 const foundation=()=>page.locator('.instrument').evaluateAll(rows=>rows.slice(0,4).map(row=>({slots:(row as HTMLElement).dataset.slots,phase:(row as HTMLElement).dataset.phase,direction:(row as HTMLElement).dataset.direction,points:[...row.querySelectorAll('[data-step]')].map(b=>b.getAttribute('aria-pressed'))})));
 const before=await foundation();await page.locator('#evolve').click();
 const pad=page.locator('#drawing');await pad.scrollIntoViewIfNeeded();const r=(await pad.boundingBox())!;const motif=await page.locator('[data-track="4"]').getAttribute('data-motif');
 await page.mouse.click(r.x+r.width*.4,r.y+r.height*.03);await expect(page.locator('[data-track="4"]')).not.toHaveAttribute('data-motif',motif!);await page.waitForTimeout(4200);
 expect(await foundation()).toEqual(before);await expect(page.locator('#tempo')).toHaveValue('128');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');await page.locator('#play').click();
 await page.locator('#random').click();expect(await foundation()).toEqual(before);
});
test('live Tango selection waits for a bar and can be canceled by reselecting the active style',async({page})=>{
 await page.goto('/de/');await page.locator('#tempo').fill('120');await page.locator('#tempo').dispatchEvent('input');await page.locator('#play').click();await page.waitForTimeout(200);
 const tango=page.locator('[data-style-preset=tango]');await tango.click();await expect(tango).toHaveClass(/is-pending/);await expect(tango).toHaveAttribute('aria-pressed','false');await expect(tango).toHaveAttribute('aria-pressed','true',{timeout:3500});
 await page.locator('[data-style-preset=electronic]').click();await tango.click();await expect(page.locator('[data-style-preset=electronic]')).not.toHaveClass(/is-pending/);await expect(tango).toHaveAttribute('aria-pressed','true');await page.locator('#play').click();
});
test('Tango and legacy Tango selections restore with the visible tile selected and no autoplay',async({page})=>{
 await page.goto('/de/');await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();await page.locator('[data-style-preset=tango]').click();await page.waitForTimeout(350);await page.reload();
 await expect(page.locator('[data-style-preset=tango]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.evaluate(()=>{const key='jacktools.sound.settings.v1',s=JSON.parse(localStorage.getItem(key)!);s.style='classical';s.dance='tango';localStorage.setItem(key,JSON.stringify(s));});await page.reload();await expect(page.locator('[data-style-preset=tango]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-style-preset=electronic]').click();await expect(page.locator('#sound-app')).toHaveAttribute('data-active-dance','');
});
