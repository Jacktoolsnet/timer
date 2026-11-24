import { squareRadius } from '../src/lib/analog-designs';
import { getTimes } from 'suncalc';
import { test, expect } from '@playwright/test';
import { sundialState, sundialHours } from '../src/lib/sundial';

test('horizontal shadow points away from the Sun and stays finite',()=>{
 const location={latitude:51.5,longitude:0};
 const day=sundialState(new Date('2026-06-21T12:00:00Z'),location);
 expect(day.visible).toBe(true);
 expect(day.y).toBeLessThan(0); // Sun south, shadow north
 expect(day.solarHour).toBeCloseTo(12,0);
 expect(day.length).toBeGreaterThan(0);
 expect(sundialHours(new Date('2026-06-21T12:00:00Z'),location).length).toBeGreaterThan(4);
 expect(sundialState(new Date('2026-06-21T00:00:00Z'),location).visible).toBe(false);
 for(const latitude of [-90,-33.8,0,51.5,90]){
  const s=sundialState(new Date('2026-12-21T12:00:00Z'),{latitude,longitude:0});
  expect(Number.isFinite(s.x)&&Number.isFinite(s.y)).toBe(true);
 }
});

test('sundial requests location only on click, renders day and night and clears coordinates',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:51.5,longitude:0});
 await page.clock.install({time:new Date('2026-06-21T12:00:00Z')});
 await page.addInitScript(()=>{
  const original=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  Object.assign(window,{sundialRequests:0});
  navigator.geolocation.getCurrentPosition=(...args)=>{
   (window as unknown as {sundialRequests:number}).sundialRequests++;
   original(...args);
  };
 });
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await expect(page.locator('#sundial-view')).toBeVisible();
 await expect(page.locator('#analog-clock')).toBeHidden();
 await expect(page.locator('#sundial-status')).toContainText('Standort aktivieren');
 await expect(page.locator('#sundial-shadow')).toHaveAttribute('visibility','hidden');
 expect(await page.evaluate(()=>(window as unknown as {sundialRequests:number}).sundialRequests)).toBe(0);
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-daylight','true');
 await expect(page.locator('#sundial-shadow')).toHaveAttribute('visibility','visible');
 await expect(page.locator('#sundial-time')).toContainText('Wahre Sonnenzeit');
 expect(await page.locator('#sundial-hours text').count()).toBeGreaterThan(4);
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.clock.settings.v1'))).not.toMatch(/latitude|longitude|51\.5/);
 await page.locator('#palette-dropdown summary').click();
 await page.clock.fastForward(12*3600000);
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-daylight','false');
 await expect(page.locator('#sundial-shadow')).toHaveAttribute('visibility','hidden');
 await expect(page.locator('#sundial-night-hint')).toContainText('unter dem Horizont');
 await expect(page.locator('#sundial-sun')).toBeHidden();
 await page.locator('#seasonal-north').check();
 await expect(page.locator('#sundial-time')).toBeEmpty();
 await expect(page.locator('#sundial-hours text')).toHaveCount(0);
 await expect(page.locator('#sundial-status')).toContainText('Standort aktivieren');
 await page.reload();
 await expect(page.locator('#sundial-view')).toBeVisible();
 await expect(page.locator('#sundial-status')).toContainText('Standort aktivieren');
 expect(await page.evaluate(()=>(window as unknown as {sundialRequests:number}).sundialRequests)).toBe(0);
});

