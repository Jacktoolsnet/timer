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
 await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 await expect(trigger).toHaveAccessibleName('Ansicht Digital');await expect(trigger).toBeFocused();await expect(page.locator('#analog-stopwatch')).toBeHidden();await expect(page.getByRole('listbox')).toBeHidden();
 await trigger.click();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','false');
 await trigger.click();await page.locator('h1').click();await expect(trigger).toHaveAttribute('aria-expanded','false');
});

test('focus lap section remains accessible across orientations',async({page})=>{
 await page.goto('/de/');await page.locator('#toggle-timing').click();await page.waitForTimeout(50);await page.locator('#lap').click();await page.locator('#toggle-timing').click();
 // Focus layout also works without the optional fullscreen API.
 await page.evaluate(()=>{document.documentElement.requestFullscreen=async()=>{throw new Error('not available');};});
 await page.locator('#stopwatch-focus').click();
 for(const [width,height] of [[1440,1000],[390,844],[844,390],[667,375]] as const){
  await page.setViewportSize({width,height});
  for(const view of ['digital','analog']){
   await page.locator('#stopwatch-view').selectOption(view,{force:true});
   const main=await page.locator('.stopwatch-main').boundingBox();const laps=await page.locator('.stopwatch-laps').boundingBox();
   expect(main).not.toBeNull();expect(laps).not.toBeNull();
   expect(laps!.x).toBeGreaterThanOrEqual(0);expect(laps!.x+laps!.width).toBeLessThanOrEqual(width);
   await page.locator('.stopwatch-laps').scrollIntoViewIfNeeded();
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

test('normal layout puts laps to the right and options in the next row',async({page})=>{
 await page.goto('/de/');
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:1000});
  const main=(await page.locator('.stopwatch-main').boundingBox())!;
  const laps=(await page.locator('.stopwatch-laps').boundingBox())!;
  const card=(await page.locator('.stopwatch-card').boundingBox())!;
  const options=(await page.locator('.stopwatch-options').boundingBox())!;
  expect(options.y).toBeGreaterThanOrEqual(card.y+card.height);
  expect(options.width).toBeCloseTo(card.width,0);
  if(width>600){
   expect(laps.x).toBeGreaterThanOrEqual(main.x+main.width);
   const heading=(await page.locator('#options-title').boundingBox())!;
   const view=(await page.locator('.stopwatch-options .clock-select-field').boundingBox())!;
   const awake=(await page.locator('.stopwatch-options .toggle-row').boundingBox())!;
   expect(view.x).toBeGreaterThanOrEqual(heading.x+heading.width);
   expect(awake.x).toBeGreaterThanOrEqual(view.x+view.width);
   expect(view.y).toBeCloseTo(heading.y,0);
   expect(awake.y).toBeCloseTo(heading.y,0);
  }else expect(laps.y).toBeGreaterThanOrEqual(main.y+main.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
});

test('option headings share alignment and typography after select enhancement',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('#trigger-view')).toBeVisible();
 const headings=page.locator('#options-title, #caption-view, .stopwatch-options .toggle-row strong');
 const styles=await headings.evaluateAll(elements=>elements.map(element=>{
  const style=getComputedStyle(element);
  return {fontSize:style.fontSize,fontWeight:style.fontWeight,lineHeight:style.lineHeight};
 }));
 expect(styles).toHaveLength(3);
 expect(styles[1]).toEqual(styles[0]);
 expect(styles[2]).toEqual(styles[0]);
 if(page.viewportSize()!.width>600){
  const boxes=await headings.evaluateAll(elements=>elements.map(element=>element.getBoundingClientRect().top));
  expect(boxes[1]).toBeCloseTo(boxes[0],0);
  expect(boxes[2]).toBeCloseTo(boxes[0],0);
 }
});

test('analog, digital and combined views show only the selected displays',async({page})=>{
 await page.goto('/de/');
 for(const focus of [false,true]){
  if(focus) await page.locator('#stopwatch-focus').click();
  for(const view of ['analog','digital','combined']){
   await page.locator('#stopwatch-view').selectOption(view,{force:true});
   if(view==='digital') await expect(page.locator('#analog-stopwatch')).toBeHidden();
   else await expect(page.locator('#analog-stopwatch')).toBeVisible();
   if(view==='analog') await expect(page.locator('#elapsed')).toBeHidden();
   else await expect(page.locator('#elapsed')).toBeVisible();
  }
 }
 await page.keyboard.press('Escape');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#stopwatch-view')).toHaveValue('combined');
 await expect(page.locator('#analog-stopwatch')).toBeVisible();
 await expect(page.locator('#elapsed')).toBeVisible();
});

test('lap analysis and chart update from completed laps and clear on reset',async({page})=>{
 await page.addInitScript(()=>{(window as any).testNow=1000;Date.now=()=>(window as any).testNow;});
 await page.goto('/de/');
 await expect(page.locator('#lap-insights')).toBeHidden();
 await page.locator('#toggle-timing').click();
 for(const duration of [3000,1000,2000]){
  await page.evaluate(ms=>{(window as any).testNow+=ms;},duration);
  await page.locator('#lap').click();
 }
 await expect(page.locator('#lap-insights')).toBeVisible();
 await expect(page.locator('#lap-fastest')).toHaveText('00:00:01.00 · Runde 2');
 await expect(page.locator('#lap-slowest')).toHaveText('00:00:03.00 · Runde 1');
 await expect(page.locator('#lap-average')).toHaveText('00:00:02.00');
 await expect(page.locator('#lap-difference')).toHaveText('+00:00:01.00');
 await expect(page.locator('#lap-chart circle')).toHaveCount(3);
 await expect(page.locator('#lap-chart .lap-chart-average')).toHaveCount(1);
 await page.locator('#toggle-timing').click();
 await page.locator('#reset-timing').click();
 await page.locator('#reset-confirm').click();
 await expect(page.locator('#lap-insights')).toBeHidden();
 await expect(page.locator('#lap-chart circle')).toHaveCount(0);
 await page.locator('#toggle-timing').click();
 await page.locator('#lap').click();
 await expect(page.locator('#lap-average')).toHaveText('00:00:00.00');
 await expect(page.locator('#lap-difference')).toHaveText('—');
 await expect(page.locator('#lap-chart circle')).toHaveCount(1);
 expect(await page.locator('#lap-chart-content').innerHTML()).not.toContain('NaN');
});

test('focus shows the empty lap panel before recording and after reset',async({page})=>{
 await page.goto('/de/');
 await page.locator('#stopwatch-focus').click();
 await expect(page.locator('.stopwatch-laps')).toBeVisible();
 await expect(page.locator('#empty-laps')).toBeVisible();
 await expect(page.locator('#laps-table')).toBeHidden();
 await expect(page.locator('#copy-laps')).toBeDisabled();
 await expect(page.locator('#export-laps')).toBeDisabled();
 await page.locator('#toggle-timing').click();
 await page.locator('#lap').click();
 await expect(page.locator('#empty-laps')).toBeHidden();
 await page.locator('#toggle-timing').click();
 await page.locator('#reset-timing').click();
 await page.locator('#reset-confirm').click();
 await expect(page.locator('.stopwatch-laps')).toBeVisible();
 await expect(page.locator('#empty-laps')).toBeVisible();
});

test('multiple clocks have independent laps, arrow navigation and combined exports',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).testNow=1000;Date.now=()=>(window as any).testNow;
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copiedText=text;}}});
 });
 await page.goto('/de/');
 await page.locator('#add-clock').click();
 const extra=page.locator('.extra-clock').first();
 await expect(extra).toBeVisible();
 await extra.locator('input').fill('Training');
 await page.locator('#start-all').click();
 await page.evaluate(()=>{(window as any).testNow+=1000;});
 await extra.locator('[data-action=lap]').click();
 await expect(page.locator('#laps-body tr')).toHaveCount(0);
 await extra.locator('[data-action=show]').click();
 await expect(page.locator('#selected-clock')).toHaveText('Training');
 await expect(page.locator('#laps-body tr')).toHaveCount(1);
 await expect(page.locator('#lap-average')).toHaveText('00:00:01.00');
 await page.evaluate(()=>{(window as any).testNow+=2000;});
 await page.locator('#lap').click();
 await expect(page.locator('#laps-body tr')).toHaveCount(1);
 await page.locator('#previous-clock').click();
 await expect(page.locator('#selected-clock')).toHaveText('Stoppuhr 1');
 await expect(page.locator('#lap-average')).toHaveText('00:00:03.00');
 await page.locator('#all-clocks').click();
 await expect(page.locator('#laps-body tr')).toHaveCount(2);
 await expect(page.locator('#lap-chart polyline')).toHaveCount(2);
 await page.locator('#copy-laps').click();
 expect(await page.evaluate(()=>(window as any).copiedText)).toBe('Runde\tStoppuhr 1\tTraining\n1\t00:00:03.00\t00:00:01.00');
 await page.locator('#pause-all').click();
 await extra.locator('[data-action=reset]').click();
 await page.locator('#reset-confirm').click();
 await expect(page.locator('#laps-body tr')).toHaveCount(1);
 await page.locator('#next-clock').click();
 await expect(page.locator('#lap-insights h3')).toBeVisible();
 await expect(page.locator('.lap-stats')).toBeVisible();
 await page.locator('#stopwatch-focus').click();
 await expect(extra.locator('[data-action=lap]')).toBeVisible();
 await expect(page.locator('#lap-navigation')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('focus controls remain visible after inactivity',async({page})=>{
 await page.goto('/de/');
 await page.locator('#stopwatch-focus').click();
 await page.mouse.move(0,0);
 await page.waitForTimeout(3500);
 await expect(page.locator('body')).not.toHaveClass(/focus-cursor-hidden/);
 for(const id of ['stopwatch-focus','toggle-timing','lap','reset-timing','copy-laps','export-laps']){
  await expect(page.locator('#'+id)).toBeVisible();
  await expect(page.locator('#'+id)).toHaveCSS('visibility','visible');
 }
});

test('clock tiles use icon controls and responsive grids in normal and focus views',async({page})=>{
 await page.goto('/de/');
 await page.evaluate(()=>{document.documentElement.requestFullscreen=async()=>{throw new Error('unavailable');};});
 for(let i=0;i<5;i++)await page.locator('#add-clock').click();
 await expect(page.locator('.clock-tile')).toHaveCount(6);
 for(const tile of await page.locator('.clock-tile').all()){
  const buttons=tile.locator('.timer-controls button');
  await expect(buttons).toHaveCount(4);
  for(const button of await buttons.all()){
   await expect(button).toHaveText('');
   expect(await button.getAttribute('aria-label')).toBeTruthy();
   await expect(button.locator('svg').first()).toBeAttached();
  }
 }
 for(const [width,columns] of [[390,1],[900,2],[1800,2]]){
  await page.setViewportSize({width,height:1000});
  expect(await page.locator('#clock-grid').evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(columns);
 }
 await page.locator('#stopwatch-focus').click();
 for(const [width,columns] of [[390,1],[650,2],[900,3],[1200,4],[1500,5],[1800,6]]){
  await page.setViewportSize({width,height:1000});
  expect(await page.locator('#clock-grid').evaluate(element=>getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(columns);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.locator('.extra-clock').last().locator('[data-action=show]').click();
 await expect(page.locator('#selected-clock')).toHaveText('Stoppuhr 6');
});

test('all clock tiles have matching layout without a first-clock status message',async({page})=>{
 await page.goto('/de/');
 await page.locator('#add-clock').click();
 await expect(page.locator('#measurement-status')).toHaveCount(0);
 await expect(page.getByText('Bereit, wenn du es bist.',{exact:true})).toHaveCount(0);
 expect(await page.locator('#primary-clock #wake-status').count()).toBe(0);
 await page.setViewportSize({width:1200,height:1000});
 for(const focus of [false,true]){
  if(focus)await page.locator('#stopwatch-focus').click();
  const primary=await page.locator('#primary-clock .timer-controls').boundingBox();
  const extra=await page.locator('.extra-clock .timer-controls').boundingBox();
  expect(primary!.y).toBeCloseTo(extra!.y,0);
 }
});

test('global icon controls capture simultaneous laps only for running clocks',async({page})=>{
 await page.addInitScript(()=>{(window as any).testNow=1000;Date.now=()=>(window as any).testNow;});
 await page.goto('/de/');
 await page.locator('#add-clock').click();
 await page.locator('#add-clock').click();
 for(const button of await page.locator('.multi-toolbar button').all()){
  await expect(button).toHaveText('');
  expect(await button.getAttribute('aria-label')).toBeTruthy();
  await expect(button.locator('svg')).toHaveCount(1);
 }
 await expect(page.locator('#lap-all')).toBeDisabled();
 await page.locator('#start-all').click();
 await page.evaluate(()=>{(window as any).testNow+=2000;});
 await page.locator('.extra-clock').last().locator('[data-action=toggle]').click();
 await page.locator('#lap-all').click();
 await page.locator('#show-all-laps').click();
 await expect(page.locator('#show-all-laps')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#laps-body tr')).toHaveCount(2);
 for(const row of await page.locator('#laps-body tr').all()){
  await expect(row.locator('td').nth(2)).toHaveText('00:00:02.00');
 }
 await page.locator('.extra-clock').last().locator('[data-action=show]').click();
 await expect(page.locator('#empty-laps')).toBeVisible();
 await expect(page.locator('#show-all-laps')).toHaveAttribute('aria-pressed','false');
 await page.locator('#pause-all').click();
 await expect(page.locator('#lap-all')).toBeDisabled();
});

test('combined clipboard and CSV export share clock columns and lap rows',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).testNow=1000;Date.now=()=>(window as any).testNow;
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).copiedText=text;}}});
 });
 await page.goto('/de/');
 await page.locator('#add-clock').click();
 await page.locator('#start-all').click();
 await page.evaluate(()=>{(window as any).testNow+=1000;});
 await page.locator('#lap-all').click();
 await page.evaluate(()=>{(window as any).testNow+=2000;});
 await page.locator('#lap').click();
 await page.locator('#show-all-laps').click();
 await page.locator('#copy-laps').click();
 expect(await page.evaluate(()=>(window as any).copiedText)).toBe('Runde\tStoppuhr 1\tStoppuhr 2\n1\t00:00:01.00\t00:00:01.00\n2\t00:00:02.00\t');
 const downloading=page.waitForEvent('download');
 await page.locator('#export-laps').click();
 const download=await downloading;
 const {readFile}=await import('node:fs/promises');
 expect(await readFile((await download.path())!,'utf8')).toBe('\uFEFF"Runde","Stoppuhr 1","Stoppuhr 2"\r\n"1","00:00:01.00","00:00:01.00"\r\n"2","00:00:02.00",""\r\n');
});

