import { test, expect, type Page } from '@playwright/test';
import { Alarm, nextAlarm } from '../src/lib/alarm';
import { alarmToneIds, alarmTones, alarmTone } from '../src/lib/alarm-tones';

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
 await expect(page.locator('#clock-alarm-badge')).toBeHidden();
 await expect(page.locator('#alarm-status')).toBeEmpty();
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
 expect(saved.time).toBe('00:01');expect(Object.keys(saved).sort()).toEqual(['time','tone','vibration','volume']);
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
 await page.clock.fastForward(3100);await expect(page.locator('#alarm-status')).toBeEmpty();
 await page.locator('#alarm-enabled').check();await page.clock.fastForward(61000);await expect(page.locator('#alarm-dialog')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#alarm-dialog')).toBeHidden();await expect(page.locator('#alarm-enabled')).not.toBeChecked();
});
test('custom time picker inherits theme colors and fonts and supports keyboard selection',async({page})=>{
 await setup(page);
 await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.documentElement.dataset.style='technical';});
 await page.locator('#alarm-time-open').click();
 await expect(page.locator('#alarm-time-picker')).toBeVisible();
 const styles=await page.locator('#alarm-time-picker').evaluate(el=>{
  const panel=getComputedStyle(el),parent=getComputedStyle(document.querySelector('#clock-alarm')!);
  return {font:panel.fontFamily,parentFont:parent.fontFamily,color:panel.color,parentColor:parent.color};
 });
 expect(styles.font).toBe(styles.parentFont);expect(styles.color).toBe(styles.parentColor);
 await page.locator('#trigger-alarmHour').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');
 await page.locator('#trigger-alarmMinute').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');
 await expect(page.locator('#alarm-time')).toHaveValue('23:59');
 await page.locator('#alarm-time-done').click();await expect(page.locator('#alarm-time-picker')).toBeHidden();
 await page.locator('#alarm-time').fill('06:15');await page.locator('#alarm-time').dispatchEvent('change');
 await page.locator('#alarm-time-open').click();await expect(page.locator('#trigger-alarmHour')).toContainText('06');
 await expect(page.locator('#trigger-alarmMinute')).toContainText('15');
 await page.keyboard.press('Escape');await expect(page.locator('#alarm-time-picker')).toBeHidden();
});
test('alarm time follows each clock view and remains compact in focus mode',async({page})=>{
 await setup(page);await page.locator('#alarm-enabled').check();
 for(const [width,height]of [[1440,900],[412,915],[915,412]]){
  await page.setViewportSize({width,height});
  for(const view of ['analog','digital','combined','flip','analogFlip']){
   await page.evaluate(view=>{document.body.classList.add('focus-view');const s=document.querySelector<HTMLSelectElement>('select[name=view]')!;s.value=view;s.dispatchEvent(new Event('change',{bubbles:true}));},view);
   if(view==='analog'||view==='combined'||view==='analogFlip'){
    await expect(page.locator('#alarm-analog-indicator')).toBeVisible();await expect(page.locator('#alarm-readout-indicator')).toBeHidden();
    if(view==='analogFlip'){await expect(page.locator('#alarm-analog-flips')).toBeVisible();await expect(page.locator('#alarm-analog-flips .flip-digit')).toHaveCount(4);await expect(page.locator('#alarm-analog-time')).toBeHidden();}
    else {await expect(page.locator('#alarm-analog-time')).toHaveText('00:01');await expect(page.locator('#alarm-analog-flips')).toBeHidden();}
   }else{
    await expect(page.locator('#alarm-analog-indicator')).toBeHidden();await expect(page.locator('#alarm-readout-indicator')).toBeVisible();
    if(view==='flip'||view==='analogFlip')await expect(page.locator('#alarm-mini-flips .flip-digit')).toHaveCount(4);
    else await expect(page.locator('#alarm-readout-time')).toHaveText('00:01');
   }
   expect(await page.locator('.clock-display').evaluate(el=>el.scrollWidth<=el.clientWidth&&el.scrollHeight<=el.clientHeight+1),`${view} at ${width}x${height}`).toBeTruthy();
  }
 }
});

test('five distinct tone phrases stay within the repeat interval',()=>{
 expect(alarmToneIds).toHaveLength(5);
 expect(new Set(alarmToneIds.map(id=>JSON.stringify(alarmTones[id]))).size).toBe(5);
 expect(alarmTone('unsupported')).toBe('classic');
 for(const id of alarmToneIds)for(const note of alarmTones[id]){
  expect(note.delay+note.duration).toBeLessThan(1.5);
  expect(note.frequency).toBeGreaterThan(0);expect(note.level).toBeLessThanOrEqual(.65);
 }
});
test('all five tones are testable and the selected tone restores with consent',async({page})=>{
 await setup(page);await expect(page.locator('#options-alarmTone [role=option]')).toHaveCount(5);
 for(let i=0;i<5;i++){
  await page.locator('#trigger-alarmTone').click();await page.locator('#options-alarmTone [role=option]').nth(i).click();
  await page.locator('#alarm-test').click();await expect(page.locator('#alarm-status')).toContainText('Test');
  await page.clock.fastForward(3100);await expect(page.locator('#alarm-status')).toBeEmpty();
 }
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.clock.alarm.v1')!).tone)).toBe('pulse');
 await page.reload();await expect(page.locator('#trigger-alarmTone')).toContainText('Puls');
 await expect(page.locator('#alarm-enabled')).not.toBeChecked();
});