test('denied location gives a retry without inventing a shadow',async({page})=>{
 await page.addInitScript(()=>{
  navigator.geolocation.getCurrentPosition=(_success,error)=>error?.({code:1,message:'Denied',PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3});
 });
 await page.goto('/en/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sundial',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-status')).toContainText('Location access denied');
 await expect(page.locator('#seasonal-location')).toBeEnabled();
 await expect(page.locator('#sundial-shadow')).toHaveAttribute('visibility','hidden');
});


test('winter hours remain readable even when shadows extend beyond the dial',async({page,context})=>{
 const location={latitude:52.52,longitude:13.405};
 const date=new Date('2026-11-23T13:00:00Z');
 const hours=sundialHours(date,location);
 expect(hours.length).toBeGreaterThan(4);
 expect(hours.some(point=>point.length>132)).toBe(true);
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation(location);
 await page.clock.install({time:date});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-daylight','true');
 await expect(page.locator('#sundial-shadow')).toHaveAttribute('visibility','visible');
 expect(await page.locator('#sundial-hours text').count()).toBeGreaterThan(4);
 await expect(page.locator('#sundial-time')).toContainText('Sonnenhöhe');
});


test('remembers enabled mode with consent but never coordinates',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await expect(page.locator('#sundial-status')).not.toContainText('bitte den Standort aktivieren');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.clock.location-enabled.v1'))).toBe('yes');
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toMatch(/52\.52|13\.405|latitude|longitude/);
 await page.reload();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await expect(page.locator('#seasonal-location')).toBeChecked();
 await expect(page.locator('#sundial-status')).toContainText('52,5200° N');
 await expect(page.locator('#sundial-status')).toContainText('13,4050° E');
 await expect(page.locator('#sundial-status')).not.toContainText('Standort aktiv');
 await expect(page.locator('#seasonal-location-status')).toBeEmpty();
 await expect(page.locator('#sundial-location')).toHaveCount(0);
 await page.locator('#seasonal-north').check();
 await page.reload();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','missing');
 await expect(page.locator('#sundial-status')).toContainText('Standort aktivieren');
});

test('pending location survives reconfiguration while browser asks for permission',async({page})=>{
 await page.addInitScript(()=>{
  navigator.geolocation.getCurrentPosition=(success)=>{
   setTimeout(()=>success({coords:{latitude:52.52,longitude:13.405,accuracy:100,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()} as GeolocationPosition),700);
  };
 });
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await expect(page.locator('#sundial-status')).not.toContainText('Standort aktivieren');
 await expect(page.locator('#sundial-time')).not.toBeEmpty();
});


test('recognizes permission grants and revocations while the page stays open',async({page})=>{
 await page.addInitScript(()=>{
  const permission=Object.assign(new EventTarget(),{state:'prompt'});
  Object.defineProperty(navigator.permissions,'query',{value:async()=>permission});
  Object.assign(window,{setSundialPermission:(state:string)=>{
   permission.state=state;permission.dispatchEvent(new Event('change'));
  }});
  navigator.geolocation.getCurrentPosition=(success,error)=>{
   if(permission.state!=='granted'){
    error?.({code:1,message:'Denied',PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3});return;
   }
   success({coords:{latitude:52.52,longitude:13.405,accuracy:100,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()} as GeolocationPosition);
  };
 });
 await page.goto('/en/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sundial',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-status')).toContainText('Location access denied');
 await page.evaluate(()=>(window as unknown as {setSundialPermission:(s:string)=>void}).setSundialPermission('granted'));
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await expect(page.locator('#sundial-time')).not.toBeEmpty();
 await page.evaluate(()=>(window as unknown as {setSundialPermission:(s:string)=>void}).setSundialPermission('prompt'));
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','missing');
 await expect(page.locator('#sundial-time')).toBeEmpty();
 await expect(page.locator('#sundial-hours text')).toHaveCount(0);
});


test('sunlit dial stays light with a dark contrasting shadow in every theme',async({page})=>{
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 for(const theme of ['light','dark']){
  const papers=new Set<string>(),shadows=new Set<string>();
  for(const palette of ['terracotta','blue','green','orange','red','violet','teal','rose']){
   await page.evaluate(({theme,palette})=>{
    document.documentElement.dataset.theme=theme;
    document.documentElement.dataset.palette=palette;
   },{theme,palette});
   const contrast=await page.evaluate(()=>{
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;
    const rgb=(value:string)=>{
     ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);
     const p=ctx.getImageData(0,0,1,1).data;
     return [...p].slice(0,3).map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4)
      .reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
    };
    const paper=rgb(getComputedStyle(document.querySelector('.sundial-surface')!).fill);
    const shadow=rgb(getComputedStyle(document.querySelector('#sundial-shadow')!).stroke);
    return {paper,ratio:(paper+.05)/(shadow+.05),fill:getComputedStyle(document.querySelector('.sundial-surface')!).fill,stroke:getComputedStyle(document.querySelector('#sundial-shadow')!).stroke};
   });
   papers.add(contrast.fill);shadows.add(contrast.stroke);
   expect(contrast.paper).toBeGreaterThan(.7);
   expect(contrast.ratio).toBeGreaterThan(7);
  }
  expect(papers.size).toBe(8);expect(shadows.size).toBe(8);
 }
});


test('one location switch feeds both sundial and seasonal background',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await expect(page.locator('#seasonal-settings')).toBeVisible();
 await expect(page.locator('#sundial-location')).toHaveCount(0);
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-status')).toContainText('52,5200° N');
 await expect(page.locator('#sundial-status')).toHaveCSS('border-top-width','0px');
 await expect(page.locator('#seasonal-location-status')).toBeEmpty();
 await page.locator('#trigger-background').click();
 await page.locator('#options-background [role=option]').last().click();
 await expect(page.locator('#seasonal-background')).toHaveAttribute('data-location-based','true');
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await page.locator('#seasonal-south').check();
 await expect(page.locator('#seasonal-background')).toHaveAttribute('data-location-based','false');
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','missing');
 await expect(page.locator('#sundial-status')).not.toContainText('52,5200');
});

