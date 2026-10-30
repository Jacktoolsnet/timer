/** Recompose a user-supplied resource storyboard as a native portrait test project. No paid APIs. */
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {validateProject,newScene,newElement} from '../src/lib/model.ts';
import {defaultStage2D,defaultStage2DResource,defaultObject2D,defaultActor2D,defaultAction2D} from '../src/lib/stage2d.ts';
import {parseModel2D,defaultPart2D} from '../src/lib/model2d.ts';
import {defaultMusic} from '../src/lib/music.ts';
const arg=process.argv.indexOf('--source');if(arg<0)throw Error('Usage: node --experimental-strip-types scripts/generate-mila-portrait.mjs --source <original.scenescript>');
const p=validateProject(JSON.parse(await readFile(process.argv[arg+1],'utf8'))),board=p.storyboard;if(!board)throw Error('Storyboard required');
const source=structuredClone(board),setting=id=>source.settings.find(s=>s.id===id);
function subtree(model,id){const ids=new Set([id]);for(let n=0;n<32;n++)for(const part of model.parts)if(ids.has(part.parent))ids.add(part.id);return ids;}
function extracted(model,id){const ids=subtree(model,id),parts=structuredClone(model.parts.filter(p=>ids.has(p.id)));Object.assign(parts.find(p=>p.id===id),{x:0,y:0,parent:null});return parseModel2D({width:960,height:540,originX:0,originY:0,parts});}
/** Conservative bounds include Bezier controls and articulated child transforms. */
function tight(model){const m=structuredClone(model),map=new Map(m.parts.map(p=>[p.id,p])),matrix=p=>{const a=p.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),v=[c*p.scaleX,s*p.scaleX,-s*p.scaleY,c*p.scaleY,p.x,p.y];v[4]-=v[0]*p.pivotX+v[2]*p.pivotY;v[5]-=v[1]*p.pivotX+v[3]*p.pivotY;if(!p.parent)return v;const q=matrix(map.get(p.parent));return [q[0]*v[0]+q[2]*v[1],q[1]*v[0]+q[3]*v[1],q[0]*v[2]+q[2]*v[3],q[1]*v[2]+q[3]*v[3],q[0]*v[4]+q[2]*v[5]+q[4],q[1]*v[4]+q[3]*v[5]+q[5]];};
 const points=[];for(const part of m.parts){if(part.shape==='group')continue;const xy=part.shape==='path'?part.path.flatMap(c=>c.values):part.shape==='polygon'?part.points:[0,0,part.width,0,part.width,part.height,0,part.height],a=matrix(part);for(let i=0;i<xy.length;i+=2)points.push([a[0]*xy[i]+a[2]*xy[i+1]+a[4],a[1]*xy[i]+a[3]*xy[i+1]+a[5]]);}
 const x=Math.floor(Math.min(...points.map(p=>p[0])))-6,y=Math.floor(Math.min(...points.map(p=>p[1])))-6;m.width=Math.ceil(Math.max(...points.map(p=>p[0])))-x+6;m.height=Math.ceil(Math.max(...points.map(p=>p[1])))-y+6;m.originX=m.width/2;m.originY=m.height-6;
 const roots=new Set(m.parts.filter(p=>!p.parent).map(p=>p.id));for(const part of m.parts)if(roots.has(part.id)){part.x-=x;part.y-=y;}for(const clip of Object.values(m.animations))for(const track of clip.tracks)if(roots.has(track.part)&&['x','y'].includes(track.property))for(const key of track.keys)key.value-=track.property==='x'?x:y;
 return parseModel2D(m);
}
const bedroom=structuredClone(setting('bedroom').model2d),remove=new Set([...subtree(bedroom,'bed'),...subtree(bedroom,'window')]);
const bed=tight(extracted(bedroom,'bed')),window=tight(extracted(bedroom,'window'));
bedroom.parts=bedroom.parts.filter(part=>!remove.has(part.id));bedroom.animations={};bedroom.width=540;bedroom.height=960;
for(const part of bedroom.parts.filter(p=>!p.parent)){if(part.id==='rug'){part.x=45;part.y=825;part.scaleX=1.25;part.scaleY=1.65;}else{part.x*=540/960;part.y*=960/540;part.scaleX*=540/960;part.scaleY*=960/540;}}
bedroom.parts.unshift({...defaultPart2D('portrait-wall-base'),width:540,height:960,fill:'#151b2b'});
const exterior=structuredClone(setting('window_exterior').model2d),removed=new Set([...subtree(exterior,'house'),...subtree(exterior,'lantern')]);exterior.parts=exterior.parts.filter(p=>!removed.has(p.id));exterior.animations={};exterior.width=540;exterior.height=960;
for(const part of exterior.parts.filter(p=>!p.parent)){part.x*=540/960;part.y*=960/540;part.scaleX*=540/960;part.scaleY*=960/540;}
exterior.parts.unshift({...defaultPart2D('portrait-sky-base'),width:540,height:960,fill:'#192238'});
p.format=board.format='portrait';p.title=board.title;p.objects2d={};p.stages2d={};p.assets={};p.thumbnail=null;p.music={...defaultMusic('calm'),seed:43,tempo:64,volume:.12};
for(const subject of board.characters){subject.model2d=subject.id==='bed'?bed:subject.id==='window'?window:tight(subject.model2d);subject.status='draft';subject.model2dDesign=structuredClone(subject.design);p.objects2d[subject.id]={...defaultObject2D('custom'),name:subject.name,model:subject.model2d};}
for(const subject of board.settings){subject.model2d=subject.id==='bedroom'?parseModel2D(bedroom):parseModel2D(exterior);subject.status='draft';subject.design.details='Native 540×960-Hochformatkulisse. Bett, Fenster und Laterne sind getrennte Objektressourcen. Perspektive, Palette und Beleuchtung anhand der eigenen Skizze prüfen.';subject.model2dDesign=structuredClone(subject.design);p.stages2d[subject.id]={...defaultStage2DResource('custom'),name:subject.name,skyColor:'#192238',groundColor:'#252338',model:subject.model2d};}
board.approved=false;board.comments.push({id:'portrait-example-review',text:'Technikbeispiel: Hochformat und Objekttrennung angepasst. Raumgefühl, Beleuchtung, Kontakte und Schatten benötigen noch eine gestalterische Abnahme; die ursprünglichen Skizzen bleiben als Referenzen erhalten.',resolved:false,reply:''});
p.scenes=board.shots.map((shot,i)=>{const scene=newScene(shot.id);scene.name=shot.title;scene.duration=shot.duration;scene.background='#192238';scene.transition=i?'crossfade':'none';scene.transitionDuration=.3;scene.stage2d=defaultStage2D(i===5?'window_exterior':'bedroom');
 const add=(id,x,y,height,clip='')=>{const a=defaultActor2D(id,'actor-'+id),m=p.objects2d[id].model;a.name=p.objects2d[id].name;a.x=x;a.y=y;a.scale=Math.max(.1,Math.min(4,height/m.height));if(clip&&m.animations[clip])a.actions=[{...defaultAction2D('play'),clip,duration:Math.min(scene.duration,m.animations[clip].duration)}];scene.stage2d.actors.push(a);return a;};
 if(i===5){add('window',360,640,405);add('pumpkin_lantern',420,735,155,'idle');add('cat_nox',230,745,215,'meow');}
 else{add('window',410,560,385,'idle');add('child_mila',205,745,315,i===1?'startle':i===0?'sleepy':i===3||i===6?'comfort':'curious');if(i===1)add('monster_momo',335,866,145,'crouch');else if(i===0){const m=add('monster_momo',335,866,145,'crouch');m.opacity=.7;}add('ghost_plush',368,855,65);add('bed',225,855,310);add('blanket',255,790,210,i===3?'lower':'idle');if(i>=2)add('monster_momo',438,895,230,i>=3?'smile':'look');
  if(i<2)scene.stage2d.camera=[{at:0,x:20,y:-40,zoom:1.3}];
  if(i===1){const flash=newElement('shape','lightning');Object.assign(flash,{x:0,y:0,width:100,height:100,fillColor:'#d8ddff',opacity:.3,at:.1,until:.35,animation:'fade',animationDuration:.06,exitAnimation:'fade',exitDuration:.15,borderWidth:0});scene.elements.push(flash);}
  if(i===4){const shadow=newElement('shape','cat-shadow');Object.assign(shadow,{shapeType:'ellipse',x:15,y:16,width:55,height:34,fillColor:'#111525',opacity:.55,borderWidth:0,animation:'fade',animationDuration:1});scene.elements.push(shadow);}
 }
 if(i===6){const text=newElement('text','halloween-greeting');Object.assign(text,{text:'Even monsters\nneed a little comfort.',font:'Georgia',fontSize:70,x:9,y:8,width:82,height:18,color:'#fff0cc',animation:'fade',at:1});scene.elements.push(text);}
 shot.status='draft';return scene;
});
p.description='Mila entdeckt, dass auch das Monster unter ihrem Bett Angst hat. Ein natives 9:16-Technikbeispiel mit getrennten 2D-Ressourcen. Gestaltung und Tonaufträge sind noch zu prüfen.';p.firstComment='Was hilft Dir, wenn es draußen gewittert?';p.hashtags='#2DAnimation #Halloween #Kurzfilm';
// Optimise copies only; the user's original file and full-resolution originals stay untouched.
const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();for(const asset of Object.values(board.images)){asset.data=await page.evaluate(async data=>{const image=new Image();image.src=data;await image.decode();const scale=Math.min(1,960/Math.max(image.naturalWidth,image.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(image.naturalWidth*scale);c.height=Math.round(image.naturalHeight*scale);c.getContext('2d').drawImage(image,0,0,c.width,c.height);return c.toDataURL('image/webp',.86);},asset.data);asset.name=asset.name.replace(/\.[^.]+$/,'.webp');}}finally{await browser.close();}
const result=validateProject(p);await writeFile(new URL('../public/examples/mila-halloween.scenescript.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log('Mila portrait example:',result.scenes.length,'scenes;',JSON.stringify(result).length,'bytes');
