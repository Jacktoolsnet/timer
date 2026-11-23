/** Read-only captures of the public timer. No real advertising requests. */
import {chromium} from '@playwright/test';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
const variants = [
 {id:'digital-green',title:'Countdown · Digital',mode:'timer',view:'digital',design:'standard',palette:'green',theme:'light',style:'technical',caption:'Digitale Restzeit im hellen, grünen Design. Schnellwahl und Steuerung stehen direkt unter der Anzeige.'},
 {id:'round-standard',title:'Analog · Rund',mode:'timer',view:'analog',design:'standard',palette:'blue',theme:'light',style:'warm',caption:'Rundes Standard-Zifferblatt mit arabischen Zahlen in der blauen Farbwelt.'},
 {id:'round-roman',title:'Analog · Römisch',mode:'timer',view:'analog',design:'roman',palette:'terracotta',theme:'dark',style:'warm',caption:'Rundes Zifferblatt mit römischen Zahlen, dunkler Darstellung und Terrakotta-Akzenten.'},
 {id:'round-minimal',title:'Analog · Minimalistisch',mode:'timer',view:'analog',design:'minimal',palette:'teal',theme:'light',style:'minimal',caption:'Ein reduziertes rundes Zifferblatt ohne ausgeschriebene Zahlen in Türkis.'},
 {id:'round-railway',title:'Analog · Bahnhofsuhr',mode:'timer',view:'analog',design:'railway',palette:'red',theme:'light',style:'technical',caption:'Die runde Bahnhofsuhr-Variante mit klaren Markierungen und roten Akzenten.'},
 {id:'square-standard',title:'Eckig · Standard',mode:'timer',view:'analog',design:'square-standard',palette:'orange',theme:'light',style:'technical',caption:'Eckiges Standard-Zifferblatt mit arabischen Zahlen in der orangefarbenen Gestaltung.'},
 {id:'square-roman',title:'Eckig · Römisch',mode:'timer',view:'analog',design:'square-roman',palette:'violet',theme:'dark',style:'soft',caption:'Eckige Form mit römischen Zahlen, violetten Akzenten und dunklem Hintergrund.'},
 {id:'square-minimal',title:'Eckig · Minimalistisch',mode:'timer',view:'analog',design:'square-minimal',palette:'rose',theme:'light',style:'minimal',caption:'Die minimalistische eckige Ansicht in Rosé: Form und Markierungen statt großer Zahlen.'},
 {id:'square-railway',title:'Eckig · Bahnhofsuhr',mode:'timer',view:'combined',design:'square-railway',palette:'green',theme:'dark',style:'technical',caption:'Eckige Bahnhofsuhr mit zusätzlicher digitaler Restzeit. Analoge und digitale Orientierung in einer Ansicht.'},
 {id:'pomodoro-focus',title:'Pomodoro · Fokus',mode:'pomodoro',view:'combined',design:'roman',palette:'blue',theme:'dark',style:'technical',caption:'Pomodoro-Fokusphase in der kombinierten Ansicht: römisches Zifferblatt, digitale Minuten und Rundenzähler.'},
 {id:'pomodoro-break',title:'Pomodoro · Pause',mode:'pomodoro',view:'digital',design:'standard',palette:'teal',theme:'light',style:'soft',phase:'break',caption:'Die kurze Pomodoro-Pause mit digitaler Anzeige. Neue Phasen starten weiterhin bewusst manuell.'},
 {id:'interval',title:'Intervalle · Aktivphase',mode:'training',view:'combined',design:'square-standard',palette:'orange',theme:'dark',style:'technical',phase:'active',caption:'Aktivphase eines Intervallablaufs mit 45 Sekunden Aktivität, 15 Sekunden Pause und sechs Runden.'},
 {id:'focus-background',title:'Fokusansicht · Hintergrund',mode:'timer',view:'combined',design:'square-roman',palette:'violet',theme:'dark',style:'warm',background:'desk',focus:true,caption:'Fokusansicht mit eckigem römischem Zifferblatt und dem Hintergrund „Fokus-Schreibtisch“.'},
];
const output = new URL('../public/images/timer/gallery/',import.meta.url);
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
try {
 for(const v of variants){
  const page=await browser.newPage({viewport:{width:1280,height:850},colorScheme:v.theme,reducedMotion:'reduce',deviceScaleFactor:1});
  await page.route(/googlesyndication\.com|doubleclick\.net|googleadservices\.com/,r=>r.fulfill({contentType:'application/javascript',body:''}));
  await page.goto(`https://timer.jacktools.net/de/${v.mode==='timer'?'':v.mode+'/'}`);
  await page.locator('#timer-appearance').waitFor();
  await page.evaluate(v=>{
   document.querySelector(v.theme==='dark'?'#theme':'#theme-light').click();
   for(const [name,value] of [['colorScheme',v.palette],['visualStyle',v.style]]) document.querySelector(`input[name="${name}"][value="${value}"]`).click();
   for(const [name,value] of [['timerView',v.view],['analogDesign',v.design],['background',v.background||'none']]){
    const select=document.querySelector(`select[name="${name}"]`);select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));
   }
  },v);
  if(v.phase==='break')await page.locator('#next').click();
  if(v.phase==='active'){
   await page.locator('[name="preparation"]').fill('0');await page.locator('[name="work"]').fill('45');await page.locator('[name="rest"]').fill('15');await page.locator('[name="rounds"]').fill('6');
   await page.locator('#training-form button[type="submit"]').click();await page.locator('#training-start').click();await page.waitForTimeout(200);await page.locator('#training-start').click();
  }
  if(v.focus)await page.locator('#focus-view').click();
  await page.waitForTimeout(350);
  const path=new URL(v.id+'.png',output).pathname;
  if(v.focus)await page.screenshot({path,animations:'disabled'});else await page.locator('.timer-card').screenshot({path,animations:'disabled'});
  // Read actual PNG dimensions (screenshots may round fractional CSS heights up).
  const {readFile}=await import('node:fs/promises');const png=await readFile(path);
  v.width=png.readUInt32BE(16);v.height=png.readUInt32BE(20);v.src='/images/timer/gallery/'+v.id+'.png';v.alt=v.title+'. '+v.caption;
  v.thumb='/images/timer/gallery/'+v.id+'-thumb.webp';
  await sharp(path).resize({width:240,height:170,fit:'contain',background:'#eef1f5'}).webp({quality:75}).toFile(new URL(v.id+'-thumb.webp',output).pathname);
  console.log(v.id,v.width,v.height);await page.close();
 }
 await writeFile(new URL('../src/lib/timer-gallery.json',import.meta.url),JSON.stringify(variants,null,2)+'\n');
}finally{await browser.close();}