test('sundial inherits rounded, square, Roman and numeral settings',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.clock.install({time:new Date('2026-06-21T10:00:00Z')});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 const face=page.locator('#sundial-face');
 await expect(face.locator('.hour-mark').first()).toBeVisible();
 await expect(face.locator('.minute-mark').first()).toBeVisible();
 for(const [design,name] of [
  ['roman','Römisch'],['square-roman','Römisch · Eckig'],
  ['square-railway','Bahnhofsuhr · Eckig'],['minimal','Minimalistisch'],
  ['standard','Standard'],
 ]){
  await page.locator('#trigger-analogDesign').click();
  await page.getByRole('option',{name,exact:true}).click();
  await expect(face).toHaveAttribute('data-design',design);
  await expect(face.locator(design.startsWith('square-')?'rect.sundial-surface':'circle.sundial-surface')).toBeVisible();
  if(design.endsWith('roman')){
   await expect(face.locator('.dial-numerals')).toContainText('XII');
   expect(await face.locator('.dial-numerals').textContent()).not.toMatch(/[0-9]/);
  }
  if(design==='minimal')await expect(face.locator('.minute-mark')).toHaveCount(0);
  await page.locator('input[name=numbers]').uncheck();
  await expect(face.locator('.dial-numerals')).toBeHidden();
  await page.locator('input[name=numbers]').check();
  await expect(face.locator('.dial-numerals')).toBeVisible();
 }
});

test('civil time appears as flip digits inside the dial and follows time controls',async({page})=>{
 await page.clock.install({time:new Date('2026-11-23T12:34:56Z')});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await expect(page.locator('#sundial-face #sundial-flip')).toBeVisible();
 await expect(page.locator('#sundial-flip .flip-digit')).toHaveCount(6);
 const values=()=>page.locator('#sundial-flip .flip-digit').evaluateAll(digits=>digits.map(d=>(d as HTMLElement).dataset.value).join(''));
 const initial=await values();
 expect(initial.length).toBe(6);
 await page.locator('input[name=seconds]').uncheck();
 await expect(page.locator('#sundial-flip .flip-digit')).toHaveCount(4);
 const display=await page.locator('#digital-clock').boundingBox();
 expect(display!.width).toBeLessThanOrEqual(1);
 await page.locator('#trigger-format').click();
 await page.getByRole('option',{name:'Kurz',exact:true}).click();
 await page.locator('input[name=seconds]').check();
 await expect(page.locator('#sundial-flip .flip-digit')).toHaveCount(4);
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Klappzahlen',exact:true}).click();
 await expect(page.locator('#flip-clock')).toBeVisible();
 await expect(page.locator('#sundial-view')).toBeHidden();
});


