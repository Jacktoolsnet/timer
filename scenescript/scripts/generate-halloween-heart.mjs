/** Package approved-to-create concept references and editable native resources; no model/API calls. */
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {chromium} from '@playwright/test';
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
const project=validateProject(halloweenHeartProject(images));if(projectJsonBytes(project)>4*1024*1024)throw Error('Starter exceeds the autosave budget');await writeFile(new URL('../public/examples/halloween-heart.scenescript.json',import.meta.url),JSON.stringify(project,null,2)+'\n');console.log('Halloween mit Herz:',project.storyboard.shots.length,'planned shots,',Object.keys(images).length,'references,',Object.keys(project.objects2d).length,'objects,',Object.keys(project.stages2d).length,'stages;',projectJsonBytes(project),'bytes');

await writeFile(new URL('../public/examples/halloween-heart/pumpkin-sprite.resource.json',import.meta.url),JSON.stringify({reply:'Bildbasierter Kürbis: Originalillustration mit separatem Kerzenflackern. Nur diese Ressource wird importiert; bestehende Szenen und andere Ressourcen bleiben unverändert.',model:project.objects2d.pumpkin.model},null,2)+'\n');
