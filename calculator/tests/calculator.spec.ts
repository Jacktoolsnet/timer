import {test,expect,type Page} from '@playwright/test';
// Existing editing/layout scenarios explicitly exercise the detailed view.
test.beforeEach(async({page},info)=>{await page.goto('/de/');if(!info.title.startsWith('default tape'))await optionAction(page,()=>page.locator('#simple-tape').uncheck());await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));});
async function optionAction(page:Page,action:()=>Promise<unknown>){await page.locator('#calculator-settings').click();await action();await page.locator('#calculator-options').press('Escape');}
async function selectOperation(page:Page,operation:string){const keys:Record<string,string>={add:'+',subtract:'−',multiply:'×',divide:'÷'};if(keys[operation])await page.locator(`[data-key="${keys[operation]}"]`).click();else await page.locator(`[data-operation="${operation}"]`).click();}
async function add(page:Page,value:string,operation?:string,name?:string){if(operation)await selectOperation(page,operation);await page.locator('#value').fill(value);if(name)await page.locator('#step-name').fill(name);await page.locator('#add-step').click();}
test('sequential arithmetic, edit, disable, undo, delete and move',async({page})=>{
 await add(page,'100','set','Einkauf');await add(page,'20','add','Versand');await add(page,'2','multiply','Menge');await expect(page.locator('#result')).toHaveText('240,00');
 await page.locator('.tape-step').nth(1).getByRole('button',{name:/Bearbeiten:/}).click();await page.locator('#value').fill('30');await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('260,00');
 await page.locator('.tape-step').nth(1).getByRole('switch').uncheck();await expect(page.locator('#result')).toHaveText('200,00');await page.locator('#undo').click();await expect(page.locator('#result')).toHaveText('260,00');await page.locator('#redo').click();await expect(page.locator('#result')).toHaveText('200,00');
 await page.locator('.tape-step').nth(1).getByRole('switch').check();await page.locator('.tape-step').nth(2).getByRole('button',{name:/Nach oben:/}).click();await expect(page.locator('#result')).toHaveText('230,00');
 await page.locator('.tape-step').nth(2).getByRole('button',{name:/Löschen:/}).click();await expect(page.locator('#result')).toHaveText('200,00');
});
test('keyboard and keypad table calculator flow',async({page})=>{await page.locator('#value').fill('100');await page.locator('#value').press('+');await page.locator('#value').fill('20');await page.locator('#value').press('*');await page.locator('#value').fill('2');await page.locator('#value').press('Enter');await expect(page.locator('#result')).toHaveText('240,00');});
test('invalid input, divide by zero, recovery, insertion and rounding',async({page})=>{
 await add(page,'1');await add(page,'0','divide');await expect(page.locator('.step-result').last()).toHaveText('Division durch null');await add(page,'3','add');await expect(page.locator('.step-result').last()).toHaveText('Vorherigen Schritt korrigieren');await page.locator('.tape-step').nth(1).getByRole('switch').uncheck();await expect(page.locator('#result')).toHaveText('4,00');
 await page.locator('.tape-step').nth(2).getByRole('button',{name:/Davor einfügen:/}).click();await page.locator('#value').fill('3');await selectOperation(page,'divide');await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('3,33');await optionAction(page,()=>page.locator('#round-each').check());await expect(page.locator('#result')).toHaveText('3,33');await expect(page.locator('.tape-step')).toHaveCount(4);
 await page.locator('#value').fill('1.2.3');await page.locator('#add-step').click();await expect(page.locator('.tape-step')).toHaveCount(4);
});
test('explicit saving, restore and clear',async({page})=>{
 await add(page,'42');expect(await page.evaluate(()=>localStorage.getItem('jacktools.calculator.document.v1'))).toBeNull();await optionAction(page,()=>page.locator('#remember-calculation').check());await page.reload();await expect(page.locator('#result')).toHaveText('42,00');
 await page.locator('#privacy-open').click();await page.locator('#clear-storage').click();await expect(page.locator('#remember-calculation')).not.toBeChecked();expect(await page.evaluate(()=>localStorage.getItem('jacktools.calculator.document.v1'))).toBeNull();
});
test('theme, palette, style, title and print rendering',async({page})=>{
 await page.locator('#palette-dropdown summary').click();await page.locator('#theme').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.locator('[name=colorScheme][value=blue]').check({force:true});await page.locator('[name=visualStyle][value=technical]').check({force:true});await page.locator('#preferences-close').click();await add(page,'119','set','Brutto');await add(page,'19','taxOut','Netto');await expect(page.locator('#result')).toHaveText('100,00');
 await page.locator('#edit-calculation-title').click();await page.locator('#calculation-title').fill('<img src=x onerror=alert(1)>');await page.locator('#calculation-title-form').getByRole('button',{name:'Speichern',exact:true}).click();await page.emulateMedia({media:'print'});await expect(page.locator('#print-calculation')).toBeVisible();await expect(page.locator('#print-title')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('#print-rows tr')).toHaveCount(2);await expect(page.locator('#print-title img')).toHaveCount(0);
});
test('all languages and narrow layout',async({page})=>{for(const lang of ['en','de','es','fr']){await page.goto('/'+lang+'/');await expect(page.locator('html')).toHaveAttribute('lang',lang);await expect(page.locator('#calculator-app')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}});
test('editable JSON export and import, malformed files',async({page})=>{
 await add(page,'123.45','set','Test');const download=page.waitForEvent('download');await page.locator('#export').click();expect((await download).suggestedFilename()).toMatch(/\.json$/);
 page.on('dialog',d=>d.accept());await page.locator('#import-file').setInputFiles({name:'calc.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,title:'Imported',decimals:2,roundEach:false,steps:[{id:'one',name:'Value',operation:'set',value:'50',enabled:true}]}))});await expect(page.locator('#result')).toHaveText('50,00');await page.locator('#undo').click();await expect(page.locator('#result')).toHaveText('123,45');
 await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{}')});await expect(page.locator('#export-status')).toContainText('Keine gültige');await expect(page.locator('#result')).toHaveText('123,45');
});
test('drag reordering and new calculation undo',async({page})=>{await add(page,'100');await add(page,'20','add');await add(page,'2','multiply');await page.locator('.tape-step').nth(1).scrollIntoViewIfNeeded();await page.locator('.tape-step').nth(2).dragTo(page.locator('.tape-step').nth(1),{sourcePosition:{x:10,y:20},targetPosition:{x:10,y:20}});await expect(page.locator('#result')).toHaveText('220,00');await page.locator('#new').click();await page.locator('#confirm-new-calculation').click();await expect(page.locator('.tape-step')).toHaveCount(0);await page.locator('#undo').click();await expect(page.locator('#result')).toHaveText('220,00');});
test('notes and subtotal preserve value; negative entry',async({page})=>{await add(page,'-12.5');await selectOperation(page,'note');await page.locator('#step-name').fill('Notiz');await expect(page.locator('#value')).toBeDisabled();await page.locator('#add-step').click();await selectOperation(page,'subtotal');await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('-12,50');});
test('appearance consent is independent from calculation saving',async({page})=>{await add(page,'42');await optionAction(page,()=>page.locator('#remember-calculation').check());await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#remember-preferences').uncheck();await page.locator('#preferences-close').click();await expect(page.locator('#remember-calculation')).toBeChecked();await page.reload();await expect(page.locator('#result')).toHaveText('42,00');});
test('browser storage denied does not break calculation',async({page})=>{await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('blocked');};Storage.prototype.setItem=()=>{throw new Error('blocked');};});await page.reload();await add(page,'42');await expect(page.locator('#result')).toHaveText('42,00');await optionAction(page,()=>page.locator('#remember-calculation').click());await expect(page.locator('#remember-calculation')).not.toBeChecked();await expect(page.locator('#calc-status')).toContainText('Browserspeicher');});
test('large font and small screen have no horizontal overflow',async({page})=>{await page.setViewportSize({width:320,height:800});await page.locator('#palette-dropdown summary').click();await page.locator('#font-size').fill('3');await page.locator('#preferences-close').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);});

test('special keys replace dropdown, preserve input, and show detailed help',async({page})=>{
 await expect(page.locator('select#operation')).toHaveCount(0);
 await expect(page.locator('[data-operation]')).toHaveCount(7);
 await add(page,'200');
 await page.locator('#value').fill('10');
 await page.locator('[data-operation=discount]').click();
 await expect(page.locator('#value')).toHaveValue('10');
 await expect(page.locator('[data-operation=discount]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#operation-label')).toHaveText('Prozentrabatt');
 await page.locator('#operation-explain').click();await expect(page.locator('#operation-tip-discount')).toBeVisible();
 await expect(page.locator('#operation-tip-discount')).toContainText('200 und Eingabe 10 → 180');await page.locator('#operation-explanation').press('Escape');
 await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('180,00');
 await expect(page.locator('[data-key="+"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('.tape-step').last().getByRole('button',{name:/Bearbeiten:/}).click();
 await expect(page.locator('[data-operation=discount]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-operation=increase]').click();await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('220,00');
});
test('explanations open only on explicit info clicks and support keyboard closing',async({page},testInfo)=>{
 const key=page.locator('[data-operation=taxOut]');await key.focus();await expect(page.locator('#operation-explanation')).toBeHidden();
 if(testInfo.project.name==='desktop'){await key.hover();await expect(page.locator('#operation-explanation')).toBeHidden();}
 await key.click();await expect(page.locator('#operation-explanation')).toBeHidden();
 await page.locator('#operation-explain').focus();await page.keyboard.press('Enter');await expect(page.locator('#operation-explanation')).toBeVisible();
 await expect(page.locator('#operation-tip-taxOut')).toContainText('119 brutto');
 await page.keyboard.press('Escape');await expect(page.locator('#operation-explanation')).toBeHidden();await expect(page.locator('#operation-explain')).toBeFocused();
 await expect(page.locator('#steps li')).toHaveCount(0);
});
test('switching from a note to a standard operator does not add an accidental note',async({page})=>{await add(page,'100');await page.locator('#value').fill('10');await page.locator('[data-operation=note]').click();await page.locator('[data-key="+"]').click();await expect(page.locator('.tape-step')).toHaveCount(1);await expect(page.locator('#value')).toBeEnabled();await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('110,00');});

test('special keys match standard operator height and row spacing',async({page})=>{
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const scale of ['0','3']){
   await page.locator('html').evaluate((element,scale)=>{(element as HTMLElement).dataset.fontSize=scale;},scale);
   const boxes=await page.locator('.special-key, .operator-key').evaluateAll(elements=>elements.map(element=>({special:element.classList.contains('special-key'),...element.getBoundingClientRect().toJSON()})));
   const standard=boxes.filter(box=>!box.special), special=boxes.filter(box=>box.special);
   for(const box of special)expect(box.height).toBeCloseTo(standard[0].height,3);
   for(let i=0;i<standard.length;i++)expect(special[i].top).toBeCloseTo(standard[i].top,3);
   expect(special[1].top-special[0].top).toBeCloseTo(standard[1].top-standard[0].top,3);
  }
 }
});

test('gross and net are distinct named steps with editable tax rates',async({page})=>{
 await add(page,'100','set');await page.locator('[data-operation=taxIn]').click();
 await expect(page.locator('#operation-tip-taxIn')).toContainText('100 netto und Eingabe 19 → 119 brutto');
 await page.locator('#value').fill('19');await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('119,00');
 await expect(page.locator('.step-name').last()).toHaveText('Steuer hinzufügen / Brutto');
 await add(page,'19','taxOut');await expect(page.locator('#result')).toHaveText('100,00');
 await page.locator('.tape-step').nth(1).getByRole('button',{name:/Bearbeiten:/}).click();await expect(page.locator('[data-operation=taxIn]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-operation=increase]')).toHaveAttribute('aria-pressed','false');
 await page.locator('#value').fill('7');await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('89,92');
 await page.locator('.tape-step').nth(2).getByRole('switch').uncheck();await expect(page.locator('#result')).toHaveText('107,00');
 await optionAction(page,()=>page.locator('#remember-calculation').check());await page.reload();await expect(page.locator('#result')).toHaveText('107,00');
});

test('options open in a modal with keyboard closing and focus restoration',async({page})=>{
 const options=page.getByRole('dialog',{name:'Optionen',exact:true});
 await expect(options).toBeHidden();await expect(page.locator('.calc-toolbar')).toHaveCount(0);
 for(const id of ['new','undo','redo','calculator-settings'])await expect(page.locator('.calc-keypad #'+id)).toHaveCount(1);
 await add(page,'1.005','set');await page.locator('#calculator-settings').click();
 await expect(options).toBeVisible();await expect(options.locator('#trigger-decimals')).toBeVisible();await expect(options.locator('#round-each')).toBeVisible();await expect(options.locator('#remember-calculation')).toBeVisible();
 await expect(page.locator('.calc-card #decimals')).toHaveCount(0);
 await options.locator('#trigger-decimals').click();await options.getByRole('option',{name:'3',exact:true}).click();await expect(page.locator('#result')).toHaveText('1,005');
 await options.press('Escape');await expect(options).toBeHidden();await expect(page.locator('#calculator-settings')).toBeFocused();
 await page.locator('#calculator-settings').click();await options.getByRole('button',{name:'Schließen',exact:true}).click();await expect(options).toBeHidden();
 await expect(page.locator('.tape-step')).toHaveCount(1);
});

test('calculator follows a long tape on desktop but not in stacked mobile layout',async({page},testInfo)=>{
 const document={version:1,title:'Long tape',decimals:2,roundEach:false,steps:Array.from({length:30},(_,i)=>({id:'step-'+i,name:'Step '+i,operation:i?'add':'set',value:'10',enabled:true}))};
 await page.locator('#import-file').setInputFiles({name:'long.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});
 const card=page.locator('.calc-card');
 if(testInfo.project.name==='desktop'){
  await expect(card).toHaveCSS('position','sticky');
  const initial=await card.boundingBox();await page.evaluate(y=>window.scrollTo(0,y),initial!.y+500);
  await expect.poll(async()=>Math.round((await card.boundingBox())!.y)).toBe(20);
  await expect(page.locator('.calc-settings')).not.toBeInViewport();
  await page.setViewportSize({width:1440,height:600});
  expect((await card.boundingBox())!.height).toBeLessThanOrEqual(560);
  expect(await card.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
  await page.locator('#add-step').scrollIntoViewIfNeeded();await expect(page.locator('#add-step')).toBeInViewport();
 }else{
  await expect(card).toHaveCSS('position','static');await expect(card).toHaveCSS('max-height','none');
 }
});

test('undo and redo share a row; action colours follow every palette and theme',async({page})=>{
 const undo=await page.locator('#undo').boundingBox(),redo=await page.locator('#redo').boundingBox();
 expect(undo!.y).toBeCloseTo(redo!.y,3);expect(undo!.height).toBeCloseTo(redo!.height,3);expect(redo!.x).toBeGreaterThan(undo!.x);
 await page.addStyleTag({content:'.calc-action-key{transition:none!important}'});
 const colours=new Set<string>();
 for(const theme of ['light','dark'])for(const palette of ['terracotta','blue','green','orange','red','violet','teal','rose']){
  await page.locator('html').evaluate((element,{theme,palette})=>{(element as HTMLElement).dataset.theme=theme;(element as HTMLElement).dataset.palette=palette;},{theme,palette});
  const data=await page.evaluate(()=>{
   const action=getComputedStyle(document.getElementById('new')!),operation=getComputedStyle(document.querySelector('.operator-key')!);
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d')!;
   const rgb=(color:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3);};
   const luminance=(values:number[])=>values.map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
   const a=luminance(rgb(action.color)),b=luminance(rgb(action.backgroundColor));
   return {colour:action.color,background:action.backgroundColor,arithmetic:operation.backgroundColor,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  });
  expect(data.background).not.toBe(data.arithmetic);expect(data.contrast,theme+' / '+palette).toBeGreaterThanOrEqual(4.5);colours.add(data.colour);
 }
 expect(colours.size).toBe(16);
});

test('focus view works without fullscreen, keeps tools usable, and restores on Escape',async({page})=>{
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Denied'));});
 await add(page,'100');await page.locator('#calculator-focus').click();
 await expect(page.locator('body')).toHaveClass(/calculator-focus-view/);
 await expect(page.locator('#calculator-focus')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#calculator-focus')).toHaveAccessibleName('Fokusansicht beenden');
 for(const selector of ['.site-header','.intro','.site-footer','.calc-guide','.local-note'])await expect(page.locator(selector)).toBeHidden();
 await expect(page.locator('.calc-card')).toBeVisible();await expect(page.locator('.calc-tape')).toBeVisible();
 await add(page,'20','add');await expect(page.locator('#result')).toHaveText('120,00');
 await page.locator('#calculator-settings').click();await expect(page.locator('#calculator-options')).toBeVisible();
 await page.locator('#calculator-options').press('Escape');await expect(page.locator('#calculator-options')).toBeHidden();
 await expect(page.locator('body')).toHaveClass(/calculator-focus-view/);
 await page.locator('#calculator-focus').focus();await page.keyboard.press('Escape');await expect(page.locator('body')).not.toHaveClass(/calculator-focus-view/);
 await expect(page.locator('.site-header')).toBeVisible();await expect(page.locator('#calculator-focus')).toBeFocused();await expect(page.locator('#result')).toHaveText('120,00');
});
test('focus view supports button exit and narrow screens without overflow',async({page})=>{
 await page.evaluate(()=>{document.documentElement.requestFullscreen=undefined as unknown as ()=>Promise<void>;});
 await page.setViewportSize({width:320,height:800});await page.locator('#calculator-focus').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.locator('#calculator-focus').click();await expect(page.locator('#calculator-focus')).toHaveAttribute('aria-pressed','false');await expect(page.locator('.intro')).toBeVisible();
});
test('browser fullscreen exit also exits focus view',async({page})=>{
 await page.locator('#calculator-focus').click();
 const fullscreen=await page.evaluate(()=>!!document.fullscreenElement);
 if(fullscreen){await page.evaluate(()=>document.exitFullscreen());await expect(page.locator('body')).not.toHaveClass(/calculator-focus-view/);}
 else{await expect(page.locator('body')).toHaveClass(/calculator-focus-view/);await page.locator('#calculator-focus').click();}
});

test('options use styled decimal list and keyboard-accessible slide switches',async({page})=>{
 await page.locator('#calculator-settings').click();const dialog=page.locator('#calculator-options');
 await expect(dialog.getByRole('checkbox')).toHaveCount(0);await expect(dialog.getByRole('switch')).toHaveCount(3);
 const round=dialog.getByRole('switch',{name:'Jeden Schritt runden',exact:true});
 await round.focus();await round.press('Space');await expect(round).toBeChecked();await round.press('Space');await expect(round).not.toBeChecked();
 await dialog.locator('#trigger-decimals').focus();await page.keyboard.press('ArrowDown');await expect(dialog.getByRole('listbox')).toBeVisible();
 await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(dialog.locator('#trigger-decimals')).toContainText('8');await expect(page.locator('#result')).toHaveText('0,00000000');
 await dialog.locator('#trigger-decimals').click();await page.keyboard.press('Escape');await expect(dialog.getByRole('listbox')).toBeHidden();await expect(dialog).toBeVisible();
 await dialog.press('Escape');await expect(dialog).toBeHidden();await page.locator('#undo').click();
 await page.locator('#calculator-settings').click();await expect(dialog.locator('#trigger-decimals')).toContainText('2');
});

test('selected operation and info button share the result display',async({page})=>{
 await page.locator('[data-operation=taxIn]').click();
 const panel=page.locator('.calc-display');await expect(panel.locator('#operation-label')).toHaveText('Steuer hinzufügen / Brutto');await expect(panel.locator('.operation-help')).toHaveCount(0);await page.locator('#operation-explain').click();await expect(page.locator('#operation-tip-taxIn')).toBeVisible();await page.locator('#operation-explanation').press('Escape');
 await expect(page.locator('.calc-keypad-layout .operation-help')).toHaveCount(0);
 const explanation=await panel.boundingBox(),value=await page.locator('#value').boundingBox();expect(explanation!.y+explanation!.height).toBeLessThan(value!.y);
 await page.locator('#value').fill('19');await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('0,00');
});

test('calculator side can be changed, stays sticky, and respects mobile and focus layouts',async({page},testInfo)=>{
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Denied'));});
 await add(page,'100');await optionAction(page,async()=>{await page.locator('#trigger-calculator-side').click();await page.getByRole('option',{name:'Rechts vom Rechenstreifen',exact:true}).click();});
 await expect(page.locator('html')).toHaveAttribute('data-calculator-side','right');await expect(page.locator('#result')).toHaveText('100,00');
 async function checkPosition(){const calc=await page.locator('.calc-card').boundingBox(),tape=await page.locator('.calc-tape').boundingBox();if(testInfo.project.name==='desktop'){expect(calc!.x).toBeGreaterThan(tape!.x);await expect(page.locator('.calc-card')).toHaveCSS('position','sticky');}else{expect(tape!.y).toBeGreaterThan(calc!.y+calc!.height);}}
 await checkPosition();await page.locator('#calculator-focus').click();await checkPosition();await page.locator('#calculator-focus').click();
 await optionAction(page,async()=>{await page.locator('#trigger-calculator-side').click();await page.getByRole('option',{name:'Links vom Rechenstreifen',exact:true}).click();});
 if(testInfo.project.name==='desktop'){expect((await page.locator('.calc-card').boundingBox())!.x).toBeLessThan((await page.locator('.calc-tape').boundingBox())!.x);}
});
test('position is only persisted with appearance consent',async({page})=>{
 await optionAction(page,async()=>{await page.locator('#trigger-calculator-side').click();await page.getByRole('option',{name:'Rechts vom Rechenstreifen',exact:true}).click();});
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.calculator.appearance.v1'))).toBeNull();await page.reload();await expect(page.locator('html')).not.toHaveAttribute('data-calculator-side','right');
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await optionAction(page,async()=>{await page.locator('#trigger-calculator-side').click();await page.getByRole('option',{name:'Rechts vom Rechenstreifen',exact:true}).click();});await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-calculator-side','right');await page.locator('#calculator-settings').click();await expect(page.locator('#trigger-calculator-side')).toContainText('Rechts');
});

test('all standard operations have selected explanations and examples',async({page})=>{
 for(const [symbol,op,label,example] of [['+','add','Addieren','100 + 20 → 120'],['−','subtract','Subtrahieren','100 − 20 → 80'],['×','multiply','Multiplizieren','120 × 2 → 240'],['÷','divide','Dividieren','120 ÷ 3 → 40']]){
  await page.locator(`[data-key="${symbol}"]`).click();await expect(page.locator('#operation-label')).toHaveText(label);
  await page.locator('#operation-explain').click();await expect(page.locator('#operation-tip-'+op)).toBeVisible();await expect(page.locator('#operation-tip-'+op)).toContainText(example);await page.locator('#operation-explanation').press('Escape');
 }
 await expect(page.locator('#operation-tip-divide')).toContainText('Teilen durch null');
 await page.locator('#value').fill('3');await page.locator('#add-step').click();await expect(page.locator('#operation-label')).toHaveText('Addieren');await expect(page.locator('#operation-explanation')).toBeHidden();
});

test('changing operations keeps keypad position stable and help overlay works in focus view',async({page})=>{
 const positions:number[]=[];
 for(const op of ['set','note','taxOut','discount','subtotal','taxIn']){
  await page.locator(`[data-operation="${op}"]`).click();
  positions.push(await page.locator('.calc-keypad-layout').evaluate(e=>e.getBoundingClientRect().top-e.closest('.calc-card')!.getBoundingClientRect().top+e.closest('.calc-card')!.scrollTop));
 }
 for(const position of positions)expect(position).toBeCloseTo(positions[0],3);
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Denied'));});await page.locator('#calculator-focus').click();
 await page.locator('#operation-explain').click();await expect(page.locator('#operation-explanation')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('body')).toHaveClass(/calculator-focus-view/);
 await page.locator('#operation-explain').click();await page.locator('#operation-explanation').getByRole('button',{name:'Schließen',exact:true}).click();await expect(page.locator('#operation-explanation')).toBeHidden();
});

test('new calculation uses a styled confirmation overlay and is undoable',async({page})=>{
 let nativeDialogs=0;page.on('dialog',async dialog=>{nativeDialogs++;await dialog.dismiss();});
 await add(page,'100','set','Existing');await page.locator('#value').fill('25');
 await page.locator('#new').click();const dialog=page.getByRole('dialog',{name:'Neue Rechnung beginnen?',exact:true});
 await expect(dialog).toBeVisible();await expect(dialog.getByRole('button',{name:'Abbrechen',exact:true})).toBeFocused();await expect(page.locator('#result')).toHaveText('100,00');
 await dialog.getByRole('button',{name:'Abbrechen',exact:true}).click();await expect(dialog).toBeHidden();await expect(page.locator('#value')).toHaveValue('25');await expect(page.locator('#new')).toBeFocused();
 await page.locator('#new').click();await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(page.locator('#result')).toHaveText('100,00');
 await page.locator('#new').click();await dialog.getByRole('button',{name:'Neue Rechnung',exact:true}).click();await expect(page.locator('#result')).toHaveText('0,00');await expect(page.locator('.tape-step')).toHaveCount(0);await expect(page.locator('#value')).toHaveValue('');
 await page.locator('#undo').click();await expect(page.locator('#result')).toHaveText('100,00');
 // Reopening and cancelling must not reuse the last confirmation value.
 await page.locator('#new').click();await page.keyboard.press('Escape');await expect(page.locator('#result')).toHaveText('100,00');expect(nativeDialogs).toBe(0);
});

test('typing numbers routes to the value, letters to the step name',async({page})=>{
 await page.locator('#calculator-heading').click();await page.keyboard.type('123,45');await expect(page.locator('#value')).toHaveValue('123,45');await expect(page.locator('#value')).toBeFocused();
 await page.keyboard.type('Material');await expect(page.locator('#step-name')).toHaveValue('Material');await expect(page.locator('#value')).toHaveValue('123,45');
 await page.keyboard.type(' 2026');await expect(page.locator('#step-name')).toHaveValue('Material 2026');await page.keyboard.press('Enter');
 await expect(page.locator('#result')).toHaveText('123,45');await expect(page.locator('.step-note').last()).toHaveText('Material 2026');
 await page.locator('#calculator-heading').click();await page.keyboard.type('Versand');await expect(page.locator('#step-name')).toHaveValue('Versand');
 await page.locator('[data-key="+"]').click();await page.keyboard.type('10');await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('133,45');await expect(page.locator('.step-note').last()).toHaveText('Versand');
});
test('automatic typing preserves title edits, modal controls and explicit notes',async({page})=>{
 await page.locator('#edit-calculation-title').click();await page.locator('#calculation-title').fill('Rechnung');await page.locator('#calculation-title').press('End');await page.keyboard.type(' 123');await expect(page.locator('#calculation-title')).toHaveValue('Rechnung 123');await expect(page.locator('#value')).toHaveValue('');await page.locator('#calculation-title-dialog').press('Escape');
 await page.locator('#calculator-settings').click();await page.locator('#trigger-decimals').focus();await page.keyboard.type('7');await expect(page.locator('#value')).toHaveValue('');await page.locator('#calculator-options').press('Escape');
 await page.locator('[data-operation=note]').click();await page.keyboard.type('Notiz');await expect(page.locator('#step-name')).toHaveValue('Notiz');await page.locator('#add-step').click();await expect(page.locator('.step-name').last()).toHaveText('Notiz');await expect(page.locator('#result')).toHaveText('0,00');
});

test('whole-tape actions form a horizontal icon toolbar with tooltips and keyboard navigation',async({page},testInfo)=>{
 const toolbar=page.getByRole('toolbar',{name:'Rechenstreifen',exact:true});
 await expect(toolbar).toHaveAttribute('aria-orientation','horizontal');await expect(toolbar.getByRole('button')).toHaveCount(6);
 const positions=await toolbar.getByRole('button').evaluateAll(buttons=>buttons.map(button=>({y:button.getBoundingClientRect().y,text:button.textContent?.trim(),icon:!!button.querySelector('svg')})));
 for(const position of positions){expect(position.y).toBeCloseTo(positions[0].y,3);expect(position.text).toBe('');expect(position.icon).toBe(true);}
 const box=await toolbar.boundingBox(),title=await page.locator('#calculation-title-display').boundingBox();expect(box!.y+box!.height).toBeLessThan(title!.y);
 await page.locator('#copy').focus();await expect(page.locator('#tape-tooltip-copy')).toBeVisible();await page.keyboard.press('ArrowRight');await expect(page.locator('#print')).toBeFocused();await expect(page.locator('#tape-tooltip-print')).toHaveText('Drucken / PDF');
 await page.keyboard.press('End');await expect(page.locator('#examples')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('#tape-tooltip-examples')).toBeHidden();await page.keyboard.press('Home');await expect(page.locator('#copy')).toBeFocused();
 if(testInfo.project.name==='desktop'){await page.locator('#export').hover();await expect(page.locator('#tape-tooltip-export')).toBeVisible();}
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 const small=await toolbar.getByRole('button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().y));for(const y of small)expect(y).toBeCloseTo(small[0],3);
 await page.screenshot({path:testInfo.outputPath('tape-toolbar.png'),fullPage:true});
});
test('tape toolbar stays at the tape start instead of following scroll and its actions still work',async({page})=>{
 const document={version:1,title:'Toolbar',decimals:2,roundEach:false,steps:Array.from({length:25},(_,i)=>({id:'toolbar-'+i,name:'Material '+i,operation:i?'add':'set',value:'10',enabled:true}))};
 await page.locator('#import-file').setInputFiles({name:'toolbar.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(document))});
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as Window & {copiedTape?:string}).copiedTape=text;}}});window.print=()=>{(window as Window & {printedTape?:boolean}).printedTape=true;};});
 const toolbar=page.locator('.tape-actions'),initial=await toolbar.boundingBox();await page.evaluate(y=>window.scrollTo({top:window.scrollY+y+500,behavior:'instant'}),initial!.y);
 await expect.poll(async()=>{const box=(await toolbar.boundingBox())!;return box.y+box.height;}).toBeLessThan(0);await expect(toolbar).not.toBeInViewport();
 await toolbar.scrollIntoViewIfNeeded();
 await page.locator('#copy').click();expect(await page.evaluate(()=>(window as Window & {copiedTape?:string}).copiedTape)).toContain('Material 24');
 const csv=page.waitForEvent('download');await page.locator('#csv').click();expect((await csv).suggestedFilename()).toBe('Toolbar.csv');
 const json=page.waitForEvent('download');await page.locator('#export').click();expect((await json).suggestedFilename()).toBe('Toolbar.json');
 await page.locator('#print').click();expect(await page.evaluate(()=>(window as Window & {printedTape?:boolean}).printedTape)).toBe(true);await expect(page.locator('#print-rows tr')).toHaveCount(25);
 await optionAction(page,async()=>{await page.locator('#trigger-calculator-side').click();await page.getByRole('option',{name:'Rechts vom Rechenstreifen',exact:true}).click();await page.locator('#simple-tape').check();});
 const moved=await toolbar.boundingBox();await page.evaluate(y=>window.scrollTo({top:window.scrollY+y+400,behavior:'instant'}),moved!.y);await expect(toolbar).not.toBeInViewport();await expect(toolbar).toHaveCSS('position','relative');
});

test('title is displayed as a heading and edited safely in a modal',async({page})=>{
 const heading=page.locator('#calculation-title-display'),dialog=page.locator('#calculation-title-dialog');
 await expect(heading).toHaveText('Unbenannte Rechnung');await expect(page.locator('#calculation-title')).toBeHidden();
 await page.locator('#edit-calculation-title').click();await expect(dialog).toBeVisible();await expect(page.locator('#calculation-title')).toBeFocused();await page.keyboard.type('Angebot 2026');
 await dialog.getByRole('button',{name:'Abbrechen',exact:true}).click();await expect(heading).toHaveText('Unbenannte Rechnung');await expect(page.locator('#edit-calculation-title')).toBeFocused();
 await page.locator('#edit-calculation-title').click();await expect(page.locator('#calculation-title')).toHaveValue('');await page.keyboard.type('Angebot 2026');await page.keyboard.press('Enter');await expect(dialog).toBeHidden();await expect(heading).toHaveText('Angebot 2026');await expect(page.locator('.tape-step')).toHaveCount(0);
 await page.locator('#undo').click();await expect(heading).toHaveText('Unbenannte Rechnung');await page.locator('#redo').click();await expect(heading).toHaveText('Angebot 2026');
 await page.locator('#edit-calculation-title').click();await page.locator('#calculation-title').fill('Verwerfen');await page.keyboard.press('Escape');await expect(heading).toHaveText('Angebot 2026');
 await optionAction(page,()=>page.locator('#remember-calculation').check());await page.reload();await expect(heading).toHaveText('Angebot 2026');
 await page.locator('#edit-calculation-title').click();await page.locator('#calculation-title').fill('');await page.keyboard.press('Enter');await expect(heading).toHaveText('Unbenannte Rechnung');
});

test('value and note form a highlighted entry group with value first',async({page})=>{
 const group=page.getByRole('group',{name:'Schritteingabe',exact:true});await expect(group).toBeVisible();
 await expect(group.getByLabel('Wert',{exact:true})).toHaveCount(1);await expect(group.getByLabel('Schrittname / Notiz',{exact:true})).toHaveCount(1);
 const value=await group.locator('#value').boundingBox(),note=await group.locator('#step-name').boundingBox();expect(note!.y).toBeGreaterThan(value!.y+value!.height);expect(note!.x).toBeCloseTo(value!.x,3);expect(note!.width).toBeCloseTo(value!.width,3);
 const colours=await group.evaluate(element=>({group:getComputedStyle(element).backgroundColor,card:getComputedStyle(element.closest('.calc-card')!).backgroundColor}));expect(colours.group).not.toBe(colours.card);
 await group.locator('#value').fill('150');await page.keyboard.press('Tab');await expect(group.locator('#step-name')).toBeFocused();await page.keyboard.type('Material');await page.keyboard.press('Enter');await expect(page.locator('#result')).toHaveText('150,00');await expect(page.locator('.step-note').last()).toHaveText('Material');
 await page.locator('[data-operation=note]').click();await expect(group.locator('#value')).toBeDisabled();await expect(group.locator('#step-name')).toBeEnabled();
});

test('return-arrow key keeps its icon and updates accessible tooltip for add edit and insert',async({page})=>{
 const enter=page.locator('#add-step');await expect(enter).toHaveText('↵');await expect(enter).toHaveAccessibleName('Schritt hinzufügen');await expect(enter).toHaveAttribute('title','Schritt hinzufügen');
 await add(page,'100','set','Material');await expect(enter).toHaveText('↵');
 await page.locator('.tape-step').last().getByRole('button',{name:/Bearbeiten:/}).click();await expect(enter).toHaveText('↵');await expect(enter).toHaveAccessibleName('Änderungen speichern');await expect(enter).toHaveAttribute('title','Änderungen speichern');await page.locator('#value').fill('150');await enter.click();await expect(page.locator('#result')).toHaveText('150,00');await expect(enter).toHaveAccessibleName('Schritt hinzufügen');
 await page.locator('.tape-step').last().getByRole('button',{name:/Davor einfügen:/}).click();await expect(enter).toHaveText('↵');await expect(enter).toHaveAccessibleName('Davor einfügen');await page.locator('#cancel-edit').click();await expect(enter).toHaveAttribute('title','Schritt hinzufügen');
 await page.locator('#value').fill('5');await page.keyboard.press('Enter');await expect(page.locator('#result')).toHaveText('155,00');await expect(enter).toHaveText('↵');
});

test('step actions use an icon toolbar and accessible enable slider',async({page})=>{
 await add(page,'100','set','Material');await add(page,'20','add','Versand');
 const row=page.locator('.tape-step').nth(1),bar=row.getByRole('toolbar',{name:'Schritt-Aktionen: Versand',exact:true});
 await expect(bar).toHaveCount(1);await expect(bar.getByRole('checkbox')).toHaveCount(0);await expect(bar.getByRole('switch')).toHaveCount(0);await expect(row.getByRole('switch')).toBeChecked();await expect(bar.getByRole('button')).toHaveCount(5);
 const icons=await bar.getByRole('button').evaluateAll(buttons=>buttons.every(button=>!!button.querySelector('svg')&&!button.textContent?.trim()));expect(icons).toBe(true);
 const result=await row.locator('.step-result').boundingBox(),toolbar=await bar.boundingBox();expect(toolbar!.y).toBeGreaterThan(result!.y+result!.height);
 await row.getByRole('switch').focus();await page.keyboard.press('Space');await expect(page.locator('#result')).toHaveText('100,00');await expect(page.locator('.tape-step').nth(1).getByRole('switch')).not.toBeChecked();await page.keyboard.press('Space');await expect(page.locator('#result')).toHaveText('120,00');
 await page.keyboard.press('Tab');await expect(row.getByRole('button',{name:'Bearbeiten: Versand',exact:true})).toBeFocused();await expect(row.locator('[role=tooltip]').filter({hasText:/^Bearbeiten$/})).toBeVisible();await page.keyboard.press('Escape');await expect(row.locator('[role=tooltip]').filter({hasText:/^Bearbeiten$/})).toBeHidden();
 await page.keyboard.press('End');await expect(row.getByRole('button',{name:'Löschen: Versand',exact:true})).toBeFocused();
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('each step heading is its number and operation, with an optional separate note',async({page})=>{
 await add(page,'100','set','Material');await add(page,'20','add');
 const first=page.locator('.tape-step').nth(0),second=page.locator('.tape-step').nth(1);
 await expect(first.locator('.step-head')).toHaveText('01Startwert');await expect(first.getByRole('heading',{name:'Startwert',exact:true})).toHaveCount(1);await expect(first.locator('.step-note')).toHaveText('Material');
 const headingBox=await first.locator('.step-head').boundingBox(),noteBox=await first.locator('.step-note').boundingBox();expect(noteBox!.y).toBeGreaterThan(headingBox!.y+headingBox!.height);
 await expect(second.locator('.step-head')).toHaveText('02Addieren');await expect(second.locator('.step-note')).toHaveCount(0);
 await first.getByRole('button',{name:'Bearbeiten: Material',exact:true}).click();await page.locator('#step-name').fill('Einkauf');await page.locator('#add-step').click();await expect(first.getByRole('heading')).toHaveText('Startwert');await expect(first.locator('.step-note')).toHaveText('Einkauf');
 await first.getByRole('button',{name:'Nach unten: Einkauf',exact:true}).click();await expect(page.locator('.tape-step').nth(1).locator('.step-head')).toHaveText('02Startwert');await expect(page.locator('.tape-step').nth(1).locator('.step-note')).toHaveText('Einkauf');
 await page.locator('#undo').click();await expect(first.locator('.step-head')).toHaveText('01Startwert');await expect(first.locator('.step-note')).toHaveText('Einkauf');
});

test('step cards have padding and retain entered values when disabled',async({page})=>{
 await add(page,'100','set','Material');await add(page,'20.125','add','Versand');
 const row=page.locator('.tape-step').nth(1);await expect(row.locator('.step-input-value')).toHaveText('20,13');await expect(row.locator('.step-result')).toHaveText('120,13');
 const card=await row.boundingBox(),number=await row.locator('.step-number-small').boundingBox();expect(number!.x-card!.x).toBeGreaterThanOrEqual(14);expect(number!.y-card!.y).toBeGreaterThanOrEqual(14);
 await row.getByRole('switch').uncheck();await expect(row.locator('.step-input-value')).toBeVisible();await expect(row.locator('.step-input-value')).toHaveText('20,13');await expect(row.locator('.step-result')).toHaveText('—');await expect(row.locator('.step-state')).toHaveText('Deaktiviert');await expect(page.locator('#result')).toHaveText('100,00');
 await row.getByRole('switch').check();await expect(row.locator('.step-result')).toHaveText('120,13');await expect(row.locator('.step-state')).toHaveCount(0);
 await add(page,'10','discount');const percent=page.locator('.tape-step').last();await percent.getByRole('switch').uncheck();await expect(percent.locator('.step-input-value')).toHaveText('10,00 %');await expect(percent.locator('.step-equation')).not.toContainText('Änderung: 0');
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:'/tmp/calculator-step-cards.png',fullPage:true});
});

test('enable slider and status text sit at the top right next to the operation',async({page})=>{
 await add(page,'100','set','Material');const row=page.locator('.tape-step').last(),top=row.locator('.step-top-line');
 await expect(top.getByRole('switch')).toBeChecked();await expect(top.locator('.step-status-text')).toHaveText('Aktiv');await expect(row.locator('.step-actions').getByRole('switch')).toHaveCount(0);
 const heading=await top.locator('.step-head').boundingBox(),status=await top.locator('.step-status-control').boundingBox();expect(status!.x).toBeGreaterThan(heading!.x+heading!.width);expect(status!.y).toBeCloseTo(heading!.y,3);
 const text=await top.locator('.step-status-text').boundingBox(),slider=await top.locator('.storage-switch').boundingBox();expect(slider!.x).toBeGreaterThan(text!.x+text!.width);
 await top.getByRole('switch').uncheck();await expect(top.locator('.step-status-text')).toHaveText('Deaktiviert');await expect(row.locator('.step-input-value')).toHaveText('100,00');await expect(row.locator('.step-result')).toHaveText('—');
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await top.getByRole('switch').check();await expect(top.locator('.step-status-text')).toHaveText('Aktiv');await expect(page.locator('#result')).toHaveText('100,00');
});

test('entered values match result decimals and size but have a distinct palette tone',async({page})=>{
 await add(page,'100','set');await add(page,'20.125','add');const row=page.locator('.tape-step').last();
 await expect(row.locator('.step-input-value')).toHaveText('20,13');await expect(row.locator('.step-input-value')).toHaveAttribute('title','Wert: 20,125');
 for(const theme of ['light','dark']){
  await page.locator('html').evaluate((element,theme)=>{(element as HTMLElement).dataset.palette='green';(element as HTMLElement).dataset.theme=theme;},theme);
  // Skip colour transitions when comparing final theme colours.
  await page.addStyleTag({content:'.operator-key{transition:none!important}'});
  const styles=await row.evaluate(element=>{const input=getComputedStyle(element.querySelector('.step-input-value')!),result=getComputedStyle(element.querySelector('.step-result')!),plus=getComputedStyle(document.querySelector('[data-key="+"]')!);return {inputSize:input.fontSize,resultSize:result.fontSize,inputWeight:input.fontWeight,resultWeight:result.fontWeight,inputColour:input.color,resultColour:result.color,plusColour:plus.color};});
  expect(styles.inputSize).toBe(styles.resultSize);expect(styles.inputWeight).toBe(styles.resultWeight);expect(styles.inputColour).not.toBe(styles.resultColour);expect(styles.resultColour).toBe(styles.plusColour);
 }
 await optionAction(page,async()=>{await page.locator('#trigger-decimals').click();await page.getByRole('option',{name:'3',exact:true}).click();});
 await expect(row.locator('.step-input-value')).toHaveText('20,125');await expect(row.locator('.step-result')).toHaveText('120,125');await row.getByRole('switch').uncheck();await expect(row.locator('.step-input-value')).toHaveText('20,125');
 await row.getByRole('button',{name:/Bearbeiten:/}).click();await expect(page.locator('#value')).toHaveValue('20.125');
});

test('value and result tones differ and remain readable in all palettes',async({page})=>{
 await add(page,'100','set');await page.addStyleTag({content:'*{transition:none!important}'});
 for(const theme of ['light','dark'])for(const palette of ['terracotta','blue','green','orange','red','violet','teal','rose']){
  await page.locator('html').evaluate((element,{theme,palette})=>{(element as HTMLElement).dataset.theme=theme;(element as HTMLElement).dataset.palette=palette;},{theme,palette});
  const colours=await page.locator('.tape-step').evaluate(element=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d')!;
   const luminance=(colour:string)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=colour;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3).map(v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);};
   const input=getComputedStyle(element.querySelector('.step-input-value')!).color,result=getComputedStyle(element.querySelector('.step-result')!).color,background=getComputedStyle(element).backgroundColor;
   const a=luminance(input),b=luminance(background);const previous=(element as HTMLElement).dataset.enabled;(element as HTMLElement).dataset.enabled='false';const disabled=luminance(getComputedStyle(element).backgroundColor);(element as HTMLElement).dataset.enabled=previous;return {input,result,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),disabledRatio:(Math.max(a,disabled)+.05)/(Math.min(a,disabled)+.05)};
  });
  expect(colours.input,theme+'/'+palette).not.toBe(colours.result);expect(colours.ratio,theme+'/'+palette).toBeGreaterThanOrEqual(4.5);expect(colours.disabledRatio,'disabled '+theme+'/'+palette).toBeGreaterThanOrEqual(4.5);
 }
});

