import {test,expect} from '@playwright/test';
test('lamp controls, rendering and layout',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('h1')).toHaveText('Online-Lavalampe zum Entspannen');
 await expect(page.locator('#lava-toggle')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('#lava-stage')).not.toHaveClass(/no-webgl/);
 await page.locator('#lava-toggle').click();
 await expect(page.locator('#lava-toggle')).toHaveAccessibleName('Pausieren');
 await page.waitForTimeout(300);
 await page.locator('#lava-colour-picker summary').click();
 await page.getByText('Lagune',{exact:true}).click();
 await page.locator('#lava-speed').fill('0.5');
 await expect(page.locator('#speed-value')).toHaveText('0.5×');
 await page.locator('#lava-brightness').fill('60');
 await expect(page.locator('#brightness-value')).toHaveText('60 %');
 await page.locator('#lava-toggle').click();
 await expect(page.locator('#lava-toggle')).toHaveAccessibleName('Starten');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
 await page.screenshot({path:'/tmp/lava-'+test.info().project.name+'.png',fullPage:true});
});
test('reduced motion and storage opt-in',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/de/');
 await expect(page.locator('#lava-status')).toContainText('reduziert');
 expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.lava.storage-consent.v1'))).toBe('yes');
});
test('static fallback when WebGL is unavailable',async({page})=>{
 await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext;});
 await page.goto('/en/');
 await expect(page.locator('#lava-stage')).toHaveClass(/no-webgl/);
 await expect(page.locator('.fallback')).toBeVisible();
});

test('focus label and palette-aware sliders',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('#lava-fullscreen')).toHaveText('Fokusansicht');
 await expect(page.locator('#lava-stage #lava-fullscreen')).toBeVisible();
 await expect(page.locator('#lava-stage #lava-toggle')).toHaveAccessibleName('Starten');
 const stage=await page.locator('#lava-stage').boundingBox();
 const focus=await page.locator('#lava-fullscreen').boundingBox();
 expect(focus!.x+focus!.width).toBeGreaterThan(stage!.x+stage!.width-30);
 expect(focus!.y).toBeLessThan(stage!.y+30);
 const slider=page.locator('#lava-speed');
 const initial=await slider.evaluate(el=>getComputedStyle(el).accentColor);
 await page.locator('#palette-dropdown summary').click();
 await page.locator('[name=colorScheme][value=violet]').check();
 const selected=await slider.evaluate(el=>getComputedStyle(el).accentColor);
 expect(selected).not.toBe(initial);
 const brightness=await page.locator('#lava-brightness').evaluate(el=>getComputedStyle(el).accentColor);
 expect(brightness).toBe(selected);
});

test('focus controls hide after inactivity and return on interaction',async({page})=>{
 await page.goto('/de/');
 await page.locator('#lava-fullscreen').click();
 await expect(page.locator('#lava-stage')).toHaveJSProperty('id','lava-stage');
 // Some mobile browsers do not expose fullscreen.
 if (!await page.evaluate(()=>!!document.fullscreenElement)) return;
 await page.locator('#lava-stage').click({position:{x:30,y:100}});
 await expect(page.locator('#lava-toggle')).toHaveCSS('opacity','0',{timeout:5000});
 await expect(page.locator('#exit-fullscreen')).toHaveCSS('opacity','0');
 await page.locator('#lava-stage').dispatchEvent('pointermove');
 await expect(page.locator('#lava-toggle')).toHaveCSS('opacity','1');
 await page.keyboard.press('Tab');
 await expect(page.locator('#lava-toggle')).toHaveCSS('opacity','1');
 await page.keyboard.press('Escape');
 await expect(page.locator('#lava-stage')).not.toHaveClass(/focus-controls-hidden/);
});

test('settings cards have equal height when sharing a row',async({page})=>{
 await page.goto('/de/');
 const cards=await page.locator('.lava-controls .settings-tile').all();
 const boxes=await Promise.all(cards.map(card=>card.boundingBox()));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  if(Math.abs(boxes[i]!.y-boxes[j]!.y)<1)
   expect(Math.abs(boxes[i]!.height-boxes[j]!.height)).toBeLessThan(1);
 }
});

test('rainbow palette runs and switches back to a single colour',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/de/');
 await page.locator('#lava-colour-picker summary').click();
 await page.getByText('Regenbogen',{exact:true}).click();
 await expect(page.locator('#lava-stage')).toHaveAttribute('data-rainbow','true');
 await expect(page.locator('#lava-colour-value')).toHaveText('Regenbogen');
 await expect(page.locator('#lava-stage')).not.toHaveClass(/no-webgl/);
 await page.locator('#lava-toggle').click();
 await page.waitForTimeout(400);
 await page.locator('#lava-toggle').click();
 await page.locator('#lava-colour-picker summary').click();
 await page.getByText('Glut',{exact:true}).click();
 await expect(page.locator('#lava-stage')).toHaveAttribute('data-rainbow','false');
 expect(errors).toEqual([]);
});