test('shadow ends before numerals and fades along its actual direction',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.clock.install({time:new Date('2026-11-23T13:00:00Z')});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 const shadow=page.locator('#sundial-shadow'),fade=page.locator('#sundial-shadow-fade');
 await expect(shadow).toHaveAttribute('visibility','visible');
 const x=Number(await shadow.getAttribute('x2')),y=Number(await shadow.getAttribute('y2'));
 expect(Math.hypot(x-180,y-180)).toBeCloseTo(110,4);
 await expect(fade).toHaveAttribute('x2',String(x));
 await expect(fade).toHaveAttribute('y2',String(y));
 await expect(shadow).toHaveAttribute('mask','url(#sundial-shadow-mask)');
 await expect(fade.locator('stop').last()).toHaveAttribute('stop-opacity','.2');
});

test('missing-location notice sits in the upper half without moving the flip clock',async({page,context})=>{
 await page.clock.install({time:new Date('2026-11-23T12:00:00Z')});
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await expect(page.locator('#sundial-face #sundial-status')).toBeVisible();
 await expect(page.locator('#sundial-notice-area')).toHaveAttribute('y','95');
 await expect(page.locator('#sundial-flip')).toBeVisible();
 await expect(page.locator('#sundial-time')).toBeHidden();
 await expect(page.locator('.clock-display')).toHaveCSS('gap','6px');
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-coordinates #sundial-status')).toContainText('52,5200');
 await expect(page.locator('#sundial-view > #sundial-status')).toHaveCount(0);
 await expect(page.locator('#sundial-coordinates-area')).toHaveAttribute('visibility','visible');
 await expect(page.locator('#sundial-coordinates-area')).toHaveAttribute('y','294');
 await expect(page.locator('#sundial-notice-area')).toHaveAttribute('visibility','hidden');
 await expect(page.locator('#sundial-flip-area')).toHaveAttribute('y','236');
 await page.locator('#seasonal-north').check();
 await expect(page.locator('#sundial-face #sundial-status')).toBeVisible();
 await expect(page.locator('#sundial-flip-area')).toHaveAttribute('y','236');
});

test('solar information remains inside the opaque dial with a photograph background',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await page.locator('#trigger-background').click();
 await page.locator('#options-background [role=option]').nth(1).click();
 await expect(page.locator('#sundial-face #sundial-time')).toBeVisible();
 await expect(page.locator('#sundial-time span')).toHaveCount(2);
 await expect(page.locator('#sundial-time')).toContainText('Wahre Sonnenzeit');
 await expect(page.locator('#sundial-time')).toContainText('Sonnenhöhe');
 await expect(page.locator('#sundial-view > #sundial-time')).toHaveCount(0);
 await expect(page.locator('#sundial-coordinates #sundial-status')).toContainText('52,5200');
 await expect(page.locator('#sundial-view > #sundial-status')).toHaveCount(0);
 await expect(page.locator('#sundial-coordinates-area')).toHaveAttribute('visibility','visible');
 await expect(page.locator('#sundial-coordinates-area')).toHaveAttribute('y','294');
 await page.locator('#seasonal-north').check();
 await expect(page.locator('#sundial-info-area')).toHaveAttribute('visibility','hidden');
 await expect(page.locator('#sundial-face #sundial-status')).toBeVisible();
});

