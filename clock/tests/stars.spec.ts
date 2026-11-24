import {test,expect} from '@playwright/test';
import catalog from '../src/lib/stars-catalog.json' with {type:'json'};
import {visibleStars,illustrativeStars} from '../src/lib/stars';
import {starPosition,siderealDegrees,skyPoint} from '../src/lib/sky-coordinates';
const berlin={latitude:52.52,longitude:13.405};

test('catalog retains bright recognizable stars and valid equatorial coordinates',()=>{
 expect(catalog.length).toBe(519);
 expect(new Set(catalog.map(s=>s.id)).size).toBe(catalog.length);
 for(const id of [32349,27989,24436,11767,60718])expect(catalog.some(s=>s.id===id)).toBe(true);
 for(const star of catalog){expect(star.ra).toBeGreaterThanOrEqual(0);expect(star.ra).toBeLessThan(24);expect(Math.abs(star.dec)).toBeLessThanOrEqual(90);expect(star.mag).toBeLessThanOrEqual(4);}
});
test('sidereal time and horizon transformation match analytical reference cases',()=>{
 const date=new Date('2000-01-01T12:00:00Z');
 expect(siderealDegrees(date)).toBeCloseTo(280.460625,4);
 const northPole=starPosition(0,90,52,0);expect(northPole.altitude).toBeCloseTo(52);expect(northPole.azimuth).toBeCloseTo(0);
 const equator=starPosition(0,0,0,0);expect(equator.altitude).toBeCloseTo(90);
 const east=starPosition(6,0,0,0);expect(east.altitude).toBeCloseTo(0);expect(east.azimuth).toBeCloseTo(90);
 const west=starPosition(18,0,0,0);expect(west.azimuth).toBeCloseTo(270);
 expect((siderealDegrees(new Date(date.getTime()+3600000))-siderealDegrees(date)+360)%360).toBeCloseTo(15.041,2);
});
test('stars follow season, local horizon and both hemispheres without nonfinite projections',()=>{
 const winter=new Date('2026-11-24T20:00:00Z'),summer=new Date('2026-06-24T20:00:00Z');
 const winterStars=visibleStars(winter,berlin),summerStars=visibleStars(summer,berlin);
 expect(winterStars.some(s=>s.id===27989)).toBe(true); // Betelgeuse / Orion
 expect(summerStars.some(s=>s.id===27989)).toBe(false);
 expect(winterStars.some(s=>s.id===11767)).toBe(true); // Polaris
 const south=visibleStars(winter,{latitude:-33.87,longitude:151.21});
 expect(south.some(s=>s.id===11767)).toBe(false);
 for(const latitude of [-90,-45,0,45,90])for(const star of visibleStars(winter,{latitude,longitude:180})){
  expect(star.altitude).toBeGreaterThan(0);expect(Number.isFinite(star.x+star.y)).toBe(true);
  expect(star.x).toBeGreaterThanOrEqual(40);expect(star.x).toBeLessThanOrEqual(1560);
 }
 expect(skyPoint(0,90).x).toBeLessThan(skyPoint(0,270).x);
 const a=illustrativeStars(winter,'Europe/Berlin','north'),b=illustrativeStars(summer,'Europe/Berlin','north');
 expect(a.map(s=>s.id)).not.toEqual(b.map(s=>s.id));
});

test('night stars are white points, react to location and time, and fade in daytime',async({page,context},info)=>{
 await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.fulfill({body:''}));
 await context.grantPermissions(['geolocation']);await context.setGeolocation(berlin);
 await page.clock.install({time:new Date('2026-11-24T20:00:00Z')});
 await page.goto('/de/');await page.locator('#trigger-background').click();await page.locator('#options-background [role=option]').last().click();
 const root=page.locator('#seasonal-background'),stars=page.locator('[data-seasonal=stars]');
 await expect(root).toHaveAttribute('data-star-mode','illustrative');
 await page.locator('#seasonal-location').check();await expect(root).toHaveAttribute('data-star-mode','location');
 await expect(stars).toHaveCSS('opacity','1');
 await expect(stars.locator('line, text, path')).toHaveCount(0);
 expect(await stars.locator('circle').count()).toBeGreaterThan(100);
 await expect(stars).toHaveCSS('fill','rgb(255, 255, 255)');
 const first=stars.locator('circle').first(),before=await first.getAttribute('cx');
 await page.clock.fastForward(60000);expect(await first.getAttribute('cx')).not.toBe(before);
 await page.locator('.clock-card').screenshot({path:`/tmp/seasonal-stars-${info.project.name}.png`});
 await context.setGeolocation({latitude:-33.87,longitude:151.21});
 await expect(stars.locator('[data-star="11767"]')).toHaveCount(0);
 await context.setGeolocation(berlin);
 await page.clock.setSystemTime(new Date('2026-11-24T12:00:00Z'));await page.clock.runFor(1100);
 await expect(stars).toHaveCSS('opacity','0');
 await page.locator('#seasonal-north').check();await expect(root).toHaveAttribute('data-star-mode','illustrative');
 const license=await page.request.get('/licenses/stars.txt');expect(license.ok()).toBe(true);expect(await license.text()).toContain('Olaf Frohn');
});

test('reduced motion keeps stellar positions unchanged within the hour',async({page})=>{
 await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install({time:new Date('2026-11-24T20:00:00Z')});
 await page.goto('/de/');await page.locator('#trigger-background').click();await page.locator('#options-background [role=option]').last().click();
 const stars=page.locator('[data-seasonal=stars]');const before=await stars.innerHTML();
 await page.clock.fastForward(30000);expect(await stars.innerHTML()).toBe(before);
});
