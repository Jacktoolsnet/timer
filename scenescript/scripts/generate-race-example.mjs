/** Requires a running local SceneScript dev server; authors original assets, never edits user storage. */
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {race3DExample,raceDuration3D} from '../src/lib/race3d-example.ts';
import {raceEffectsWav} from '../src/lib/race3d-audio.ts';
const raw={...race3DExample,audios:{racefx:{name:'Motoren, Startsignal & Zieljubel (synthetisch).wav',duration:raceDuration3D,data:'data:audio/wav;base64,'+Buffer.from(raceEffectsWav(raceDuration3D)).toString('base64')}},narration:{asset:'racefx',volume:.65,fadeIn:.05,fadeOut:1,instructions:'Synthetische Soundeffekte, kein gesprochener Text.'}};
const browser=await chromium.launch();
try{
 const page=await browser.newPage();await page.goto((process.env.BASE_URL??'http://127.0.0.1:4321')+'/de/');await page.waitForSelector('#editor[data-ready=true]');
 const project=await page.evaluate(async raw=>{
  const {validateProject}=await import('/src/lib/model.ts'),{exportStill}=await import('/src/scripts/still-export.ts');const p=validateProject(raw),blob=await exportStill(p,1.5,new AbortController().signal);
  p.thumbnail={name:'Monstertruck-Duell-Cover.png',data:await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);})};return p;
 },raw);
 await writeFile(new URL('../public/examples/monstertruck-race.scenescript.json',import.meta.url),JSON.stringify(project,null,2)+'\n');
}finally{await browser.close();}
