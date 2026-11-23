// Capture the local implementation; no real location or personal data is used.
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const origin=process.env.CLOCK_ORIGIN||'http://127.0.0.1:4333';
const galleryFile=new URL('../src/lib/tool-galleries.json',import.meta.url);
const galleries=JSON.parse(await readFile(galleryFile,'utf8'));
const browser=await chromium.launch();
try {
 for(const [id,view,design,palette] of [[9,'orbit','standard','violet'],[10,'sundial','standard','green']]) {
  const context=await browser.newContext({viewport:{width:1280,height:1100},timezoneId:'Europe/Berlin',locale:'de-DE',colorScheme:'light',permissions:['geolocation'],geolocation:{latitude:52.52,longitude:13.405},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
  await page.clock.install({time:new Date('2026-06-21T08:24:35Z')});
  await page.goto(`${origin}/de/`);
  await page.evaluate(({view,design,palette})=>{
   document.querySelector('#theme-light')?.click();
   document.querySelector(`input[name="colorScheme"][value="${palette}"]`)?.click();
  },{view,design,palette});
  await page.locator('#trigger-view').click();
  await page.getByRole('option',{name:view==='orbit'?'Orbit-Uhr':'Sonnenuhr',exact:true}).click();
  if(view==='sundial') {await page.locator('#seasonal-location').check();await page.locator('#sundial-view[data-location-state="ready"]').waitFor();}
  await page.clock.pauseAt(new Date('2026-06-21T08:24:36Z'));
  await page.evaluate(()=>document.activeElement?.blur());
  const file=new URL(`../public/images/galleries/clock/${id}.png`,import.meta.url);
  await page.locator('.clock-card').screenshot({path:file.pathname,animations:'disabled'});
  const metadata=await sharp(file.pathname).metadata();
  await sharp(file.pathname).resize({width:240,height:170,fit:'cover'}).webp({quality:80}).toFile(new URL(`../public/images/galleries/clock/${id}-thumb.webp`,import.meta.url).pathname);
  const title=view==='orbit'?'Orbit-Uhr':'Sonnenuhr · Berlin';
  const caption=view==='orbit'?'Orbit-Uhr mit drei Umlaufbahnen für Stunden, Minuten und Sekunden in der Farbwelt Violett.':'Sonnenuhr mit Sonnenstand, Schatten und Klappzahlen. Simulierter Standort Berlin am 21. Juni 2026; die angezeigten Zeiten sind Beispielwerte.';
  const alt=view==='orbit'?'Rundes Zifferblatt der Orbit-Uhr mit drei konzentrischen Bahnen und leuchtendem Zentrum.':'Grüne Sonnenuhr für Berlin mit Sonne am Rand, Schatten, Sonnenzeiten und digitaler Uhrzeit im Ziffernblatt.';
  galleries.clock=galleries.clock.filter(p=>p.id!==`clock-${id}`);
  galleries.clock.push({id:`clock-${id}`,title,caption,alt,src:`/images/galleries/clock/${id}.png`,thumb:`/images/galleries/clock/${id}-thumb.webp`,width:metadata.width,height:metadata.height});
  await context.close();
 }
 await writeFile(galleryFile,JSON.stringify(galleries,null,2)+'\n');
} finally {await browser.close();}