test('daylight band shows actual rise/set times and hides without a location',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.clock.install({time:new Date('2026-11-23T12:00:00Z')});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await expect(page.locator('#sundial-daylight')).toBeHidden();
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-daylight-fill')).toBeVisible();
 await expect(page.locator('#sundial-sunrise-label')).toHaveText(/\d{2}:\d{2}/);
 await expect(page.locator('#sundial-sunset-label')).toHaveText(/\d{2}:\d{2}/);
 const rise=Number(await page.locator('#sundial-dawn-orange').getAttribute('offset'));
 const set=Number(await page.locator('#sundial-dusk-orange').getAttribute('offset'));
 expect(rise).toBeGreaterThan(0);expect(set).toBeLessThan(1);expect(set).toBeGreaterThan(rise);
 expect(Number(await page.locator('#sundial-sunrise-label').getAttribute('x'))).toBeGreaterThan(Number(await page.locator('#sundial-sunset-label').getAttribute('x')));
 await expect(page.locator('#sundial-daylight-fill')).toBeVisible();
 await expect(page.locator('#sundial-daylight-fill path')).toHaveCount(360);
 await expect(page.locator('#sundial-daylight-fill path').first()).toHaveAttribute('d',/^M180,180 L/);
 await expect(page.locator('#sundial-daylight-fill')).toHaveAttribute('mask','url(#sundial-radial-mask)');
 await expect(page.locator('#sundial-radial-mask')).toHaveAttribute('y','29');
 await expect(page.locator('#sundial-radial-mask')).toHaveAttribute('height','302');
 const upper=await page.locator('#sundial-daylight-fill path').first().getAttribute('d');
 expect(upper).not.toBeNull();
 const points=upper!.match(/-?[\d.]+/g)!.map(Number);
 expect(points[3]).toBeLessThan(180);
 expect(Math.hypot(points[2]-180,points[3]-180)).toBeCloseTo(150,3);
 await expect(page.locator('#sundial-daylight-fill')).toHaveCSS('opacity','1');
 await expect(page.locator('#sundial-daylight-fill path').nth(0)).toHaveAttribute('fill','color-mix(in srgb,var(--sundial-day) 100.000%,var(--sundial-night))');
 await expect(page.locator('#sundial-daylight-fill path').nth(180)).toHaveAttribute('fill','color-mix(in srgb,var(--sundial-day) 100.000%,var(--sundial-night))');
 await expect(page.locator('#sundial-sun')).toBeVisible();
 const {sunX,sunY,shadowX,shadowY}=await page.locator('#sundial-face').evaluate(face=>{
  const [sunX,sunY]=face.querySelector('#sundial-sun')!.getAttribute('transform')!.match(/-?[\d.]+/g)!.map(Number);
  return {sunX,sunY,shadowX:Number(face.querySelector('#sundial-shadow')!.getAttribute('x2'))-180,shadowY:Number(face.querySelector('#sundial-shadow')!.getAttribute('y2'))-180};
 });
 expect(Math.hypot(sunX-180,sunY-180)).toBeCloseTo(137,5);
 expect((sunX-180)*shadowX+(sunY-180)*shadowY).toBeLessThan(0);
 expect(Math.abs((sunX-180)*shadowY-(sunY-180)*shadowX)).toBeLessThan(.01);
 await page.locator('#trigger-analogDesign').click();
 await page.getByRole('option',{name:'Römisch · Eckig',exact:true}).click();
 await expect(page.locator('#sundial-daylight-fill')).toBeVisible();
 const squareTransform=(await page.locator('#sundial-sun').getAttribute('transform'))!;
 const [sx,sy]=squareTransform.match(/-?[\d.]+/g)!.map(Number);
 expect(Math.hypot(sx-180,sy-180)).toBeCloseTo(squareRadius(Math.atan2(sx-180,180-sy),137,27),5);
 await page.locator('#seasonal-north').check();
 await expect(page.locator('#sundial-daylight-fill')).toBeHidden();
 await expect(page.locator('#sundial-sunrise-label')).toBeHidden();
});

