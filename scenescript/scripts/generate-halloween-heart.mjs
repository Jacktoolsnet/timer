/** Package approved-to-create concept references and editable native resources; no model/API calls. */
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {halloweenHeartFilm} from '../src/lib/halloween-heart-film.ts';
import {halloweenHeartProject} from '../src/lib/halloween-heart-example.ts';
import {validateProject,projectJsonBytes} from '../src/lib/model.ts';
const root=new URL('../public/examples/halloween-heart/references/',import.meta.url),images={};
const browser=await chromium.launch();try{const page=await browser.newPage();
 for(const id of ['cottage','table','pumpkin','bread','ring','cup','hands','bread-closeup','ring-closeup','hands-closeup']){
  const file=new URL(id+'.webp',root);let bytes;try{bytes=await readFile(file);}catch{
   const source=await readFile(new URL(id+'.source.png',root)),data=await page.evaluate(async data=>{const img=new Image();img.src=data;await img.decode();const scale=Math.min(1,960/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/webp',.9);},'data:image/png;base64,'+source.toString('base64'));bytes=Buffer.from(data.split(',')[1],'base64');await writeFile(file,bytes);
  }
  images['reference-'+id]={name:id+'.webp',data:'data:image/webp;base64,'+bytes.toString('base64')};
  // Remove only our temporary project copies; full-resolution originals stay under CODEX_HOME.
  await unlink(new URL(id+'.source.png',root)).catch(()=>{});
 }
}finally{await browser.close();}
// Preserve the planning-only example for authoring workflows and explicit regression fixtures.
const planning=validateProject(halloweenHeartProject(images));await writeFile(new URL('../public/examples/halloween-heart-planning.scenescript.json',import.meta.url),JSON.stringify(planning,null,2)+'\n');
const resourceRoot=new URL('../public/examples/halloween-heart/resources/',import.meta.url),source=JSON.parse(await readFile(new URL('source.json',resourceRoot),'utf8'));
async function bitmap(file){if(!/^[a-z0-9-]+\.webp$/.test(file))throw Error('Unexpected resource file');return 'data:image/webp;base64,'+(await readFile(new URL(file,resourceRoot))).toString('base64');}
for(const library of [source.objects2d,source.stages2d])for(const resource of Object.values(library))for(const [id,image]of Object.entries(resource.model?.images??{}))resource.model.images[id]={name:image.name,data:await bitmap(image.file)};
const layers={};for(const id of ['cup','hand-left','hand-right'])layers[id]={name:id+'.webp',data:await bitmap(id+'.webp'),...source.imageDimensions[id]};
const filmImages=structuredClone(images);
for(const id of ['cottage','table','pumpkin','bread','ring']){const resource=(source.stages2d[id]??source.objects2d[id]),image=Object.values(resource.model.images)[0];filmImages['reference-'+id]={...image};}
filmImages['reference-cup']={name:layers.cup.name,data:layers.cup.data};
const project=validateProject(halloweenHeartFilm(source,filmImages,layers));if(projectJsonBytes(project)>4*1024*1024)throw Error('Starter exceeds the autosave budget: '+projectJsonBytes(project));
await writeFile(new URL('../public/examples/halloween-heart.scenescript.json',import.meta.url),JSON.stringify(project,null,2)+'\n');console.log('Halloween mit Herz:',project.scenes.length,'directed scenes,',project.scenes.reduce((n,s)=>n+s.duration,0),'seconds,',Object.keys(project.objects2d).length,'objects,',Object.keys(project.stages2d).length,'stages;',projectJsonBytes(project),'bytes');
await writeFile(new URL('../public/examples/halloween-heart/pumpkin-sprite.resource.json',import.meta.url),JSON.stringify({reply:'Bildbasierter Kürbis: Originalillustration mit separatem Kerzenflackern und Kontaktschatten. Nur diese Ressource wird importiert; bestehende Szenen und andere Ressourcen bleiben unverändert.',model:project.objects2d.pumpkin.model},null,2)+'\n');
