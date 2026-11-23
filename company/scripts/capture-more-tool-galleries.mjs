/** Additional public UI captures. No accounts, posts, consents or device permissions. */
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const metadata=new URL('../src/lib/tool-galleries.json',import.meta.url);
const galleries=JSON.parse(await readFile(metadata,'utf8'));
const specs={
 clock:[
  {title:'Eckig · Römische Zahlen',view:'analog',design:'square-roman',palette:'rose',theme:'light'},
  {title:'Bahnhofsuhr · Dunkel',view:'analog',design:'railway',palette:'red',theme:'dark'},
  {title:'Analog und Klappzahlen',view:'analogFlip',design:'minimal',palette:'orange',theme:'light'},
  {title:'Zeitzone Tokio',view:'digital',zone:'Asia/Tokyo',palette:'blue',theme:'dark'},
 ],
 stopwatch:[
  {title:'Messung mit Runden',view:'digital',laps:true,palette:'teal',theme:'light'},
  {title:'Runden · Kombinierte Anzeige',view:'combined',laps:true,palette:'violet',theme:'dark'},
  {title:'Analoge Messung · Rosé',view:'analog',laps:true,palette:'rose',theme:'light'},
  {title:'Fokusansicht · Digital',view:'digital',focus:true,palette:'orange',theme:'dark'},
 ],
 calculator:[
  {title:'Aufschlag und Rabatt',calculation:'discount',palette:'teal',theme:'light'},
  {title:'Rechnung mit Währungsangabe',calculation:'currency',palette:'blue',theme:'dark'},
  {title:'Geteilte Beträge',calculation:'division',palette:'rose',theme:'light'},
  {title:'Rechenschritte deaktivieren',calculation:'disabled',palette:'orange',theme:'dark'},
 ],
 breathe:[
  {title:'Gleichmäßiger Rhythmus · Polarlicht',preset:'balanced',background:'polar',palette:'violet',theme:'dark'},
  {title:'Quadratatmen · Wiese',preset:'box',background:'meadow',palette:'orange',theme:'light'},
  {title:'Sanfte Vorlage · See',preset:'gentle',background:'lake',palette:'blue',theme:'light'},
  {title:'Eigener Rhythmus · Dünen',preset:'custom',background:'dunes',palette:'terracotta',theme:'dark'},
 ],
 relax:[
  {title:'Sommergarten',background:'summer-garden',preset:'summer',palette:'green',theme:'light'},
  {title:'Abendruhe',background:'evening-terrace',preset:'evening',palette:'violet',theme:'dark'},
  {title:'Lagerplatz am See',background:'lakeside-camp',preset:'fireside',palette:'orange',theme:'dark'},
  {title:'Ruhige Küste',background:'quiet-coast',preset:'nature',palette:'blue',theme:'light'},
 ],
 metronome:[
  {title:'120 BPM · Unterteilungen',view:'orbit',bpm:120,subdivision:'2',palette:'teal',theme:'light'},
  {title:'Drei Schläge pro Takt',view:'pendulum',bpm:75,beats:3,palette:'rose',theme:'dark'},
  {title:'Beat-Leiste · Triolen',view:'strip',bpm:80,subdivision:'3',palette:'blue',theme:'light'},
  {title:'Ballansicht · Sechs Schläge',view:'ball',bpm:100,beats:6,palette:'terracotta',theme:'dark'},
 ],
};
const browser=await chromium.launch();
const save=async(page,tool,index,title,caption,selector)=>{
 const dir=new URL(`../public/images/galleries/${tool}/`,import.meta.url);await mkdir(dir,{recursive:true});
 const file=new URL(`${index}.png`,dir).pathname;
 await page.waitForTimeout(350);
 if(selector)await page.locator(selector).first().screenshot({path:file,animations:'disabled',style:'.site-header{visibility:hidden!important}'});else await page.screenshot({path:file,animations:'disabled'});
 const png=await readFile(file);await sharp(file).resize({width:240,height:170,fit:'cover'}).webp({quality:75}).toFile(new URL(`${index}-thumb.webp`,dir).pathname);
 const picture={id:`${tool}-${index}`,title,caption,alt:title+'. '+caption,src:`/images/galleries/${tool}/${index}.png`,thumb:`/images/galleries/${tool}/${index}-thumb.webp`,width:png.readUInt32BE(16),height:png.readUInt32BE(20)};
 galleries[tool].push(picture);await writeFile(metadata,JSON.stringify(galleries,null,2)+'\n');console.log(tool,index,title);
};
try{
 for(const [tool,variants] of Object.entries(specs)){
  if(process.argv.length>2&&!process.argv.slice(2).includes(tool))continue;
  galleries[tool]=galleries[tool].slice(0,4);
  for(const [i,v] of variants.entries()){
   const page=await browser.newPage({viewport:{width:1280,height:1000},colorScheme:v.theme,reducedMotion:'reduce',locale:'de-DE'});
   await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({body:''}));
   await page.goto(`https://${tool}.jacktools.net/de/`);
   await page.locator('main').waitFor();
   await page.evaluate(v=>{
    document.querySelector(v.theme==='dark'?'#theme':'#theme-light')?.click();
    document.querySelector(`input[name="colorScheme"][value="${v.palette}"]`)?.click();
   },v);
   const select=async(selector,value)=>page.locator(selector).evaluate((el,value)=>{el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}));},value);
   const radio=async(name,value)=>page.locator(`input[name="${name}"][value="${value}"]`).evaluate(el=>el.click());
   const number=async(selector,value)=>{await page.locator(selector).fill(String(value));await page.locator(selector).dispatchEvent('change');};
   let caption='';let selector=tool==='calculator'?'.calc-workspace':tool==='metronome'?'.metronome-card':'.timer-card';
   if(tool==='clock'){
    await select('[name="view"]',v.view);if(v.design)await select('[name="analogDesign"]',v.design);if(v.zone)await select('[name="zone"]',v.zone);
    caption=v.zone?'Digitale Uhr mit der Zeitzone Asia/Tokyo. Die dargestellte Uhrzeit stammt vom Zeitpunkt der Aufnahme.':`${v.title}: eine weitere Kombination aus Zifferblatt, Darstellung und Farbwelt der Online-Uhr.`;
   }
   if(tool==='stopwatch'){
    await select('#stopwatch-view',v.view);
    if(v.laps){await page.locator('#toggle-timing').click();await page.waitForTimeout(650);await page.locator('#lap').click();await page.waitForTimeout(850);await page.locator('#lap').click();await page.locator('#toggle-timing').click();}
    if(v.focus){await page.locator('#stopwatch-focus').click();selector=null;}
    caption=v.laps?'Kurze Demonstrationsmessung mit zwei erfassten Runden. Die Werte wurden nur für diese Aufnahme erzeugt.':'Die digitale Stoppuhr in der Fokusansicht. Gestaltung und Farbschema lassen sich unabhängig von der Messung ändern.';
   }
   if(tool==='calculator'){
    const step=async(operation,value,name)=>{await page.locator(operation==='divide'?'[data-key="÷"]':`[data-operation="${operation}"]`).click();await page.locator('#value').fill(String(value));await page.locator('#step-name').fill(name);await page.locator('#add-step').click();};
    if(v.calculation==='division'){await step('set',240,'Beispielbetrag');await step('divide',3,'Drei gleiche Teile');caption='Fiktives Beispiel: Ein Betrag von 240 wird in drei gleiche Teile aufgeteilt. Der Rechenstreifen hält die Schritte fest.';}
    else{
     await step('set',100,'Beispielbetrag');await step('increase',20,'Aufschlag');await step('discount',10,'Rabatt');
     if(v.calculation==='currency')await select('#currency','EUR');
     if(v.calculation==='disabled'){
      const switches=page.locator('.calc-tape input[role="switch"],.calc-tape button[role="switch"]');
      await switches.nth(1).evaluate(el=>el.click());
     }
     caption=v.calculation==='disabled'?'Fiktive Beispielrechnung mit einem vorübergehend deaktivierten Rechenschritt. Nachfolgende Ergebnisse berücksichtigen nur aktive Schritte.':v.calculation==='currency'?'Fiktive Beispielrechnung mit der Währungsangabe EUR. Das Tool führt dabei keine Währungsumrechnung durch.':'Fiktives Beispiel mit einem Startwert von 100, 20 Prozent Aufschlag und anschließend 10 Prozent Rabatt.';
    }
   }
   if(tool==='breathe'){
    await radio('breathing-preset',v.preset);await radio('breath-background',v.background);
    caption=`${v.title}: die ausgewählte Atemvorlage mit einem weiteren Hintergrundmotiv vor dem Start. Dies ist eine Darstellung der Einstellungen, keine persönliche Atemempfehlung.`;
   }
   if(tool==='relax'){
    await radio('preset',v.preset);await radio('backgroundImage',v.background);
    caption=`${v.title}: ausgewählte Klangvorlage und Hintergrundmotiv vor der Wiedergabe. Instrumente, Naturgeräusche und Animationen bleiben einzeln anpassbar.`;
   }
   if(tool==='metronome'){
    await page.locator(`button[data-view="${v.view}"]`).click();await number('#bpm',v.bpm);
    if(v.beats)await number('#beats',v.beats);if(v.subdivision)await select('#subdivision',v.subdivision);
    caption=`${v.title}: Das Metronom ist auf ${v.bpm} BPM${v.beats?', '+v.beats+' Schläge pro Takt':''}${v.subdivision?' und '+v.subdivision+' gleichmäßige Unterteilungen pro Schlag':''} eingestellt.`;
   }
   await page.locator('input').first().blur();await save(page,tool,i+5,v.title,caption,selector);await page.close();
  }
 }
 // MessageDrop's onboarding can be inspected without accepting legal terms,
 // asserting an age, enabling external providers or creating a user.
 if(!process.argv.includes('--skip-messagedrop')) {
 galleries.messagedrop=galleries.messagedrop.slice(0,4);
 const onboarding=[
  {title:'Willkommen und Einrichtung',caption:'Öffentlicher Einrichtungsbildschirm vor der ersten Nutzung. Keine Zustimmung, Altersangabe oder Anmeldung wurde vorgenommen.'},
  {title:'Einstellungen für externe Inhalte',button:'Externe Inhalte bearbeiten',caption:'Ansicht der Einstellungen für externe Anbieter. Für die Aufnahme wurde kein Anbieter aktiviert und keine Zustimmung erteilt.'},
  {title:'Nutzungszeit konfigurieren',button:'Nutzungszeit konfigurieren',caption:'Die öffentliche Einrichtungsansicht für Nutzungszeit und Schutzfunktionen. Es wurden keine persönlichen Daten eingegeben oder Einstellungen gespeichert.'},
  {title:'Datenschutzhinweise lesen',button:'Datenschutz (prüfen und akzeptieren)',caption:'Geöffnete Datenschutzhinweise während der Einrichtung. Die Aufnahme zeigt die Leseansicht; es wurde nichts akzeptiert.'},
 ];
 for(const [i,v] of onboarding.entries()){
  const page=await browser.newPage({viewport:{width:1280,height:900},locale:'de-DE',reducedMotion:'reduce'});
  await page.goto('https://app.messagedrop.de/');await page.getByRole('button',{name:'Externe Inhalte bearbeiten',exact:true}).waitFor();
  if(v.button)await page.getByRole('button',{name:v.button,exact:true}).click();
  await save(page,'messagedrop',i+5,v.title,v.caption,null);await page.close();
 }
 }
}finally{await browser.close();}