test('polar daylight band has no invented sunrise or sunset times',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:89,longitude:0});
 await page.clock.install({time:new Date('2026-06-21T12:00:00Z')});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-daylight')).toHaveAttribute('aria-label','Polartag');
 await expect(page.locator('#sundial-sunrise-label')).toBeHidden();
 await expect(page.locator('#sundial-sunset-label')).toBeHidden();
 await expect(page.locator('#sundial-daylight-arc')).toHaveCount(0);
});


test('rise and set markers use actual sun directions opposite the shadow scale',async({page,context})=>{
 const location={latitude:52.52,longitude:13.405};
 const date=new Date('2026-11-23T12:00:00Z');
 const times=getTimes(date,location.latitude,location.longitude);
 await context.grantPermissions(['geolocation']);await context.setGeolocation(location);
 await page.clock.install({time:date});await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 for(const [event,time] of [['sunrise',times.sunrise],['sunset',times.sunset]] as const){
  const az=sundialState(time!,location).sun.azimuth*Math.PI/180;
  const marker=page.locator('#sundial-'+event+'-dot');
  const x=Number(await marker.getAttribute('cx'))-180;
  const y=Number(await marker.getAttribute('cy'))-180;
  expect(x/Math.hypot(x,y)).toBeCloseTo(Math.sin(az),5);
  expect(y/Math.hypot(x,y)).toBeCloseTo(-Math.cos(az),5);
 }
});

test('focus backdrop fills the viewport and keeps sundial and calendar inside it',async({page,context})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.goto('/de/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await page.locator('#trigger-background').click();
 await page.locator('#options-background [role=option]').nth(1).click();
 for(const size of [{width:1440,height:900},{width:390,height:844},{width:844,height:390},{width:360,height:600}]){
  await page.setViewportSize(size);
  await page.evaluate(()=>{document.body.classList.add('focus-view');document.documentElement.dataset.theme='dark';});
  const card=await page.locator('.clock-card').boundingBox();
  expect(card!.x).toBe(0);expect(card!.y).toBe(0);
  expect(card!.width).toBe(size.width);expect(card!.height).toBe(size.height);
  for(const selector of ['#sundial-view','.date-calendar','#clock-zone']){
   const box=await page.locator(selector).boundingBox();
   expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.y).toBeGreaterThanOrEqual(0);
   expect(box!.x+box!.width).toBeLessThanOrEqual(size.width+1);
   expect(box!.y+box!.height).toBeLessThanOrEqual(size.height+1);
  }
 }
});


test('day and night colours follow palette changes immediately',async({page,context})=>{
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.goto('/de/');await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 for(const theme of ['light','dark']){
  const day=new Set<string>(),night=new Set<string>(),suns=new Set<string>();
  for(const palette of ['terracotta','blue','green','orange','red','violet','teal','rose']){
   await page.evaluate(({theme,palette})=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.palette=palette;},{theme,palette});
   const colours=await page.evaluate(()=>({
    day:getComputedStyle(document.querySelector('#sundial-dawn-orange')!).stopColor,
    night:getComputedStyle(document.querySelector('#sundial-dawn-blue')!).stopColor,
    sun:getComputedStyle(document.querySelector('#sundial-sun')!).color
   }));
   expect(colours.day).not.toBe(colours.night);
   expect(colours.day).not.toBe('rgb(0, 0, 0)');
   day.add(colours.day);night.add(colours.night);suns.add(colours.sun);
  }
  expect(day.size).toBe(8);expect(night.size).toBe(8);expect(suns.size).toBe(8);
 }
});

