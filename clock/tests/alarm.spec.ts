import { test, expect, type Page } from '@playwright/test';
import { Alarm, nextAlarm } from '../src/lib/alarm';

test('alarm finds the next date and respects time zones and DST gaps/folds',()=>{
 expect(nextAlarm(Date.parse('2026-10-12T23:59:30Z'),'00:00','UTC')).toBe(Date.parse('2026-10-13T00:00:00Z'));
 expect(nextAlarm(Date.parse('2026-10-12T05:00:00Z'),'07:30','Europe/Berlin')).toBe(Date.parse('2026-10-12T05:30:00Z'));
 expect(nextAlarm(Date.parse('2026-03-29T00:00:00Z'),'02:30','Europe/Berlin')).toBe(Date.parse('2026-03-30T00:30:00Z'));
 expect(nextAlarm(Date.parse('2026-10-25T00:40:00Z'),'02:30','Europe/Berlin')).toBe(Date.parse('2026-10-25T01:30:00Z'));
 expect(()=>nextAlarm(Date.now(),'25:00','UTC')).toThrow();
});
test('one-shot alarm, snooze and missed-alarm state are bounded',()=>{
 const a=new Alarm();a.arm(Date.parse('2026-10-12T00:00:00Z'),'00:01','UTC');const due=a.due!;
 expect(a.check(due-1)).toBeNull();expect(a.check(due)).toBe('ring');expect(a.check(due+1000)).toBeNull();
 a.snooze(due);expect(a.due).toBe(due+300000);expect(a.check(due+300000)).toBe('ring');a.stop();expect(a.ringing).toBe(false);
 a.arm(due,'00:02','UTC');expect(a.check(a.due!+300001)).toBe('missed');expect(a.ringing).toBe(false);
});
async function setup(page:Page){
 await page.clock.install({time:new Date('2026-10-12T00:00:00Z')});await page.goto('/de/');
 await page.evaluate(()=>{const s=document.querySelector<HTMLSelectElement>('select[name=zone]')!;s.value='UTC';s.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.locator('#alarm-time').fill('00:01');
}
test('alarm rings in focus view, snoozes for five minutes and stops vibration',async({page})=>{
 await page.addInitScript(()=>{Object.assign(window,{vibrations:[]});Object.defineProperty(navigator,'vibrate',{configurable:true,value:(pattern:number|number[])=>{(window as unknown as {vibrations:(number|number[])[]}).vibrations.push(pattern);return true;}});});
 await setup(page);await page.locator('#alarm-vibration').check();await page.locator('#alarm-enabled').check();
 await expect(page.locator('#clock-alarm-badge')).toBeVisible();
 await page.evaluate(()=>document.body.classList.add('focus-view'));
 await page.clock.fastForward(61000);await expect(page.locator('#alarm-dialog')).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {vibrations:(number|number[])[]}).vibrations.some(p=>Array.isArray(p)))).toBe(true);
 await page.locator('#alarm-snooze').click();await expect(page.locator('#alarm-dialog')).toBeHidden();
 await page.clock.fastForward(299000);await expect(page.locator('#alarm-dialog')).toBeHidden();
 await page.clock.fastForward(3000);await expect(page.locator('#alarm-dialog')).toBeVisible();
 await page.locator('#alarm-stop').click();await expect(page.locator('#alarm-dialog')).toBeHidden();
 await expect(page.locator('#clock-alarm-badge')).toBeHidden();
 expect(await page.evaluate(()=>(window as unknown as {vibrations:(number|number[])[]}).vibrations.at(-1))).toBe(0);
});
test('preferences persist only with consent, never alarm activation',async({page})=>{
 await setup(page);await page.locator('#alarm-enabled').check();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.clock.alarm.v1'))).toBeNull();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.clock.alarm.v1')!));
 expect(saved.time).toBe('00:01');expect(Object.keys(saved).sort()).toEqual(['time','vibration','volume']);
 await page.reload();await expect(page.locator('#alarm-enabled')).not.toBeChecked();await expect(page.locator('#alarm-time')).toHaveValue('00:01');
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').uncheck();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.clock.alarm.v1'))).toBeNull();
});
test('unsupported vibration is disabled and a long missed interval does not ring',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'vibrate',{configurable:true,value:undefined}));
 await setup(page);await expect(page.locator('#alarm-vibration')).toBeDisabled();await page.locator('#alarm-enabled').check();
 await page.clock.fastForward(7*60000);await expect(page.locator('#alarm-dialog')).toBeHidden();
 await expect(page.locator('#alarm-status')).toContainText('verpasst');await expect(page.locator('#alarm-enabled')).not.toBeChecked();
});
test('test signal is bounded and escaping an alarm stops it',async({page})=>{
 await setup(page);await page.locator('#alarm-test').click();await expect(page.locator('#alarm-status')).toContainText('Test');
 await page.clock.fastForward(3100);await expect(page.locator('#alarm-status')).toContainText('ausgeschaltet');
 await page.locator('#alarm-enabled').check();await page.clock.fastForward(61000);await expect(page.locator('#alarm-dialog')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#alarm-dialog')).toBeHidden();await expect(page.locator('#alarm-enabled')).not.toBeChecked();
});
