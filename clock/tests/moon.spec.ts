import {test,expect} from '@playwright/test';
import {getMoonPosition,getMoonIllumination} from 'suncalc';
import {moonLight,moonPhasePath} from '../src/lib/moon';
import {locationSky} from '../src/lib/seasonal-location';

const berlin={latitude:52.52,longitude:13.405};
test('lunar cycle distinguishes new, waxing half, full and waning half moons',()=>{
 const dates=['2026-11-09T12:00:00Z','2026-11-17T12:00:00Z','2026-11-24T20:00:00Z','2026-12-01T12:00:00Z'];
 const light=dates.map(d=>moonLight(new Date(d),berlin));
 expect(light[0].fraction).toBeLessThan(.01);
 expect(light[1].fraction).toBeCloseTo(.5,1);expect(light[1].waxing).toBe(true);
 expect(light[2].fraction).toBeGreaterThan(.99);
 expect(light[3].fraction).toBeCloseTo(.5,1);expect(light[3].waxing).toBe(false);
 expect(new Set(light.map(l=>moonPhasePath(l.fraction))).size).toBe(4);
 for(const f of [0,.25,.5,.75,1])expect(moonPhasePath(f)).not.toMatch(/NaN|Infinity/);
});
test('bright limb tilts to local viewing orientation on both hemispheres',()=>{
 const date=new Date('2026-11-17T14:00:00Z');
 const angles=[berlin,{latitude:-33.87,longitude:151.21}].map(location=>{
  const light=moonLight(date,location);
  expect(light.rotation).toBeCloseTo(-(getMoonIllumination(date).angle-getMoonPosition(date,location.latitude,location.longitude).parallacticAngle)-90);
  return light.rotation;
 });
 expect(Math.abs(angles[0]-angles[1])).toBeGreaterThan(20);
});
test('visibility follows the lunar horizon, also during daytime',()=>{
 const day=new Date('2026-11-17T14:00:00Z');
 expect(locationSky(day,berlin).sunVisible).toBe(true);
 expect(locationSky(day,berlin).moonVisible).toBe(true);
 expect(locationSky(new Date('2026-11-17T08:00:00Z'),berlin).moonVisible).toBe(false);
});

test('seasonal background renders a full moon, then updates phase and local tilt',async({page,context},info)=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
 await context.grantPermissions(['geolocation']);await context.setGeolocation(berlin);
 await page.clock.install({time:new Date('2026-11-24T20:00:00Z')});
 await page.goto('/de/');
 await page.locator('#trigger-background').click();await page.locator('#options-background [role=option]').last().click();
 await page.locator('#seasonal-location').check();
 const scene=page.locator('#seasonal-background'),light=page.locator('[data-seasonal=moon-light]');
 await expect(scene).toHaveAttribute('data-location-based','true');
 await expect.poll(async()=>Number(await scene.getAttribute('data-moon-fraction'))).toBeGreaterThan(.99);
 await expect(page.locator('[data-seasonal=moon]')).toHaveCSS('opacity','1');
 const full=await light.getAttribute('d');expect(full).toBeTruthy();
 await page.locator('.clock-card').screenshot({path:`/tmp/seasonal-full-moon-${info.project.name}.png`});
 await page.clock.setSystemTime(new Date('2026-12-01T12:00:00Z'));await page.clock.runFor(1100);
 await expect.poll(async()=>Number(await scene.getAttribute('data-moon-fraction'))).toBeLessThan(.55);
 expect(await light.getAttribute('d')).not.toBe(full);
 const before=await light.getAttribute('transform');
 await context.setGeolocation({latitude:-33.87,longitude:151.21});
 await expect.poll(()=>light.getAttribute('transform')).not.toBe(before);
});