test('print view contains grouped times and diagram without application controls',async({page})=>{
 await page.goto('/de/');
 await page.locator('#add-clock').click();
 await page.locator('#start-all').click();
 await page.locator('#lap-all').click();
 await page.locator('#show-all-laps').click();
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.print-clock-section')).toHaveCount(2);
 await expect(page.locator('.print-clock-section h3')).toHaveText(['Stoppuhr 1','Stoppuhr 2']);
 for(const section of await page.locator('.print-clock-section').all()){
  await expect(section.locator('th')).toHaveText(['Runde','Rundenzeit','Gesamtzeit']);
  await expect(section.locator('tbody tr')).toHaveCount(1);
  await expect(section.locator('svg')).toBeVisible();
 }
 await expect(page.locator('#print-chart svg')).toBeVisible();
 await expect(page.locator('#print-chart polyline')).toHaveCount(2);
 for(const selector of ['.site-header','.site-footer','.stopwatch-workspace','.guide','.faq','.intro']){
  await expect(page.locator(selector)).toBeHidden();
 }
 await page.emulateMedia({media:'screen'});
 await expect(page.locator('#stopwatch-print')).toBeHidden();
 await expect(page.locator('.stopwatch-workspace')).toBeVisible();
});

test('reset all confirms, preserves clocks and names, and clears every measurement',async({page})=>{
 await page.goto('/de/');
 await page.locator('#add-clock').click();
 await page.locator('.extra-clock input').fill('Training');
 await expect(page.locator('#reset-all')).toBeDisabled();
 await page.locator('#start-all').click();
 await page.locator('#lap-all').click();
 await expect(page.locator('#reset-all')).toBeDisabled();
 await page.locator('#pause-all').click();
 await page.locator('#show-all-laps').click();
 await page.locator('#reset-all').click();
 await expect(page.locator('#reset-title')).toHaveText('Alle Stoppuhren zurücksetzen?');
 await page.locator('#reset-cancel').click();
 await expect(page.locator('#laps-body tr')).toHaveCount(2);
 await page.locator('#reset-all').click();
 await page.locator('#reset-confirm').click();
 await expect(page.locator('.clock-tile')).toHaveCount(2);
 await expect(page.locator('.extra-clock input')).toHaveValue('Training');
 await expect(page.locator('#elapsed')).toHaveText('00:00:00.00');
 await expect(page.locator('.extra-clock [data-readout]')).toHaveText('00:00:00.00');
 await expect(page.locator('#laps-body tr')).toHaveCount(0);
 await expect(page.locator('#lap-insights')).toBeHidden();
 await expect(page.locator('#reset-all')).toBeDisabled();
 await expect(page.locator('#start-all')).toBeFocused();
 await page.locator('#start-all').click();
 await page.locator('#lap-all').click();
 await expect(page.locator('#laps-body tr')).toHaveCount(2);
});

