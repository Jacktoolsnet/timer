/** Fully offline, repeatable example generation; the authored cover is preserved. */
import {readFile,writeFile,rename} from 'node:fs/promises';
import {validateProject} from '../src/lib/model.ts';
const textures={};for(const [id,name]of [['chocolateTexture','inflation-chocolate-texture.jpg'],['moneyTexture','inflation-money-texture.jpg']]){const image=await readFile(new URL('../public/examples/'+name,import.meta.url));textures[id]={name,data:'data:image/jpeg;base64,'+image.toString('base64')};}
const textureFile=new URL('../src/lib/inflation-textures.json',import.meta.url),textureJson=JSON.stringify(textures)+'\n';if(await readFile(textureFile,'utf8').catch(()=>null)!==textureJson){const tmp=new URL(textureFile.href+'.tmp');await writeFile(tmp,textureJson);await rename(tmp,textureFile);}
const {inflationExample}=await import('../src/lib/inflation-example.ts');
const cover=await readFile(new URL('../public/examples/inflation-cover-en.jpg',import.meta.url));
const project=validateProject({...inflationExample,assets:{...inflationExample.assets,cover:{name:'Inflation-for-Dummies.jpg',data:'data:image/jpeg;base64,'+cover.toString('base64')}},thumbnail:{name:'Inflation-Explained-Cover.jpg',data:'data:image/jpeg;base64,'+cover.toString('base64')}});
const destination=new URL('../public/examples/inflation-explained.scenescript.json',import.meta.url),temporary=new URL(destination.href+'.tmp');
await writeFile(temporary,JSON.stringify(project,null,2)+'\n');await rename(temporary,destination);
