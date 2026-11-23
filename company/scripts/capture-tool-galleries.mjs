import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const specs={
 clock:[['Runde Uhr','analog','standard','green','light'],['Römisch · Dunkel','analog','roman','violet','dark'],['Eckig · Kombiniert','combined','square-standard','blue','light'],['Klappzahlen','flip','standard','teal','dark']],
 stopwatch:[['Analog','analog',null,'green','light'],['Digital · Dunkel','digital',null,'blue','dark'],['Kombiniert','combined',null,'rose','light'],['Digital · Warm','digital',null,'terracotta','light']],
 calculator:[['Rechenstreifen · Hell','left',null,'green','light'],['Rechner rechts','right',null,'blue','light'],['Rechenstreifen · Dunkel','left',null,'violet','dark'],['Warme Farbwelt','right',null,'terracotta','light']],
 breathe:[['Quadratatmen','box','none','green','light'],['Gleichmäßig · 5–5','balanced','beach','blue','light'],['Sanft · 4–6','gentle','forest','teal','dark'],['4–7–8-Vorlage','fourSevenEight','candle','rose','dark']],
 relax:[['Ruhige Klangfläche','none',null,'green','light'],['Naturmotiv · Wald','forest',null,'teal','light'],['Abendmotiv','lake',null,'violet','dark'],['Sanfte Landschaft','meadow',null,'rose','light']],
 metronome:[['Orbit','orbit',null,'green','light'],['Pendel','pendulum',null,'blue','dark'],['Beat-Leiste','strip',null,'orange','light'],['Springender Ball','ball',null,'violet','dark']],
};
let result={};
try{result=JSON.parse(await readFile(new URL('../src/lib/tool-galleries.json',import.meta.url),'utf8'));}catch{}
const browser=await chromium.launch();
try{for(const [tool,variants] of Object.entries(specs)){
 const extraPictures=(result[tool]||[]).slice(4);
 result[tool]=[];const dir=new URL(`../public/images/galleries/${tool}/`,import.meta.url);await mkdir(dir,{recursive:true});
 for(const [i,[title,value,design,palette,theme]] of variants.entries()){
  const page=await browser.newPage({viewport:{width:1280,height:1000},colorScheme:theme,reducedMotion:'reduce'});
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
  await page.goto(`https://${tool}.jacktools.net/de/`);await page.waitForTimeout(250);
  await page.evaluate(({palette,theme})=>{
   document.querySelector(theme==='dark'?'#theme':'#theme-light')?.click();
   document.querySelector(`input[name="colorScheme"][value="${palette}"]`)?.click();
  },{palette,theme});
  const select=async(selector,value)=>page.locator(selector).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},value);
  const radio=async(name,value)=>page.evaluate(({name,value})=>{const el=document.querySelector(`input[name="${name}"][value="${value}"]`);if(!el)throw new Error(`Missing ${name}=${value}`);el.click();},{name,value});
  let caption='';
  if(tool==='clock'){await select('[name="view"]',value);await select('[name="analogDesign"]',design);caption=`${title}: Ansicht der Online-Uhr in ${theme==='dark'?'dunkler':'heller'} Darstellung mit der Farbwelt ${palette}. Datum und Zeitzone bleiben separat einstellbar.`;}
  if(tool==='stopwatch'){await select('#stopwatch-view',value);caption=`${title}: ${value==='combined'?'Analoge und digitale':'Die '+(value==='analog'?'analoge':'digitale')} Zeitdarstellung der Stoppuhr vor dem Start. Die Anzeige lässt sich unabhängig von der Farbwelt wählen.`;}
  if(tool==='calculator'){
   await page.locator('#value').fill('100');await page.locator('#step-name').fill('Ausgangsbetrag');await page.locator('#add-step').click();await page.locator('[data-operation="increase"]').click();await page.locator('#value').fill('20');await page.locator('#step-name').fill('Aufschlag');await page.locator('#add-step').click();
   await select('#calculator-side',value);caption=`${title}: Fiktive Beispielrechnung mit 100 und 20 Prozent Aufschlag. Eingabe und Rechenstreifen ${value==='right'?'mit dem Rechner rechts':'mit dem Rechner links'}.`;
  }
  if(tool==='breathe'){await radio('breathing-preset',value);await radio('breath-background',design);caption=`${title} mit ${design==='none'?'neutralem Hintergrund':'dem Hintergrundmotiv '+design}. Die Aufnahme zeigt die ausgewählte Vorlage vor dem Start, keine persönliche Atemempfehlung.`;}
  if(tool==='relax'){
   // Use values actually offered by the public tool's background picker.
   const backgrounds=await page.locator('input[name="backgroundImage"]').evaluateAll(es=>es.map(e=>e.value));
   const chosen=backgrounds.includes(value)?value:backgrounds[Math.min(i,backgrounds.length-1)];
   await radio('backgroundImage',chosen);caption=`${title}: Die Klangfläche mit dem im Tool angebotenen Hintergrund „${chosen}“ vor dem Start. Klänge und Animationen lassen sich getrennt anpassen.`;
  }
  if(tool==='metronome'){await page.locator(`button[data-view="${value}"]`).click();caption=`${title}: Eine von vier Visualisierungen für denselben Grundpuls. Die Aufnahme zeigt 90 BPM; Tempo, Takt und Unterteilungen bleiben einstellbar.`;}
  await page.waitForTimeout(450);await page.locator('input').first().blur();
  const selector=tool==='metronome'?'.metronome-card':tool==='calculator'?'.calc-workspace':'.timer-card';
  const src=`/images/galleries/${tool}/${i+1}.png`,thumb=`/images/galleries/${tool}/${i+1}-thumb.webp`;
  await page.locator(selector).first().screenshot({path:new URL(`${i+1}.png`,dir).pathname,animations:'disabled'});
  const file=new URL(`${i+1}.png`,dir).pathname;const png=await readFile(file);await sharp(file).resize({width:240,height:170,fit:'cover'}).webp({quality:75}).toFile(new URL(`${i+1}-thumb.webp`,dir).pathname);
  result[tool].push({id:`${tool}-${i+1}`,title,caption,alt:`${title}. ${caption}`,src,thumb,width:png.readUInt32BE(16),height:png.readUInt32BE(20)});
  console.log(tool,i+1,title);await page.close();
 }
 result[tool].push(...extraPictures);
 // Persist completed tools so a failed later capture does not discard the set.
 await writeFile(new URL('../src/lib/tool-galleries.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
}}finally{await browser.close();}
