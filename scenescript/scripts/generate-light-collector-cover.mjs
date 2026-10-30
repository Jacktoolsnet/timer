/** Compose the poster using the demo's native artwork and editable text, without API calls. */
import {writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
const index=process.argv.indexOf('--url'),base=index<0?'http://127.0.0.1:4321':process.argv[index+1];
if(!base)throw Error('--url requires a running SceneScript dev server URL');
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
let cover;
try{
 const page=await browser.newPage();await page.goto(new URL('/de/',base).href);await page.locator('#editor[data-ready=true]').waitFor();
 cover=await page.evaluate(async()=>{
  const {lightCollectorProject}=await import('/src/lib/light-collector-example.ts'),{lightCollectorCoverProject}=await import('/src/lib/light-collector-cover.ts'),{validateProject}=await import('/src/lib/model.ts'),{ExportMedia}=await import('/src/scripts/export-media.ts'),{ExportRenderer}=await import('/src/scripts/export-renderer.ts');
  const project=validateProject(lightCollectorCoverProject(lightCollectorProject())),media=new ExportMedia(project,new AbortController().signal),renderer=new ExportRenderer(project,media);
  try{const canvas=await renderer.frame(1,1280,720);return {name:'der-kleine-lichtsammler-cover.png',data:canvas.toDataURL('image/png')};}finally{renderer.dispose();media.dispose();}
 });
}finally{await browser.close();}
await writeFile(new URL('../public/examples/'+cover.name,import.meta.url),Buffer.from(cover.data.split(',')[1],'base64'));
await writeFile(new URL('../src/lib/light-collector-cover.json',import.meta.url),JSON.stringify(cover,null,2)+'\n');
const result=spawnSync(process.execPath,['--experimental-strip-types','scripts/generate-light-collector.mjs'],{cwd:new URL('../',import.meta.url),stdio:'inherit'});if(result.status!==0)throw Error('Failed to package demo');
console.log('Rendered 1280×720 project cover.');