test('portrait focus resizes the canvas while paused',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/de/');
 await page.locator('#lava-fullscreen').click();
 if(!await page.evaluate(()=>!!document.fullscreenElement)){
  // Headless/mobile emulation may deny native fullscreen. Exercise its geometry.
  await page.locator('#lava-stage').evaluate(el=>Object.assign(el.style,{
   position:'fixed',inset:'0',width:'100vw',height:'100dvh',zIndex:'100',borderRadius:'0'
  }));
 }
 await expect.poll(()=>page.locator('#lava-canvas').evaluate((el:HTMLCanvasElement)=>{
  const rect=el.getBoundingClientRect();
  return Math.abs(el.width/el.height-rect.width/rect.height);
 })).toBeLessThan(.01);
 await expect(page.locator('#lava-stage')).not.toHaveClass(/no-webgl/);
 await expect(page.locator('#lava-toggle')).toHaveAttribute('aria-pressed','false');
 await page.screenshot({path:'/tmp/lava-portrait-focus-'+test.info().project.name+'.png'});
});

test('animation preferences persist only with consent, never autoplay',async({page})=>{
 await page.goto('/de/');
 await page.locator('#lava-colour-picker summary').click();
 await page.getByText('Regenbogen',{exact:true}).click();
 await page.locator('#lava-speed').fill('0.5');
 await page.locator('#lava-brightness').fill('60');
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.lava.settings.v1'))).toBeNull();
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#lava-colour-value')).toHaveText('Regenbogen');
 await expect(page.locator('#lava-speed')).toHaveValue('0.5');
 await expect(page.locator('#lava-brightness')).toHaveValue('60');
 await expect(page.locator('#lava-toggle')).toHaveAttribute('aria-pressed','false');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').uncheck();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.lava.settings.v1'))).toBeNull();
 await page.reload();
 await expect(page.locator('#lava-colour-value')).toHaveText('Glut');
 await expect(page.locator('#lava-speed')).toHaveValue('1');
});

test('metallic and oil palettes render and oil preference persists',async({page})=>{
 await page.goto('/de/');
 for(const [label,material] of [['Silber / Metall','silver'],['Kupfer','copper'],['Gold','gold'],['Ölschimmer','oil']]){
  await page.locator('#lava-colour-picker summary').click();
  await page.getByText(label,{exact:true}).click();
  await expect(page.locator('#lava-colour-value')).toHaveText(label);
  await expect(page.locator('#lava-stage')).toHaveAttribute('data-material',material);
  await expect(page.locator('#lava-stage')).not.toHaveClass(/no-webgl/);
 }
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#lava-colour-value')).toHaveText('Ölschimmer');
 await expect(page.locator('#lava-stage')).toHaveAttribute('data-material','oil');
 await expect(page.locator('#lava-toggle')).toHaveAttribute('aria-pressed','false');
});

test('carrier liquid and viscosity can be changed and remembered',async({page})=>{
 await page.goto('/de/');
 await page.locator('#fluid-picker summary').click();
 await page.locator('[name=fluid-color][value="3"]').check();
 await expect(page.locator('#fluid-value')).toHaveText('Bernstein');
 await page.locator('#lava-viscosity').fill('80');
 await expect(page.locator('#viscosity-value')).toHaveText('80 %');
 await expect(page.locator('#lava-stage')).not.toHaveClass(/no-webgl/);
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.lava.settings.v1'))).toBeNull();
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#fluid-value')).toHaveText('Bernstein');
 await expect(page.locator('#lava-viscosity')).toHaveValue('80');
 await expect(page.locator('#lava-toggle')).toHaveAttribute('aria-pressed','false');
 await page.locator('#lava-toggle').click();
 await page.waitForTimeout(250);
 await page.locator('#lava-toggle').click();
 await expect(page.locator('#lava-stage')).not.toHaveClass(/no-webgl/);
});

