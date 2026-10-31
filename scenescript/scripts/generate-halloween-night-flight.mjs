/** Deterministic offline packager; no model calls or credentials. */
import {readFile,writeFile} from 'node:fs/promises';
import {halloweenNightFlight} from '../src/lib/halloween-night-flight.ts';
import {validateProject,projectJsonBytes} from '../src/lib/model.ts';
const root=new URL('../public/examples/halloween-night-flight/',import.meta.url),dimensions=JSON.parse(await readFile(new URL('dimensions.json',root))),art={},refs={};
for(const[id,size]of Object.entries(dimensions)){const name=id+'.webp',data='data:image/webp;base64,'+(await readFile(new URL(name,root))).toString('base64');art[id]={name,data,...size};refs['reference-'+id]={name,data};}
for(const id of ['bat','spider'])refs['reference-'+id]={name:id+'.webp',data:'data:image/webp;base64,'+(await readFile(new URL('reference-'+id+'.webp',root))).toString('base64')};
const bytes=await readFile(new URL('santa-ho-ho-ho.wav',root)),rate=bytes.readUInt32LE(24),samples=(bytes.length-44)/2;
const p=validateProject(halloweenNightFlight(art,{name:'Santa · synthetic Ho ho ho.wav',data:'data:audio/wav;base64,'+bytes.toString('base64'),duration:samples/rate},refs));
p.thumbnail={name:'halloween-after-dark-youtube.webp',data:'data:image/webp;base64,'+(await readFile(new URL('cover-youtube.webp',root))).toString('base64')};
p.publishing.tiktok.cover={name:'halloween-after-dark-tiktok.webp',data:'data:image/webp;base64,'+(await readFile(new URL('cover-tiktok.webp',root))).toString('base64')};
if(projectJsonBytes(p)>4*1024*1024)throw Error('Starter exceeds 4 MiB autosave budget');
await writeFile(new URL('../public/examples/halloween-night-flight.scenescript.json',import.meta.url),JSON.stringify(validateProject(p),null,2)+'\n');console.log(p.title,p.scenes.length+' scenes',p.scenes.reduce((n,s)=>n+s.duration,0)+' seconds',projectJsonBytes(p)+' bytes');
