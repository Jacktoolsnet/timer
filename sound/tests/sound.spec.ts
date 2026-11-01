import {test,expect} from '@playwright/test';
test('drawing, audio and appearance',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('h1')).toHaveText('Zeichne deinen Rhythmus');
 await page.locator('#clear').click();
 await expect(page.locator('.count').first()).toHaveText('0 / 16');
 await page.locator('#drawing').scrollIntoViewIfNeeded();
 const r=await page.locator('#drawing').boundingBox();if(!r)throw Error('Missing drawing');
 await page.mouse.move(r.x+20,r.y+20);await page.mouse.down();
 for(let n=1;n<15;n++)await page.mouse.move(r.x+r.width*n/16,r.y+20);
 await page.mouse.up();
 await expect(page.locator('.count').first()).not.toHaveText('0 / 16');
 await page.locator('#play').click();await expect(page.locator('#play')).toHaveAttribute('aria-pressed','true');
 await page.waitForTimeout(500);await page.locator('#play').click();
 await expect(page.locator('#play')).toHaveAttribute('aria-pressed','false');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#theme-light').click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await expect(page.locator('.dot-0')).toHaveCSS('background-color','rgb(0, 134, 155)');
 await page.locator('#theme').click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.locator('#preferences-close').click();
 await page.locator('#focus').click();await expect(page.locator('body')).toHaveClass(/focus-view/);
 await page.locator('#focus').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'test-results/'+info.project.name+'.png',fullPage:true});
 expect(errors).toEqual([]);
});
for(const lang of ['en','es','fr'])test('localized '+lang,async({page})=>{
 await page.goto('/'+lang+'/');await expect(page.locator('html')).toHaveAttribute('lang',lang);
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://sound.jacktools.net/'+lang+'/');
});
test('all instruments can replace a track without losing points',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 const track=page.locator('[data-track="0"]');
 const count=await track.locator('.count').textContent();
 await track.locator('summary').click();
 await page.locator('#tempo').fill('180');
 await page.locator('#tempo').dispatchEvent('input');
 await page.locator('#play').click();
 const select=track.locator('select');
 const ids=await select.locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));
 expect(ids).toHaveLength(14);
 for(const id of ids){
  await select.selectOption(id,{force:true});
  await expect(track.locator('.count')).toHaveText(count!);
  await page.waitForTimeout(400);
 }
 await page.locator('#play').click();
 expect(errors).toEqual([]);
});
test('eight optional orbits and drawing on added tracks',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('.instrument')).toHaveCount(8);
 await expect(page.locator('.instrument[data-enabled=true]')).toHaveCount(5);
 for(let i=5;i<8;i++){
  const row=page.locator('[data-track="'+i+'"]');
  await row.locator('summary').click();await row.locator('.track-enabled').check();
 }
 await expect(page.locator('.instrument[data-enabled=true]')).toHaveCount(8);
 await page.locator('#clear').click();
 await page.locator('#drawing').scrollIntoViewIfNeeded();
 const r=await page.locator('#drawing').boundingBox();if(!r)throw Error('No drawing surface');
 await page.mouse.move(r.x+r.width*.6,r.y+r.height*.95);await page.mouse.down();await page.mouse.up();
 await expect(page.locator('[data-track="7"] .count')).not.toHaveText('0 / 16');
 await page.locator('[data-track="7"] .track-enabled').uncheck();
 await expect(page.locator('[data-track="7"]')).toHaveAttribute('data-enabled','false');
 await page.locator('[data-track="7"] .track-enabled').check();
 await expect(page.locator('[data-track="7"] .count')).not.toHaveText('0 / 16');
 for(let i=0;i<8;i++){
  const row=page.locator('[data-track="'+i+'"]');
  if(!(await row.getAttribute('open')!==null))await row.locator('summary').click();
  await row.locator('.track-enabled').uncheck();
 }
 await expect(page.locator('.instrument[data-enabled=true]')).toHaveCount(0);
 await page.locator('#drawing').scrollIntoViewIfNeeded();await page.locator('#drawing').click();
 await page.locator('#play').click();await page.waitForTimeout(150);await page.locator('#play').click();
 expect(errors).toEqual([]);
});

test('styled dropdown keyboard selection and slide toggles',async({page})=>{
 await page.goto('/de/');
 const row=page.locator('[data-track="0"]');
 await row.locator('summary').click();
 const trigger=row.locator('.clock-select-trigger');
 await expect(trigger).toHaveAccessibleName(/Instrument.*Kick/);
 await trigger.click();
 await expect(row.locator('[role=listbox]')).toBeVisible();
 await page.keyboard.press('End');await page.keyboard.press('Enter');
 await expect(row.locator('.instrument-name')).toHaveText('Flächenklang');
 await expect(trigger).toHaveAttribute('aria-expanded','false');
 await trigger.press('ArrowDown');await page.keyboard.press('Escape');
 await expect(trigger).toBeFocused();
 const mute=row.locator('.mute');
 await mute.check();await expect(mute).toBeChecked();
 await mute.uncheck();await expect(mute).not.toBeChecked();
 await expect(mute).toHaveAttribute('role','switch');
});
