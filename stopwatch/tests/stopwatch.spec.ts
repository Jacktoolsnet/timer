import {test,expect} from '@playwright/test';
test('timing, laps, pause, reset and focus',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('#toggle-timing')).toHaveAccessibleName('Start');
 await expect(page.locator('#toggle-timing')).toHaveText('');
 await expect(page.locator('#play-symbol')).toBeVisible();
 await expect(page.locator('#pause-symbol')).toBeHidden();
 await expect(page.locator('#lap')).toHaveAccessibleName('Runde');
 await expect(page.locator('#reset-timing')).toHaveAccessibleName('Zurücksetzen');
 await page.locator('#toggle-timing').click();
 await expect(page.locator('#toggle-timing')).toHaveAccessibleName('Pause');
 await expect(page.locator('#pause-symbol')).toBeVisible();
 await expect(page.locator('#play-symbol')).toBeHidden(); await page.waitForTimeout(150);
 await expect(page.locator('#elapsed')).not.toHaveText('00:00:00.00'); await page.locator('#lap').click(); await expect(page.locator('#laps-body tr')).toHaveCount(1);
 await expect(page.locator('#reset-timing')).toBeDisabled(); await page.locator('#toggle-timing').click(); const paused=await page.locator('#elapsed').textContent(); await page.waitForTimeout(120);await expect(page.locator('#elapsed')).toHaveText(paused!);
 await page.locator('#toggle-timing').click();await page.locator('#lap').click();await expect(page.locator('#laps-body tr')).toHaveCount(2);await page.locator('#toggle-timing').click();
 await page.locator('#reset-timing').click();await expect(page.locator('#reset-dialog')).toBeVisible();await expect(page.locator('#reset-cancel')).toBeFocused();await page.locator('#reset-cancel').click();await expect(page.locator('#laps-body tr')).toHaveCount(2);await expect(page.locator('#reset-timing')).toBeFocused();await page.locator('#reset-timing').click();await page.keyboard.press('Escape');await expect(page.locator('#reset-dialog')).not.toBeVisible();await expect(page.locator('#laps-body tr')).toHaveCount(2);await page.locator('#reset-timing').click();await page.locator('#reset-confirm').click();await expect(page.locator('#toggle-timing')).toBeFocused();await expect(page.locator('#elapsed')).toHaveText('00:00:00.00');await expect(page.locator('#laps-table')).toBeHidden();
 await expect(page.locator('#stopwatch-focus svg')).toHaveCount(1);await page.locator('#stopwatch-focus').click();await expect(page.locator('body')).toHaveClass(/focus-view/);await expect(page.locator('#toggle-timing')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('body')).not.toHaveClass(/focus-view/);await expect(page.locator('#stopwatch-focus svg')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('four languages and legal links',async({page})=>{for(const [lang,title] of [['de','Deine Zeit. Dein Tempo.'],['en','Your time. Your pace.'],['es','Tu tiempo. Tu ritmo.'],['fr','Votre temps. Votre rythme.']]){await page.goto('/'+lang+'/');await expect(page.locator('h1')).toHaveText(title);await expect(page.locator('#toggle-timing')).toBeEnabled();}await page.goto('/de/privacy/');await expect(page.locator('main')).toContainText('Die Webstatistik ist deaktiviert.');await expect(page.locator('main')).toContainText('Rundenzeiten');});
test('wake lock active only while running and privacy opt-in',async({page})=>{
 await page.addInitScript(()=>{(window as any).wakeRequests=0;(window as any).wakeReleases=0;Object.defineProperty(navigator,'wakeLock',{value:{request:async()=>{(window as any).wakeRequests++;const sentinel=new EventTarget();return Object.assign(sentinel,{release:async()=>{(window as any).wakeReleases++;sentinel.dispatchEvent(new Event('release'));}});}}});});
 await page.goto('/en/');await page.locator('#awake').check();expect(await page.evaluate(()=>localStorage.length)).toBe(0);expect(await page.evaluate(()=>(window as any).wakeRequests)).toBe(0);
 await page.locator('#toggle-timing').click();await expect(page.locator('#wake-status')).toBeEmpty();expect(await page.evaluate(()=>(window as any).wakeRequests)).toBe(1);await page.locator('#toggle-timing').click();expect(await page.evaluate(()=>(window as any).wakeReleases)).toBe(1);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.stopwatch.settings.v1')!).awake)).toBe(true);
 await page.locator('#remember-preferences').uncheck();expect(await page.evaluate(()=>localStorage.length)).toBe(0);await expect(page.locator('#awake')).not.toBeChecked();
});
test('analog view keeps measurement and rounds, remembers view only with consent',async({page})=>{
 await page.goto('/de/');await expect(page.locator('.stopwatch-options #awake')).toHaveAttribute('role','switch');
 await page.locator('#stopwatch-view').selectOption('analog', {force:true});await expect(page.locator('#analog-stopwatch')).toBeVisible();
 await page.locator('#toggle-timing').click();await page.waitForTimeout(200);await page.locator('#lap').click();await page.locator('#toggle-timing').click();
 const elapsed=await page.locator('#elapsed').textContent();const hand=await page.locator('#stopwatch-second-hand').getAttribute('transform');expect(hand).not.toBe('rotate(0 160 160)');
 await page.locator('#stopwatch-view').selectOption('digital', {force:true});await expect(page.locator('#analog-stopwatch')).toBeHidden();await expect(page.locator('#elapsed')).toHaveText(elapsed!);await expect(page.locator('#laps-body tr')).toHaveCount(1);
 await page.locator('#stopwatch-view').selectOption('analog', {force:true});await expect(page.locator('#stopwatch-second-hand')).toHaveAttribute('transform',hand!);
 await page.locator('#stopwatch-focus').click();await expect(page.locator('#analog-stopwatch')).toBeVisible();await expect(page.locator('.stopwatch-sidebar')).toBeHidden();await expect(page.locator('.stopwatch-card #laps-table')).toBeVisible();await expect(page.locator('#laps-body tr')).toHaveCount(1);await page.keyboard.press('Escape');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('jacktools.stopwatch.settings.v1')!).view)).toBe('analog');
 await page.locator('#remember-preferences').uncheck();await expect(page.locator('#stopwatch-view')).toHaveValue('analog');
});