test('print icon opens printing and prepares the report',async({page})=>{
 await page.addInitScript(()=>{(window as any).printCalls=0;window.print=()=>{(window as any).printCalls++;};});
 await page.goto('/de/');
 const button=page.locator('#print-stopwatch');
 await expect(button).toHaveAccessibleName('Drucken');
 await expect(button).toHaveAttribute('title','Drucken');
 await expect(button.locator('svg')).toHaveCount(1);
 await button.click();
 expect(await page.evaluate(()=>(window as any).printCalls)).toBe(1);
 await expect(page.locator('#print-laps th')).toHaveText(['Runde','Rundenzeit','Gesamtzeit']);
 await page.locator('#stopwatch-focus').click();
 await expect(button).toBeVisible();
 await button.click();
 expect(await page.evaluate(()=>(window as any).printCalls)).toBe(2);
});

test('printed charts show the numeric average for each stopwatch',async({page})=>{
 await page.addInitScript(()=>{(window as any).testNow=1000;Date.now=()=>(window as any).testNow;});
 await page.goto('/de/');
 await page.locator('#toggle-timing').click();
 await page.evaluate(()=>{(window as any).testNow+=1000;});
 await page.locator('#lap').click();
 await page.evaluate(()=>{(window as any).testNow+=3000;});
 await page.locator('#lap').click();
 await expect(page.locator('#print-chart .lap-chart-legend')).toContainText('Durchschnitt: 00:00:02.00');
 await page.locator('#add-clock').click();
 await page.locator('.extra-clock [data-action=toggle]').click();
 await page.evaluate(()=>{(window as any).testNow+=5000;});
 await page.locator('.extra-clock [data-action=lap]').click();
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.print-clock-section').nth(0).locator('.lap-chart-legend')).toContainText('Durchschnitt: 00:00:02.00');
 await expect(page.locator('.print-clock-section').nth(1).locator('.lap-chart-legend')).toContainText('Durchschnitt: 00:00:05.00');
});
