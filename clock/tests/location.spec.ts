import { test, expect, type Page } from '@playwright/test';
import { locationSky } from '../src/lib/seasonal-location';
async function open(page: Page) {
 await page.goto('/de/'); await page.locator('#trigger-background').click();
 await page.locator('#options-background [role=option]').last().click();
}
test('location requires user action, uses hemisphere and is never persisted',async({page,context})=>{
 await context.grantPermissions(['geolocation']);
 await context.setGeolocation({latitude:-33.8688,longitude:151.2093});
 await page.addInitScript(()=>{
  const original=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
  Object.assign(window,{locationRequests:0});
  navigator.geolocation.getCurrentPosition=(...args)=>{
   (window as unknown as {locationRequests:number}).locationRequests++;
   original(...args);
  };
 });
 await page.clock.install({time:new Date('2026-01-01T12:00:00Z')});
 await open(page);
 const scene=page.locator('#seasonal-background'),toggle=page.locator('#seasonal-location');
 await expect(toggle).not.toBeChecked();await expect(scene).toHaveAttribute('data-location-based','false');
 expect(await page.evaluate(()=>(window as unknown as {locationRequests:number}).locationRequests)).toBe(0);
 await toggle.check();await expect(scene).toHaveAttribute('data-location-based','true');
 await expect(scene).toHaveAttribute('data-season','summer');await expect(scene).toHaveAttribute('data-phase','night');
 await expect(page.locator('#seasonal-north')).not.toBeChecked();await expect(page.locator('#seasonal-south')).not.toBeChecked();
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();
 expect(await page.evaluate(()=>localStorage.getItem('jacktools.clock.settings.v1'))).not.toMatch(/latitude|longitude|33\.8688|151\.2093|location/i);
 await page.reload();await expect(toggle).not.toBeChecked();await expect(scene).toHaveAttribute('data-location-based','false');
 expect(await page.evaluate(()=>(window as unknown as {locationRequests:number}).locationRequests)).toBe(0);
 await toggle.check();await expect(scene).toHaveAttribute('data-location-based','true');await page.locator('#seasonal-north').check();
 await expect(scene).toHaveAttribute('data-location-based','false');await expect(page.locator('#seasonal-hemisphere')).toBeVisible();
 await toggle.check();await expect(scene).toHaveAttribute('data-location-based','true');
 await page.locator('#trigger-background').click();await page.locator('#options-background [role=option]').first().click();
 await expect(toggle).not.toBeChecked();
 await page.locator('#trigger-background').click();await page.locator('#options-background [role=option]').last().click();
 await expect(scene).toHaveAttribute('data-location-based','false');
});
for(const code of [1,2,3])test(`error ${code} returns to simplified simulation`,async({page})=>{
 await page.addInitScript(code=>{navigator.geolocation.getCurrentPosition=(_success,error)=>{setTimeout(()=>error?.({code,message:'',PERMISSION_DENIED:1,POSITION_UNAVAILABLE:2,TIMEOUT:3}),0);};},code);
 await open(page);await page.locator('#seasonal-location').click();
 await expect(page.locator('#seasonal-location')).not.toBeChecked();await expect(page.locator('#seasonal-location-status')).not.toBeEmpty();
 await expect(page.locator('#seasonal-background')).toHaveAttribute('data-location-based','false');
});
test('cancelled pending location cannot reactivate simulation',async({page})=>{
 await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=success=>{Object.assign(window,{lateLocation:success});};});
 await open(page);await page.locator('#seasonal-location').check();await page.locator('#seasonal-north').check();
 await page.evaluate(()=>{(window as unknown as {lateLocation:PositionCallback}).lateLocation({coords:{latitude:52,longitude:13,accuracy:10,altitude:null,altitudeAccuracy:null,heading:null,speed:null},timestamp:Date.now()} as GeolocationPosition);});
 await expect(page.locator('#seasonal-background')).toHaveAttribute('data-location-based','false');await expect(page.locator('#seasonal-location-status')).toBeEmpty();
});
test('polar sky calculations stay finite',()=>{
 const summer=locationSky(new Date('2026-06-21T00:00:00Z'),{latitude:89,longitude:0});
 const winter=locationSky(new Date('2026-12-21T12:00:00Z'),{latitude:89,longitude:0});
 expect(summer.sunVisible).toBe(true);expect(winter.sunVisible).toBe(false);expect(winter.phase).toBe('night');
 for(const s of [summer,winter])for(const p of [s.sun,s.moon])expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);
});
test('three slider choices stay mutually exclusive and restore the manual choice',async({page})=>{
 await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=()=>{};});
 await open(page);
 const selected=page.locator('input[name=seasonalMode]:checked');
 await expect(selected).toHaveCount(1);await expect(page.locator('#seasonal-north')).toBeChecked();
 await page.locator('#seasonal-south').check();await expect(selected).toHaveCount(1);
 await expect(page.locator('#seasonal-background')).toHaveAttribute('data-season', /winter|spring|summer|autumn/);
 await page.locator('#seasonal-location').check();await expect(selected).toHaveCount(1);
 await expect(page.locator('#seasonal-south')).not.toBeChecked();
 await page.locator('#seasonal-south').check();await expect(selected).toHaveCount(1);
 await page.locator('#palette-dropdown summary').click();await page.locator('#remember-preferences').check();
 await page.reload();await expect(selected).toHaveCount(1);await expect(page.locator('#seasonal-south')).toBeChecked();
});
for(const lang of ['de','en'])test(`privacy and usage cover location in ${lang}`,async({page})=>{
 await page.goto(`/${lang}/privacy/`);await expect(page.locator('.legal-page')).toContainText(lang==='de'?'Arbeitsspeicher':'memory');
 await page.goto(`/${lang}/usage/`);await expect(page.locator('.legal-page')).toContainText(lang==='de'?'Standort':'location');
});