test('rise/set dots sit on the frame with labels outside and no overlaps',async({page,context})=>{
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.clock.install({time:new Date('2026-11-23T12:00:00Z')});
 await page.goto('/de/');await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();
 await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 for(const square of [false,true]){
  if(square){await page.locator('#trigger-analogDesign').click();await page.getByRole('option',{name:'Römisch · Eckig',exact:true}).click();}
  for(const event of ['sunrise','sunset']){
   const dot=page.locator('#sundial-'+event+'-dot');
   const x=Number(await dot.getAttribute('cx'))-180,y=Number(await dot.getAttribute('cy'))-180;
   const radius=square?squareRadius(Math.atan2(x,-y),151,30):151;
   expect(Math.hypot(x,y)).toBeCloseTo(radius,4);
   const label=await page.locator('#sundial-'+event+'-label').boundingBox();
   const bounds=await page.locator('#sundial-face').boundingBox();
   expect(label!.x).toBeGreaterThanOrEqual(bounds!.x);
   expect(label!.x+label!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width);
   const flip=await page.locator('#sundial-flip').boundingBox();
   expect(label!.x+label!.width<flip!.x||label!.x>flip!.x+flip!.width||label!.y+label!.height<flip!.y||label!.y>flip!.y+flip!.height).toBe(true);
  }
 }
});

test('São Paulo uses a south-up dial with readable hour labels and clear inset readouts',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:-23.55052,longitude:-46.633309});
 await page.clock.install({time:new Date('2026-11-23T14:46:00Z')});
 await page.goto('/de/');await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-face')).toHaveAttribute('data-orientation','south');
 await expect(page.locator('.sundial-north')).toHaveText('S');
 for(const square of [false,true]){
  if(square){await page.locator('#trigger-analogDesign').click();await page.getByRole('option',{name:'Römisch · Eckig',exact:true}).click();}
  const labels=await page.locator('#sundial-hours .dial-numerals text').evaluateAll(nodes=>nodes.map(node=>{
   const r=node.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};
  }));
  expect(labels.length).toBeGreaterThan(2);
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
   const a=labels[i],b=labels[j];
   expect(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y).toBe(true);
  }
  const info=await page.locator('#sundial-info-area').boundingBox();
  for(const label of labels)expect(label.bottom).toBeLessThan(info!.y);
 }
});

test('changing simulated location updates the dial without re-enabling location',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:52.52,longitude:13.405});
 await page.clock.install({time:new Date('2026-11-23T14:46:00Z')});
 await page.goto('/de/');await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();await page.locator('#seasonal-location').click();
 await expect(page.locator('#sundial-status')).toContainText('52,5200° N');
 await expect(page.locator('#sundial-face')).toHaveAttribute('data-orientation','north');
 await context.setGeolocation({latitude:-23.55052,longitude:-46.633309});
 await expect(page.locator('#sundial-status')).toContainText('23,5505° S');
 await expect(page.locator('#sundial-face')).toHaveAttribute('data-orientation','south');
 await page.locator('#seasonal-north').check();
 await context.setGeolocation({latitude:51.5,longitude:0});
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','missing');
 await expect(page.locator('#sundial-status')).not.toContainText('51,5000');
});

test('near-zenith São Paulo shadow remains visible beyond the centre pin',async({page,context})=>{
 const location={latitude:-23.55052,longitude:-46.633309};
 const date=new Date('2026-11-23T14:46:00Z');
 const physical=sundialState(date,location);
 expect(physical.sun.altitude).toBeGreaterThan(85);
 expect(physical.length).toBeLessThan(5);
 await context.grantPermissions(['geolocation']);await context.setGeolocation(location);
 await page.clock.install({time:date});
 await page.goto('/de/');await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sonnenuhr',exact:true}).click();await page.locator('#seasonal-location').click();
 const shadow=page.locator('#sundial-shadow');
 await expect(shadow).toHaveAttribute('visibility','visible');
 const x=Number(await shadow.getAttribute('x2'))-180,y=Number(await shadow.getAttribute('y2'))-180;
 expect(Math.hypot(x,y)).toBeCloseTo(14,4);
 expect(x*physical.x+y*physical.y).toBeLessThan(0); // South-up projection
 await expect(shadow.locator('title')).toContainText('sehr kurze');
});