test('styled view dropdown supports keyboard, selection and dismissal',async({page})=>{
 await page.goto('/de/');const trigger=page.locator('#trigger-view');
 await expect(trigger).toHaveAccessibleName('Ansicht Analog');await trigger.click();
 await expect(page.getByRole('listbox')).toBeVisible();await expect(page.getByRole('option',{name:'Analog',exact:true})).toHaveAttribute('aria-selected','true');
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(trigger).toHaveAccessibleName('Ansicht Digital');await expect(trigger).toBeFocused();await expect(page.locator('#analog-stopwatch')).toBeHidden();await expect(page.getByRole('listbox')).toBeHidden();
 await trigger.click();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','false');
 await trigger.click();await page.locator('h1').click();await expect(trigger).toHaveAttribute('aria-expanded','false');
});

test('focus laps follow screen width and orientation',async({page})=>{
 await page.goto('/de/');await page.locator('#toggle-timing').click();await page.waitForTimeout(50);await page.locator('#lap').click();await page.locator('#toggle-timing').click();
 // Focus layout also works without the optional fullscreen API.
 await page.evaluate(()=>{document.documentElement.requestFullscreen=async()=>{throw new Error('not available');};});
 await page.locator('#stopwatch-focus').click();
 for(const [width,height,side] of [[1440,1000,true],[390,844,false],[844,390,true],[667,375,true]] as const){
  await page.setViewportSize({width,height});
  for(const view of ['digital','analog']){
   await page.locator('#stopwatch-view').selectOption(view,{force:true});
   const main=await page.locator('.stopwatch-main').boundingBox();const laps=await page.locator('.stopwatch-laps').boundingBox();
   expect(main).not.toBeNull();expect(laps).not.toBeNull();
   if(side)expect(laps!.x).toBeGreaterThanOrEqual(main!.x+main!.width);else expect(laps!.y).toBeGreaterThanOrEqual(main!.y+main!.height);
   await expect(page.locator('#laps-table')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 }
});

test('support highlights coffee without MessageDrop promotion in all languages',async({page})=>{
 for(const lang of ['de','en','es','fr']){
  await page.goto('/'+lang+'/');const support=page.locator('.support-section');await expect(support).not.toContainText('MessageDrop');await expect(support.locator('a')).toHaveCount(1);await expect(support.locator('a')).toHaveClass('support-coffee');await expect(support.locator('a')).toHaveAttribute('href','https://buymeacoffee.com/jacktoolsnet');
 }
});
test('copy and CSV export include chronological laps, work in focus, handle clipboard denial',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copiedText=text;}}}));
 await page.goto('/de/');await expect(page.locator('#copy-laps')).toBeDisabled();await expect(page.locator('#export-laps')).toBeDisabled();
 await page.locator('#toggle-timing').click();await page.waitForTimeout(70);await page.locator('#lap').click();await page.waitForTimeout(50);await page.locator('#lap').click();await page.locator('#toggle-timing').click();
 await page.locator('#copy-laps').click();await expect(page.locator('#export-status')).toHaveText('Rundenzeiten kopiert.');
 const copied=await page.evaluate(()=>(window as any).copiedText as string);const lines=copied.split('\n');expect(lines[0]).toBe('Runde\tRundenzeit\tGesamtzeit');expect(lines[1]).toMatch(/^1\t/);expect(lines[2]).toMatch(/^2\t/);
 await page.locator('#stopwatch-focus').click();await expect(page.locator('#export-laps')).toBeVisible();
 const downloadPromise=page.waitForEvent('download');await page.locator('#export-laps').click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^jacktools-stopwatch-.*\.csv$/);
 const {readFile}=await import('node:fs/promises');const csv=await readFile((await download.path())!,'utf8');expect(csv).toBe('\uFEFF'+lines.map(line=>line.split('\t').map(cell=>'"'+cell+'"').join(',')).join('\r\n')+'\r\n');
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}});});
 await page.locator('#copy-laps').click();await expect(page.locator('#export-status')).toContainText('CSV-Export');
 await page.locator('#reset-timing').click();await page.locator('#reset-confirm').click();await expect(page.locator('#copy-laps')).toBeDisabled();await expect(page.locator('#export-laps')).toBeDisabled();await expect(page.locator('#export-status')).toBeEmpty();
});
