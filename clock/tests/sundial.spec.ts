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
 await expect(page.locator('#sundial-status')).toContainText('Standort freigeben');
 await expect(page.locator('#sundial-shadow')).toHaveAttribute('visibility','hidden');
 expect(await page.evaluate(()=>(window as unknown as {sundialRequests:number}).sundialRequests)).toBe(0);
 await page.locator('#sundial-location').click();
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
 await expect(page.locator('#sundial-status')).toContainText('unter dem Horizont');
 await page.locator('#sundial-clear').click();
 await expect(page.locator('#sundial-time')).toBeEmpty();
 await expect(page.locator('#sundial-hours text')).toHaveCount(0);
 await expect(page.locator('#sundial-status')).toContainText('Standort freigeben');
 await page.reload();
 await expect(page.locator('#sundial-view')).toBeVisible();
 await expect(page.locator('#sundial-status')).toContainText('Standort freigeben');
 expect(await page.evaluate(()=>(window as unknown as {sundialRequests:number}).sundialRequests)).toBe(0);
});

test('denied location gives a retry without inventing a shadow',async({page})=>{
 await page.addInitScript(()=>{
  navigator.geolocation.getCurrentPosition=(_success,error)=>error?.({code:1,message:'Denied',PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3});
 });
 await page.goto('/en/');
 await page.locator('#trigger-view').click();
 await page.getByRole('option',{name:'Sundial',exact:true}).click();
 await page.locator('#sundial-location').click();
 await expect(page.locator('#sundial-status')).toContainText('Location access denied');
 await expect(page.locator('#sundial-location')).toBeEnabled();
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
 await page.locator('#sundial-location').click();
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
 await page.locator('#sundial-location').click();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await expect(page.locator('#sundial-status')).not.toContainText('bitte den Standort freigeben');
 await page.locator('#palette-dropdown summary').click();
 await page.locator('#remember-preferences').check();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.clock.sundial-enabled.v1'))).toBe('yes');
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toMatch(/52\.52|13\.405|latitude|longitude/);
 await page.reload();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await expect(page.locator('#sundial-location')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#sundial-status')).toContainText('52,5200° N');
 await expect(page.locator('#sundial-status')).toContainText('13,4050° E');
 await expect(page.locator('#sundial-status')).not.toContainText('Standort aktiv');
 await expect(page.locator('#sundial-location-status')).toContainText('52,5200° N');
 await page.locator('#sundial-clear').click();
 await page.reload();
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','missing');
 await expect(page.locator('#sundial-status')).toContainText('Standort freigeben');
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
 await page.locator('#sundial-location').click();
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
 await expect(page.locator('#sundial-view')).toHaveAttribute('data-location-state','ready');
 await expect(page.locator('#sundial-status')).not.toContainText('Standort freigeben');
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
 await page.locator('#sundial-location').click();
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