test('examples load fictional editable calculations and protect existing work',async({page})=>{
 await page.locator('#examples').click();const dialog=page.locator('#examples-dialog');await expect(dialog).toBeVisible();await expect(dialog).toContainText('keine statistischen Durchschnittswerte');await expect(dialog.locator('[data-example]')).toHaveCount(3);
 await dialog.locator('[data-example=family]').click();await expect(dialog).toBeHidden();await expect(page.locator('#calculation-title-display')).toHaveText('Familienbudget · ein Monat');await expect(page.locator('#result')).toHaveText('1420,00');
 await page.locator('.tape-step').first().getByRole('button',{name:/Bearbeiten:/}).click();await page.locator('#value').fill('3300');await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('1520,00');
 await page.locator('#examples').click();await dialog.locator('[data-example=holiday]').click();await expect(dialog.locator('#example-confirmation')).toBeVisible();await expect(page.locator('#result')).toHaveText('1520,00');await dialog.locator('#example-cancel').click();await expect(dialog.locator('#examples-list')).toBeVisible();
 await dialog.locator('[data-example=holiday]').click();await dialog.locator('#example-confirm').click();await expect(page.locator('#result')).toHaveText('300,00');await page.locator('#undo').click();await expect(page.locator('#result')).toHaveText('1520,00');await expect(page.locator('#calculation-title-display')).toHaveText('Familienbudget · ein Monat');
 await page.locator('#examples').click();await dialog.locator('[data-example=craft]').click();await dialog.locator('#example-confirm').click();await expect(page.locator('#result')).toHaveText('3696,74');await expect(page.locator('.tape-step')).toHaveCount(7);
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('result display has help on the left and the next operation on the right',async({page})=>{
 await expect(page.locator('.operation-info')).toHaveCount(0);await expect(page.locator('.calc-display #operation-label')).toHaveText('Startwert / ersetzen');
 await add(page,'120','set');await page.locator('[data-key="×"]').click();await expect(page.locator('#operation-symbol')).toHaveText('×');await expect(page.locator('#operation-label')).toHaveText('Multiplizieren');
 const help=await page.locator('#operation-explain').boundingBox(),result=await page.locator('#result').boundingBox(),op=await page.locator('.calc-operation-display').boundingBox();expect(help!.x+help!.width).toBeLessThan(result!.x);expect(op!.x).toBeGreaterThan(result!.x+result!.width);
 await page.locator('#operation-explain').click();await expect(page.locator('#operation-explanation')).toBeVisible();await expect(page.locator('#operation-tip-multiply')).toBeVisible();await page.keyboard.press('Escape');
 await page.locator('#value').fill('2');await page.keyboard.press('Enter');await expect(page.locator('#result')).toHaveText('240,00');await expect(page.locator('#operation-symbol')).toHaveText('+');
 await page.setViewportSize({width:320,height:800});await page.locator('[data-operation=taxOut]').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});


test('simplified tape shows only notes and calculations until selected',async({page})=>{
 await add(page,'100','set','Budget');await add(page,'20','add','Zuschuss');
 await optionAction(page,()=>page.locator('#simple-tape').check());
 const first=page.locator('.tape-step').first(),second=page.locator('.tape-step').nth(1);
 await expect(first.locator('.receipt-summary')).toContainText('Budget');
 await expect(second.locator('.receipt-summary')).toContainText('100,00 + 20,00 = 120,00');
 await expect(first.getByRole('toolbar')).toBeHidden();await expect(first.getByRole('switch')).toBeHidden();
 await expect(first.locator('.step-values')).toBeHidden();await expect(first.locator('.step-head')).toBeHidden();
 await second.locator('.receipt-summary').focus();await page.keyboard.press('Enter');
 await expect(second.getByRole('toolbar')).toBeVisible();await expect(second.getByRole('switch')).toBeVisible();
 await second.getByRole('switch').uncheck();await expect(page.locator('#result')).toHaveText('100,00');
 await expect(second.locator('.receipt-summary')).toContainText('20,00 · Deaktiviert');
 await expect(second.getByRole('toolbar')).toBeVisible();
 await first.locator('.receipt-summary').click();await expect(second.getByRole('toolbar')).toBeHidden();
 await first.locator('.receipt-summary').click();await expect(first.getByRole('toolbar')).toBeHidden();
 await optionAction(page,()=>page.locator('#simple-tape').uncheck());
 await expect(first.locator('.step-values')).toBeVisible();await expect(first.locator('.receipt-summary')).toBeHidden();
 await expect(page.locator('#result')).toHaveText('100,00');
});

test('simplified tape supports editing and notes, and appearance consent persists its view',async({page})=>{
 await add(page,'42','set','Start');await selectOperation(page,'note');await page.locator('#step-name').fill('Nur eine Notiz');await page.locator('#add-step').click();
 await optionAction(page,()=>page.locator('#simple-tape').check());
 await expect(page.locator('.receipt-summary').last()).toHaveText('Nur eine Notiz');
 await page.locator('.receipt-summary').first().click();await page.locator('.tape-step').first().getByRole('button',{name:'Bearbeiten: Start',exact:true}).click();
 await page.locator('#value').fill('50');await page.locator('#add-step').click();await expect(page.locator('#result')).toHaveText('50,00');
 await expect(page.locator('.receipt-summary').first()).toContainText('= 50,00');
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-tape-view','simple');
 await add(page,'7','set');await expect(page.locator('.receipt-summary')).toBeVisible();await expect(page.locator('.step-actions')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('consecutive keyboard operators replace the selected operation without entering a minus',async({page})=>{
 const value=page.locator('#value');await value.focus();
 await page.keyboard.press('+');await expect(page.locator('#operation-label')).toHaveText('Addieren');
 await page.keyboard.press('-');await expect(page.locator('#operation-label')).toHaveText('Subtrahieren');await expect(value).toHaveValue('');
 await expect(page.locator('.tape-step')).toHaveCount(0);
 await selectOperation(page,'set');await value.fill('100');await value.press('+');await expect(page.locator('#result')).toHaveText('100,00');
 for(const [key,label] of [['-','Subtrahieren'],['*','Multiplizieren'],['/','Dividieren'],['+','Addieren'],['-','Subtrahieren']]){
  await page.keyboard.press(key);await expect(page.locator('#operation-label')).toHaveText(label);await expect(value).toHaveValue('');
  await expect(page.locator('.tape-step')).toHaveCount(1);
 }
 await page.keyboard.type('20');await page.keyboard.press('Enter');await expect(page.locator('#result')).toHaveText('80,00');
 await expect(page.locator('.tape-step')).toHaveCount(2);
});

test('negative operands remain available through the sign key and pasted values',async({page})=>{
 await add(page,'100','set');await page.locator('[data-key="±"]').click();await expect(page.locator('#value')).toHaveValue('-');
 await page.keyboard.type('20');await page.keyboard.press('Enter');await expect(page.locator('#result')).toHaveText('80,00');
 await add(page,'-5','add');await expect(page.locator('#result')).toHaveText('75,00');
});


test('default tape is simplified without saved preferences and unsaved choices reset on reload',async({page})=>{
 await expect(page.locator('html')).toHaveAttribute('data-tape-view','simple');
 await add(page,'100','set','Budget');await expect(page.locator('.receipt-summary')).toBeVisible();await expect(page.locator('.step-actions')).toBeHidden();
 await page.locator('#calculator-settings').click();await expect(page.locator('#simple-tape')).toBeChecked();await page.locator('#simple-tape').uncheck();await page.locator('#calculator-options').press('Escape');
 await expect(page.locator('.step-actions')).toBeVisible();await page.reload();await expect(page.locator('html')).toHaveAttribute('data-tape-view','simple');
});

test('default tape respects an explicitly saved detailed view',async({page})=>{
 await optionAction(page,()=>page.locator('#simple-tape').uncheck());
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();await page.locator('#preferences-close').click();
 await page.reload();await expect(page.locator('html')).toHaveAttribute('data-tape-view','detailed');
 await page.locator('#calculator-settings').click();await expect(page.locator('#simple-tape')).not.toBeChecked();await page.locator('#calculator-options').press('Escape');
 await add(page,'42');await expect(page.locator('.step-actions')).toBeVisible();await expect(page.locator('.receipt-summary')).toBeHidden();
});

test('default tape total matches the receipt typography and alignment',async({page})=>{
 await add(page,'100','set','Budget');await add(page,'20','add');
 const receipt=page.locator('.receipt-summary').last(),total=page.locator('.tape-total'),result=page.locator('#tape-result');
 await expect(result).toHaveText('120,00');
 const receiptStyle=await receipt.evaluate(el=>{const s=getComputedStyle(el);return {font:s.fontFamily,size:s.fontSize,style:s.fontStyle};});
 const totalStyle=await result.evaluate(el=>{const s=getComputedStyle(el);return {font:s.fontFamily,size:s.fontSize,style:s.fontStyle};});
 expect(totalStyle).toEqual(receiptStyle);await expect(total).toHaveCSS('border-top-style','double');
 const equationBox=await page.locator('.receipt-equation').last().boundingBox(),resultBox=await result.boundingBox();
 expect(resultBox!.x+resultBox!.width).toBeCloseTo(equationBox!.x+equationBox!.width,0);
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await optionAction(page,()=>page.locator('#simple-tape').uncheck());
 await expect(total).toHaveCSS('border-top-style','solid');expect(await result.evaluate(el=>getComputedStyle(el).fontSize)).not.toBe(receiptStyle.size);
});

test('default tape has subtle separators only between steps in light and dark modes',async({page})=>{
 await add(page,'100','set','Budget');await add(page,'20','add');
 const first=page.locator('.tape-step').first(),second=page.locator('.tape-step').nth(1);
 for(const theme of ['light','dark']){
  await page.locator('html').evaluate((el,value)=>{(el as HTMLElement).dataset.theme=value;},theme);
  await expect(first).toHaveCSS('border-top-width','0px');await expect(second).toHaveCSS('border-top-width','1px');await expect(second).toHaveCSS('border-top-style','solid');
 }
 await second.locator('.receipt-summary').click();await expect(second.getByRole('toolbar')).toBeVisible();await expect(second).toHaveCSS('border-top-width','1px');
 await expect(page.locator('#result')).toHaveText('120,00');
});


test('title edit button is vertically centered beside short and multiline titles',async({page})=>{
 const edit=page.locator('#edit-calculation-title');
 for(const title of ['Budget','Eine ausführliche Rechnung für die geplante Renovierung und sämtliche Materialkosten']){
  await edit.click();await page.locator('#calculation-title').fill(title);await page.locator('#calculation-title-form').evaluate((form:HTMLFormElement)=>form.requestSubmit());
  for(const width of [1000,320]){
   await page.setViewportSize({width,height:844});
   const textBox=await page.locator('.calculation-title-heading>div').boundingBox(),buttonBox=await edit.boundingBox();
   expect(buttonBox!.y+buttonBox!.height/2).toBeCloseTo(textBox!.y+textBox!.height/2,0);
  }
 }
});


test('print columns prioritize notes and operation descriptions over numeric values',async({page})=>{
 await add(page,'100','set','Materialkosten einschließlich Lieferung und sämtlicher Nebenkosten');await add(page,'20','add','Zusätzliche Ausgaben');
 await page.setViewportSize({width:794,height:1123});await page.emulateMedia({media:'print'});
 const widths=await page.locator('#print-calculation th').evaluateAll(cells=>cells.map(cell=>cell.getBoundingClientRect().width));
 expect(widths).toHaveLength(4);
 for(const index of [3]){expect(widths[1]).toBeGreaterThan(widths[index]*2);expect(widths[2]).toBeGreaterThan(widths[index]*2);}
 await expect(page.locator('#print-rows tr').first().locator('td').nth(1)).toHaveText('Materialkosten einschließlich Lieferung und sämtlicher Nebenkosten');
 await expect(page.locator('#print-rows tr').last().locator('td')).toHaveCount(4);
 await expect(page.locator('#print-rows tr').last().locator('td').nth(2)).toHaveText('100,00 + 20,00');
 await expect(page.locator('#print-rows tr').last().locator('td').nth(3)).toHaveText('120,00');
 await expect(page.locator('#print-rows tr').last().locator('td').nth(3)).toHaveCSS('text-align','right');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('printing excludes disabled steps and redundant value and status columns without changing the calculation',async({page})=>{
 await add(page,'100','set','Budget');await add(page,'20','add','Nicht drucken');await add(page,'2','multiply','Verdoppeln');
 await page.locator('.tape-step').nth(1).getByRole('switch').uncheck();await expect(page.locator('#result')).toHaveText('200,00');
 await page.emulateMedia({media:'print'});
 const rows=page.locator('#print-rows tr');await expect(rows).toHaveCount(2);
 await expect(page.locator('#print-calculation th')).toHaveCount(4);
 await expect(page.locator('#print-calculation th').filter({hasText:/^(Status|Wert)$/})).toHaveCount(0);
 await expect(page.locator('#print-rows')).not.toContainText('Nicht drucken');
 await expect(rows.last().locator('td').nth(2)).toHaveText('100,00 × 2,00');await expect(rows.last().locator('td').nth(3)).toHaveText('200,00');
 await expect(page.locator('#print-result')).toHaveText('Ergebnis: 200,00');
 await page.emulateMedia({media:'screen'});await expect(page.locator('.tape-step')).toHaveCount(3);
 await page.locator('.tape-step').nth(1).getByRole('switch').check();await expect(rows).toHaveCount(3);await expect(page.locator('#print-result')).toHaveText('Ergebnis: 240,00');
 for(const row of await page.locator('.tape-step').all())await row.getByRole('switch').uncheck();
 await expect(rows).toHaveCount(0);await expect(page.locator('#print-result')).toHaveText('Ergebnis: 0,00');
});


test('print operation operands follow configured decimal places without rounding stored inputs',async({page})=>{
 await add(page,'100','set');await add(page,'-1.235','add');await add(page,'10','increase');await add(page,'19','taxOut');
 const formulas=page.locator('#print-rows tr td:nth-child(3)');
 await expect(formulas.nth(0)).toContainText('100,00');await expect(formulas.nth(1)).toHaveText('100,00 + -1,24');
 await expect(formulas.nth(2)).toContainText('10,00 %');await expect(formulas.nth(3)).toContainText('(1 + 19,00 / 100)');
 for(const decimals of ['3','0']){
  await optionAction(page,async()=>{await page.locator('#trigger-decimals').click();await page.getByRole('option',{name:decimals,exact:true}).click();});
  await page.emulateMedia({media:'print'});
  await expect(formulas.nth(1)).toHaveText(decimals==='3'?'100,000 + -1,235':'100 + -1');
  await expect(formulas.nth(2)).toContainText(decimals==='3'?'10,000 %':'10 %');
  await page.emulateMedia({media:'screen'});
 }
 await page.locator('.tape-step').nth(1).getByRole('button',{name:/Bearbeiten:/}).click();await expect(page.locator('#value')).toHaveValue('-1.235');
});