test('presets apply together, preserve pause and allow custom settings',async({page})=>{
 await page.goto('/de/');
 await page.locator('#lava-preset-picker summary').click();
 await page.getByText('Goldrausch',{exact:true}).click();
 await expect(page.locator('#lava-preset-value')).toHaveText('Goldrausch');
 await expect(page.locator('#lava-colour-value')).toHaveText('Gold');
 await expect(page.locator('#fluid-value')).toHaveText('Bernstein');
 await expect(page.locator('#lava-viscosity')).toHaveValue('80');
 await expect(page.locator('#lava-speed')).toHaveValue('0.6');
 await expect(page.locator('#lava-brightness')).toHaveValue('90');
 await expect(page.locator('#lava-toggle')).toHaveAttribute('aria-pressed','false');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#lava-preset-value')).toHaveText('Goldrausch');
 await page.locator('#lava-speed').fill('0.9');
 await expect(page.locator('#lava-preset-value')).toHaveText('Benutzerdefiniert');
 await page.reload();
 await expect(page.locator('#lava-preset-value')).toHaveText('Benutzerdefiniert');
 await expect(page.locator('#lava-speed')).toHaveValue('0.9');
});

test('living lava switches default on, react to strokes and persist',async({page})=>{
 test.setTimeout(60000);
 await page.goto('/de/');
 await expect(page.locator('#lava-touch')).toBeChecked();
 await expect(page.locator('#lava-evolution')).toBeChecked();
 await expect(page.locator('#lava-stage')).not.toHaveClass(/no-webgl/);
 await page.locator('#lava-toggle').click();
 await expect(page.locator('#lava-stage')).toHaveCSS('touch-action','none');
 const box=(await page.locator('#lava-canvas').boundingBox())!;
 await page.mouse.move(box.x+box.width*.4,box.y+box.height*.4);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5,{steps:5});
 await page.mouse.up();
 await page.locator('#lava-toggle').click();
 await page.locator('#lava-touch').uncheck();
 await page.locator('#lava-evolution').uncheck();
 await expect(page.locator('#lava-stage')).toHaveCSS('touch-action','auto');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#lava-touch')).not.toBeChecked();
 await expect(page.locator('#lava-evolution')).not.toBeChecked();
 await expect(page.locator('#lava-toggle')).toHaveAttribute('aria-pressed','false');
});

test('bubble sounds default on and persist when disabled',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/de/');
 await expect(page.locator('#lava-sound')).toBeChecked();
 await expect(page.locator('#lava-toggle')).toHaveAttribute('aria-pressed','false');
 await page.locator('#lava-sound').uncheck();
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#lava-sound')).not.toBeChecked();
 await page.locator('#lava-toggle').click();
 await page.locator('#lava-sound').check();
 await page.locator('#lava-sound').uncheck();
 await page.locator('#lava-toggle').click();
 expect(errors).toEqual([]);
});

test('bubble volume is adjustable and remembered without autoplay',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('#lava-volume')).toHaveValue('50');
 await page.locator('#lava-volume').fill('75');
 await expect(page.locator('#volume-value')).toHaveText('75 %');
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.lava.settings.v1'))).toBeNull();
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#lava-volume')).toHaveValue('75');
 await expect(page.locator('#volume-value')).toHaveText('75 %');
 await expect(page.locator('#lava-toggle')).toHaveAttribute('aria-pressed','false');
 await page.locator('#lava-volume').fill('0');
 await expect(page.locator('#volume-value')).toHaveText('0 %');
});

test('bubble trail draws on drag, clears when disabled and remembers choice',async({page})=>{
 test.setTimeout(60000);
 await page.goto('/de/');
 await expect(page.locator('#lava-trail')).toBeChecked();
 await page.locator('#lava-shedding').uncheck();
 await page.locator('#lava-sound').uncheck();
 await page.locator('#lava-toggle').click();
 const box=(await page.locator('#lava-canvas').boundingBox())!;
 await page.mouse.move(box.x+box.width*.3,box.y+box.height*.5);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.65,box.y+box.height*.45,{steps:8});
 await page.mouse.up();
 const hasTrail=()=>page.locator('#lava-trail-canvas').evaluate((el:HTMLCanvasElement)=>{
  const pixels=el.getContext('2d')!.getImageData(0,0,el.width,el.height).data;
  return pixels.some((value,index)=>index%4===3&&value>0);
 });
 await expect.poll(hasTrail).toBe(true);
 await page.locator('#lava-toggle').click();
 await page.locator('#lava-trail').uncheck();
 await expect.poll(hasTrail).toBe(false);
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#lava-trail')).not.toBeChecked();
});


test('shedding and writing trail can be selected independently',async({page})=>{
 await page.goto('/de/');
 await expect(page.locator('#lava-shedding')).toBeChecked();
 await expect(page.locator('#lava-trail')).toBeChecked();
 await page.locator('#lava-trail').uncheck();
 await expect(page.locator('#lava-shedding')).toBeChecked();
 await page.locator('#lava-trail').check();
 await page.locator('#lava-shedding').uncheck();
 await expect(page.locator('#lava-trail')).toBeChecked();
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 await page.reload();
 await expect(page.locator('#lava-shedding')).not.toBeChecked();
 await expect(page.locator('#lava-trail')).toBeChecked();
});
