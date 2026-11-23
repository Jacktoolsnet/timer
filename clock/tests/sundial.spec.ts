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
 await expect(page.locator('#sundial-status')).toContainText('Location unavailable');
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
