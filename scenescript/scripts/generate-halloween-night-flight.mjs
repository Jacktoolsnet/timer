/** Deterministic offline packager; no model calls or credentials. */
import {readFile,writeFile} from 'node:fs/promises';
import {halloweenNightFlight} from '../src/lib/halloween-night-flight.ts';
import {validateProject,projectJsonBytes} from '../src/lib/model.ts';
const root=new URL('../public/examples/halloween-night-flight/',import.meta.url),dimensions=JSON.parse(await readFile(new URL('dimensions.json',root))),art={},refs={};
for(const[id,size]of Object.entries(dimensions)){if(id==='santa')continue;const name=id+'.webp',data='data:image/webp;base64,'+(await readFile(new URL(name,root))).toString('base64');art[id]={name,data,...size};if(!['reindeer-body','santa-wave-arm','reindeer-leg-upper','reindeer-leg-lower'].includes(id))refs[id==='santa-sleigh'?'reference-santa':'reference-'+id]={name,data};}
for(const id of ['bat','spider'])refs['reference-'+id]={name:id+'.webp',data:'data:image/webp;base64,'+(await readFile(new URL('reference-'+id+'.webp',root))).toString('base64')};
refs['reference-santa']={name:'reference-santa-rig.webp',data:'data:image/webp;base64,'+(await readFile(new URL('reference-santa-rig.webp',root))).toString('base64')};
const bytes=await readFile(new URL('santa-ho-ho-ho.wav',root)),rate=bytes.readUInt32LE(24),samples=(bytes.length-44)/2;
const duration=samples/rate,mouth=[];let peak=0;for(let i=44;i+1<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i)));for(let at=0;at<duration;at+=.04){const begin=Math.floor(at*rate),end=Math.min(samples,begin+Math.round(.04*rate));let energy=0;for(let i=begin;i<end;i++){const v=bytes.readInt16LE(44+i*2);energy+=v*v;}const rms=Math.sqrt(energy/Math.max(1,end-begin));mouth.push({at:Math.round(at*100000)/100000,value:.08+.92*Math.min(1,rms/(peak*.3))});}mouth.push({at:duration,value:.08});
const p=validateProject(halloweenNightFlight(art,{name:'Santa · synthetic Ho ho ho.wav',data:'data:audio/wav;base64,'+bytes.toString('base64'),duration},refs,mouth));
p.thumbnail={name:'halloween-after-dark-youtube.webp',data:'data:image/webp;base64,'+(await readFile(new URL('cover-youtube.webp',root))).toString('base64')};
p.publishing.tiktok.cover={name:'halloween-after-dark-tiktok.webp',data:'data:image/webp;base64,'+(await readFile(new URL('cover-tiktok.webp',root))).toString('base64')};
if(projectJsonBytes(p)>4*1024*1024)throw Error('Starter exceeds 4 MiB autosave budget');
await writeFile(new URL('../public/examples/halloween-night-flight.scenescript.json',import.meta.url),JSON.stringify(validateProject(p),null,2)+'\n');console.log(p.title,p.scenes.length+' scenes',p.scenes.reduce((n,s)=>n+s.duration,0)+' seconds',projectJsonBytes(p)+' bytes');
