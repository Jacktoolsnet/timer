/** Offline production authoring. No AI services, external assets or executable JSON. */
import {readFile,writeFile,rename} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {validateProject} from '../src/lib/model.ts';
import {canApproveStoryboard} from '../src/lib/storyboard.ts';
import {defaultMusic,presetInstrument} from '../src/lib/music.ts';
const root=new URL('../public/examples/space-adventure-storyboard/',import.meta.url);
const input=await readFile(new URL('spaceadventure_scenescript.json',root),'utf8');
const source=validateProject(JSON.parse(input)),board=source.storyboard;
assert.ok(board?.approved&&canApproveStoryboard(board),'An approved storyboard with resolved comments is required.');
const V=(x=0,y=0,z=0)=>({x,y,z}),clamp=n=>Math.max(0,Math.min(1,n)),mix=(a,b,t)=>a+(b-a)*t;
const parts=[],curves=new Map();
const part=(id,shape,position,size,color,extra={})=>({id,shape,position,size,color,roughness:.48,metalness:.25,...extra});
const mesh=(id,shape,p,s,c,e={})=>{const value=part(id,shape,p,s,c,e);parts.push(value);return value;};
function joint(p,id,motion,axis,min,max,value,curve){(p.joints??=[]).push({id,motion,axis,min,max,value});if(curve)curves.set(id,curve);}
function scale(p,id,curve,max=3,axes=['x']){for(const axis of axes)joint(p,id+axis,'scale',axis,0,max,curve(0),curve);}
const event=(t,at,rise=.12,hold=.1,fall=.5)=>t<at?0:t<at+rise?(t-at)/rise:t<at+rise+hold?1:1-clamp((t-at-rise-hold)/fall);
function keyCurve(keys){return t=>{if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return mix(keys[i-1][1],keys[i][1],(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));return keys.at(-1)[1];};}
const heroZ=keyCurve([[0,-12],[3,-7],[6,-5],[10,4],[14,10],[18,17],[22,22],[26,27],[28,37],[30,44]]);
const heroX=t=>t<3?mix(0,-.7,t/3):.7*Math.sin((t-3)*.48);
// Sparse layered stars: bounded instanced geometry rather than thousands of separate parts.
let seed=176;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const [i,color]of ['#9cc7ed','#d7d4fa','#fff2d2'].entries())mesh('stars'+i,'sphere',V(),V(.065+i*.015,.065+i*.015,.065+i*.015),color,{metalness:0,roughness:1,instances:Array.from({length:180},()=>V((random()-.5)*98,(random()-.5)*90,random()*98-49))});
// Soft, translucent dust layers and a distant cropped moon provide parallax without a floor.

mesh('moon','sphere',V(-30,25,49),V(12,12,12),'#55728d',{roughness:.98,metalness:0});
mesh('moonAtmosphere','sphere',V(-30,25,49),V(12.2,12.2,12.2),'#7aadeb',{opacity:.08,metalness:0});
for(let i=0;i<25;i++){const side=i%2?-1:1;mesh('rock'+i,'sphere',V(side*(8+random()*15),(random()-.5)*22,random()*65-18),V(.3+random(),.3+random(),.5+random()),i%2?'#293245':'#424351',{rotation:V(random()*150,random()*180,0),roughness:1,metalness:.05});}
// Original seed-hull fighter, +Z forward. Smooth primitives, copper seams, offset dorsal fin.
const hull=[];const h=(...a)=>{const p=part(...a);hull.push(p);return p;};
h('hull','sphere',V(0,0,0),V(2.7,.92,5.1),'#163d50',{finish:'polished',metalness:.65,roughness:.32});
h('nose','sphere',V(0,-.06,1.7),V(1.65,.6,2),'#28556a',{finish:'polished',metalness:.55});
h('keel','sphere',V(0,-.3,-.3),V(2.2,.4,3.9),'#0b2133',{metalness:.7});
h('canopyRim','sphere',V(0,.39,.8),V(1.22,.63,2.1),'#b07a53',{finish:'polished',metalness:.75});
h('canopy','sphere',V(0,.48,.79),V(1.06,.58,1.91),'#081a2c',{finish:'polished',roughness:.12,metalness:.55});
h('canopyGlint','sphere',V(-.27,.7,.9),V(.08,.04,1.05),'#8fd7e6',{opacity:.6});
h('dorsal','extrusion',V(.32,.8,-1.15),V(1.55,1.1,.12),'#275267',{rotation:V(0,90,0),extrusion:{contour:[{x:0,y:0},{x:1,y:0},{x:.25,y:1},{x:0,y:.9}],bevel:.025,sideColor:'#a27150'},metalness:.55});
for(const s of [-1,1]){
 h('seam'+s,'sphere',V(s*.96,.22,-.28),V(.065,.12,3.5),'#bb825b',{metalness:.85});
 h('vent'+s,'sphere',V(s*.88,-.04,-1.8),V(.72,.4,.28),'#07121d');
 h('engine'+s,'sphere',V(s*.88,-.04,-1.96),V(.58,.25,.1),'#8cffee',{metalness:0});
 h('trail'+s,'cone',V(s*.88,-.04,-2.7),V(.36,1.5,.25),'#3bdccd',{rotation:V(-90,0,0),opacity:.4,metalness:0});
 h('lamp'+s,'sphere',V(s*.5,-.06,2.28),V(.26,.12,.12),'#ffe1ad',{metalness:0});
 for(let i=0;i<5;i++)h('panel'+s+'_'+i,'box',V(s*(.85-i*.06),.33,-1.25+i*.55),V(.4,.025,.028),'#7ca0aa',{rotation:V(0,s*12,0),metalness:.7});
}
h('launchHatch','box',V(0,-.48,.2),V(.72,.08,.85),'#ba865a',{joints:[{id:'hatch','axis':'x',min:0,max:80}]});
const fighter={model:{parts:hull,animations:{launch:{duration:.7,tracks:[{joint:'hatch',keys:[{at:0,value:0},{at:.18,value:75},{at:.48,value:75},{at:.7,value:0}]}]}}},name:'Needlefin — original mission fighter',height:3};
// Six individually tracked, unmanned relays. Damage is absolute-time and seek-safe.
const targets=[V(-1.65,.75,2),V(1.5,1,7),V(-1.3,-.4,14),V(.2,1.15,23),V(-1.7,0,29),V(.5,1,35)];
const hits=[7.3,9,12.2,16.4,19.35,24.25];
function relay(i){const p=targets[i],at=hits[i],prefix='relay'+(i+1),alive=t=>t<at?1:0;
 const root=mesh(prefix,'group',p,V(1,1,1),'#111111');
 const core=mesh(prefix+'core','sphere',V(),V(.8,.8,.65),'#ffc46b',{parent:root.id,metalness:.3});scale(core,prefix+'core',alive);
 const shell=mesh(prefix+'rim','sphere',V(),V(1.15,1.15,.55),'#5e6975',{parent:root.id,opacity:.55,metalness:.8});scale(shell,prefix+'rim',alive);
 for(let n=0;n<3;n++){
  const a=n*Math.PI*2/3+.25,dir=V(Math.cos(a),Math.sin(a),.25),plate=mesh(prefix+'plate'+n,'sphere',V(dir.x*.9,dir.y*.9,0),V(.72,1.35,.45),'#344b5d',{parent:root.id,rotation:V(0,15,n*120-75),finish:'polished',metalness:.75});
  scale(plate,prefix+'plate'+n,t=>t<at?1:1-clamp((t-at)/.85));
  for(const axis of ['x','y','z'])joint(plate,prefix+'drift'+n+axis,'translation',axis,-5,5,0,t=>dir[axis]*3*clamp((t-at)/.85));
 }
 const flash=mesh(prefix+'flash','sphere',V(),V(2.7,2.7,2.7),'#ffe5b7',{parent:root.id,opacity:.75,metalness:0});scale(flash,prefix+'flash',t=>event(t,at,.06,.03,.38),1.2,['x','y','z']);
 const fire=mesh(prefix+'fire','sphere',V(),V(4.1,4.1,4.1),'#ed8b42',{parent:root.id,opacity:.16,metalness:0});scale(fire,prefix+'fire',t=>event(t,at,.16,.05,.65),1.2,['x','y','z']);
}
for(let i=0;i<6;i++)relay(i);
// Elliptical spatial tears, with open centres and layered translucent glow.
const circle=(r,phase=0)=>Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return {x:.5+Math.cos(a)*r*(1+.018*Math.sin(i*3+phase)),y:.5+Math.sin(a)*r*(1+.018*Math.sin(i*3+phase))};});
function portal(id,p,size,color,curve){for(let n=0;n<2;n++){
 const ring=mesh(id+n,'extrusion',V(p.x,p.y,p.z+n*.05),V(size.x*(1+n*.06),size.y*(1+n*.06),.1),color,{extrusion:{contour:circle(.49,n),holes:[circle(.455,n).reverse()],bevel:.006,sideColor:color},opacity:n===0?.95:.15,metalness:0,roughness:.2});
 scale(ring,id+n,curve,1.4);joint(ring,id+n+'y','scale','y',0,1.4,curve(0),curve);joint(ring,id+n+'spin','rotation','z',-3600,3600,0,t=>curve(t)>0?t*10*(n%2?-1:1):0);
}}
portal('arrival',V(0,0,-13),V(8,12,1),'#73efe2',keyCurve([[0,.08],[.55,1],[1.7,1],[2.75,0],[30,0]]));
portal('fleetAperture',V(0,4,47),V(21,27,1),'#cc77eb',keyCurve([[0,0],[19.8,0],[20.55,1],[24.4,1],[25.1,0],[30,0]]));
portal('escapeAperture',V(0,1,36),V(7,10,1),'#7cffee',keyCurve([[0,0],[26,0],[26.65,1],[27.8,1],[28.35,0],[30,0]]));
// Command vessel and exactly four escorts: smooth overlapping mineral-like armour masses.
for(let i=0;i<5;i++){
 const escort=i>0,s=escort?.37:1,location=escort?V((i%2?-1:1)*(i<3?7:9),i<3?7:0,45+(i<3?0:3)):V(0,4,46);
 const root=mesh('fleet'+i,'group',location,V(1,1,1),'#111111');
 if(i===0)joint(root,'fleetAdvance'+i,'translation','z',-10,0,0,t=>-6*clamp((t-20.3-i*.12)/3));
 for(let n=0;n<3;n++){
  const armor=mesh('fleet'+i+'armor'+n,'sphere',V((n-1)*1.5*s,(n%2)*.7*s,0),V((7-n*.6)*s,(2.2-n*.2)*s,(6+n)*s),n===1?'#303747':'#242a38',{parent:root.id,rotation:V(0,(n-1)*12,0),finish:'polished',metalness:.65,roughness:.38});
  scale(armor,armor.id,t=>clamp((t-20.25-i*.16)/.35),1);
  const light=mesh('fleet'+i+'light'+n,'sphere',V((n-1)*1.65*s,.05*s,-2.9*s),V(.22*s,.3*s,4.5*s),'#ff5868',{parent:root.id,rotation:V(0,(n-1)*12,0),metalness:0});
  scale(light,light.id,t=>clamp((t-20.25-i*.16)/.35)*(t<22?.55:1),1);
 }
}
// Torpedoes and laser projectiles follow timed 3D paths; they do not float before launch.
const weapons=[];
function weapon(id,at,hit,target,torpedo=false){
 const start=V(heroX(at),torpedo?-.45:0,heroZ(at)+2.5),end=targets[target],duration=hit-at;
 const root=mesh(id,'group',V(),V(1,1,1),'#111111');
 for(const axis of ['x','y','z'])joint(root,id+'move'+axis,'translation',axis,-50,50,start[axis],t=>mix(start[axis],end[axis],clamp((t-at)/duration))+(axis==='x'&&torpedo?Math.sin(clamp((t-at)/duration)*Math.PI)*1.4:0));
 const body=mesh(id+'body',torpedo?'sphere':'cylinder',V(),torpedo?V(.26,.26,.8):V(.09,1.2,.09),torpedo?'#ece2d2':'#92fff0',{parent:id,rotation:V(torpedo?0:90,0,0),metalness:torpedo?.7:0});
 scale(body,id+'visible',t=>t>=at&&t<hit?1:0,1);
 if(torpedo){const trail=mesh(id+'trail','cone',V(0,0,-.8),V(.16,1.1,.16),'#ffdc9b',{parent:id,rotation:V(-90,0,0),opacity:.6});scale(trail,id+'trail',t=>t>=at&&t<hit?1:0,1);}
 weapons.push({id,at,hit,target:target+1,type:torpedo?'torpedo':'laser'});
}
weapon('laser1',6.95,7.3,0);weapon('laser2',8.6,9,1);weapon('torpedo3',10.7,12.2,2,true);weapon('laser4',16,16.4,3);weapon('torpedo5',18.4,19.35,4,true);weapon('laser6',23.8,24.25,5);
// Delayed enemy volley crosses the already empty escape point, after the aperture is closed.
for(let i=0;i<3;i++){
 const beam=mesh('missedVolley'+i,'cylinder',V(i*.6-.6,1,0),V(.12,2.8,.12),'#ff6370',{rotation:V(90,0,0),metalness:0});
 joint(beam,'volleyTravel'+i,'translation','z',-20,50,40,t=>mix(40,-15,clamp((t-28.55-i*.07)/.65)));
 scale(beam,'volleyVisible'+i,t=>t>=28.55+i*.07&&t<29.25+i*.07?1:0,1);
}
// Cockpit geometry and hands; HUD typography is a crisp, editable 2D layer over the 3D view.
const cockpitParts=[
 part('console','sphere',V(0,-.35,1.3),V(3.8,1.5,2),'#102d3b',{finish:'polished'}),
 part('dashboardRim','box',V(0,.25,1.35),V(2.35,.9,.15),'#b3825c',{finish:'polished',metalness:.8}),
 part('dashboard','box',V(0,.26,1.25),V(2.2,.77,.12),'#09212c',{metalness:.15}),
 ...[-1,1].flatMap(s=>[
  part('strut'+s,'cylinder',V(s*.78,1.2,2.7),V(.055,4,.055),'#b48462',{rotation:V(0,0,s*12),metalness:.8}),
  part('sideConsole'+s,'sphere',V(s*1.3,-.2,.5),V(.6,.55,1.6),'#254452',{finish:'polished'}),
  part('glove'+s,'sphere',V(s*.7,.16,2.1),V(.38,.28,.6),'#182433',{roughness:.85}),
  part('control'+s,'cylinder',V(s*1,.17,.8),V(.15,.48,.15),'#725c4c',{rotation:V(18,0,s*10),metalness:.7})])
];
const characters={needlefin:fighter,cockpit:{name:'Needlefin cockpit — anonymous pilot POV',height:3,model:{parts:cockpitParts,animations:{}}}};
const arrivalHull=structuredClone(hull);
for(const p of arrivalHull)p.joints=[...(p.joints??[]),{id:'arrive'+p.id,motion:'scale',axis:'x',min:0,max:1,value:0}];
characters.arriving={...fighter,name:'Needlefin — arrival through the spatial tear',model:{parts:arrivalHull,animations:{arrive:{duration:3,tracks:arrivalHull.map(p=>({joint:'arrive'+p.id,keys:[{at:0,value:0},{at:.449,value:0},{at:.45,value:1},{at:3,value:1}]}))}}}};

// Native HUD with dark display, exact English mission and six lights. No baked-in sketch images.
function element(id,type,values){return {id,type,animation:'none',...values};}
function hud(destroyed,mission=false,complete=false){
 const e=[element('screen','shape',{x:12,y:61,width:76,height:21,fillColor:'#071b27',borderColor:'#7bbaa9',borderWidth:2,radius:18})];
 if(mission)e.push(element('mission','text',{text:'DESTROY ALL\nSIX TARGETS\nIN THIS SECTOR',x:16,y:62,width:68,height:14,fontSize:39,bold:true,color:'#a2fff0'}));
 if(complete)e.push(element('missionComplete','text',{text:'✓',x:32,y:61,width:36,height:14,fontSize:100,bold:true,color:'#80edaf'}));
 for(let i=0;i<6;i++)e.push(element('indicator'+i,'shape',{x:23+i*8,y:77,width:4.6,height:2.6,shapeType:'ellipse',fillColor:i<destroyed?'#172f3a':'#ffbd5d',borderColor:i<destroyed?'#3a5662':'#ffe4a3',borderWidth:2}));
 if(!mission&&!complete)e.push(element('reticle','text',{text:'⌖',x:44,y:40,width:12,height:8,fontSize:66,color:'#8be9d8'}));return e;
}
const specs=[
 ['arrival-hook',0,3,'arrival'],['cockpit-mission',3,3,'cockpit'],['laser-double-strike',6,4,'rear'],['torpedo-third-target',10,4,'torpedo'],['cockpit-fourth-target',14,4,'cockpit'],['fifth-target-fleet-arrival',18,4,'fleet'],['last-target-under-threat',22,3,'last'],['mission-confirmed',25,1,'cockpit'],['escape-payoff',26,4,'escape']
];
const paths={},animations={},scenes=[];
function camKey(at,p,target,roll=0){return {at,position:p,target,roll};}
for(const [id,start,duration,view]of specs){
 // Slice continuous global animation curves into deterministic scene-local keys, including exact event times.
 // Keep all hard discontinuities explicit; compact collinear keys to fit native limits.
 const keyTimes=[0,duration];for(let t=.1;t<duration;t+=.1)keyTimes.push(+t.toFixed(5));
 for(const t of [...hits,...hits.map(t=>t+.06),...weapons.flatMap(w=>[w.at,w.hit]),28.55,28.62,28.69,29.25,29.32,29.39])for(const delta of [-.001,0])if(t+delta>start&&t+delta<start+duration)keyTimes.push(+(t+delta-start).toFixed(5));
 const kt=[...new Set(keyTimes)].sort((a,b)=>a-b);
 const compact=keys=>{const out=[];for(const k of keys){while(out.length>=2){const a=out.at(-2),b=out.at(-1),linear=a.value+(k.value-a.value)*(b.at-a.at)/(k.at-a.at);if(Math.abs(b.value-linear)>1e-8)break;out.pop();}out.push(k);}return out;};
 const tracks=[...curves].map(([joint,f])=>({joint,keys:compact(kt.map(at=>({at,value:f(start+at)})))})).filter(track=>track.keys.some(k=>Math.abs(k.value-track.keys[0].value)>1e-9));
 if(!tracks.length){const [joint,f]=curves.entries().next().value;tracks.push({joint,keys:[{at:0,value:f(start)},{at:duration,value:f(start)}]});}
 assert.ok(tracks.length<=64,id+': '+tracks.length+' animated tracks');animations[id]={duration,tracks};
 const end=start+duration,points=Array.from({length:6},(_,i)=>{const t=start+duration*i/5;return V(heroX(t),.12*Math.sin(t*.5),heroZ(t));});
 paths[id]={closed:false,interpolation:'smooth',points};
 const cockpit=view==='cockpit',actor={id:'hero',character:cockpit?'cockpit':'needlefin',path:{path:id,duration,orient:!cockpit},motions:[]};
 for(const w of weapons.filter(w=>w.type==='torpedo'&&w.at>=start&&w.at+.7<=end))if(!cockpit)actor.motions.push({animation:'launch',at:w.at-start,duration:.7,blend:0});
 if(view==='arrival'){actor.character='arriving';actor.motions=[{animation:'arrive',duration,blend:0}];}
 const actors=(view==='escape'?[]:[actor]);
 // Escape needs hull geometry to disappear behind the closed aperture, not sit at the path endpoint.
 if(view==='escape'){
  const escapeHull=structuredClone(hull);
  for(const p of escapeHull)if(p.shape!=='group')p.joints=[...(p.joints??[]),...['x'].map(axis=>({id:'exit'+p.id+axis,motion:'scale',axis,min:0,max:1,value:1}))];
  const tracks=escapeHull.flatMap(p=>(p.joints??[]).filter(j=>j.motion==='scale').map(j=>({joint:j.id,keys:[{at:0,value:1},{at:2.049,value:1},{at:2.05,value:0},{at:4,value:0}]})));
  characters.escaping={...fighter,name:'Needlefin — exit aperture concealment',model:{parts:escapeHull,animations:{exit:{duration:4,tracks}}}};
  actors.push({...actor,character:'escaping',motions:[{animation:'exit',duration:4,blend:0}]});
 }
 let camera;
 if(cockpit)camera={fov:66,follow:{actor:'hero',mode:'onboard',offset:V(0,1,.05),target:V(0,1,9)}};
 else if(view==='arrival')camera={fov:50,keys:[camKey(0,V(8,4,2),V(0,0,-11)),camKey(duration,V(7,3,5),V(heroX(end),0,heroZ(end)))]};
 else if(view==='rear')camera={fov:59,keys:[camKey(0,V(-4,3,heroZ(start)-12),V(0,.5,0)),camKey(duration,V(-4,3,heroZ(end)-12),V(0,.5,5.5))]};
 else if(view==='torpedo')camera={fov:58,keys:[camKey(0,V(5,-2,heroZ(start)-2),V(0,-.3,heroZ(start)+2)),camKey(1.6,V(5,2,7),V(-1,-.4,14)),camKey(duration,V(5,3,11),V(0,0,16))]};
 else if(view==='fleet')camera={fov:66,keys:[camKey(0,V(6,6,1),V(-1,1,24)),camKey(2,V(6,6,5),V(0,3,29)),camKey(duration,V(6,7,9),V(0,3,32))]};
 else if(view==='last')camera={fov:62,keys:[camKey(0,V(6,5,6),V(0,2,32)),camKey(duration,V(6,5,10),V(0,2,34))]};
 else camera={fov:62,keys:[camKey(0,V(-7,6,8),V(0,2,33)),camKey(1.9,V(-7,6,12),V(0,2,35)),camKey(4,V(-7,6,12),V(0,3,38))]};
 const shot=board.shots.find(s=>s.id===id),name=shot?.title??'Mission confirmed — cockpit insert';
 const elements=cockpit?hud(hits.filter(t=>t<=start).length,id==='cockpit-mission',id==='mission-confirmed'):[];
 if(id==='cockpit-fourth-target'){
  // Switch the fourth lamp exactly when the fourth relay is destroyed.
  elements.find(e=>e.id==='indicator3').until=hits[3]-start;
  elements.push(element('indicator3dark','shape',{x:47,y:77,width:4.6,height:2.6,shapeType:'ellipse',fillColor:'#172f3a',borderColor:'#3a5662',borderWidth:2,at:hits[3]-start}));
 }
 for(const e of elements)e.id=id+'-'+e.id;
 scenes.push({id,name,duration,transition:'none',background:'#050b19',backgroundAsset:'nebula',elements,stage3d:{stage:'sector',camera,actors,stageJoints:Object.fromEntries([...curves].map(([id,f])=>[id,f(start)])),stageMotions:[{animation:id,duration,blend:0}]}});
}
const stage={name:'Silent relay sector — continuous 3D space',transparentBackground:true,model:{parts,animations},paths};
// Original electronic underscore, intentionally no narration. Shift to threat at the fleet reveal.
const bass={...presetInstrument('bass'),volume:.22,release:.12},pluck={...presetInstrument('kalimba','pulse'),volume:.15,release:.15,reverb:.08},noise={...presetInstrument('bass','tick'),wave:'noise',volume:.06,attack:.002,decay:.035,sustain:0,release:.03,filter:'highpass',cutoff:1500};
const notes=[];for(let i=0;i<64;i++){const at=i*.46875;if(at>19.7&&at<21.5)continue;const base=at<20?38:35;notes.push({instrument:'bass',at,duration:.24,pitch:base+[0,0,7,3][i%4],velocity:.6},{instrument:'tick',at,duration:.05,pitch:48,velocity:.5});if(i%2===0)notes.push({instrument:'pulse',at,duration:.15,pitch:base+24+[0,7,10,7][i/2%4],velocity:.45});}
notes.push({instrument:'bass',at:20.2,duration:1.4,pitch:29,velocity:.8},{instrument:'pulse',at:25.2,duration:.2,pitch:81,velocity:.6},{instrument:'bass',at:29.2,duration:.5,pitch:38,velocity:.7});notes.sort((a,b)=>a.at-b.at);
// Procedural PCM effects, authored here and embedded. No external sound downloads/licences.
function effectsWav(){const rate=24000,count=rate*30,bytes=new Uint8Array(44+count*2),dv=new DataView(bytes.buffer),word=(at,s)=>[...s].forEach((c,i)=>bytes[at+i]=c.charCodeAt(0));
 word(0,'RIFF');dv.setUint32(4,bytes.length-8,true);word(8,'WAVE');word(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);dv.setUint32(24,rate,true);dv.setUint32(28,rate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);word(36,'data');dv.setUint32(40,count*2,true);
 let rnd=9,low=0;const tones=[...weapons.map(w=>({at:w.at,length:w.type==='laser'?.18:.8,type:w.type})),...hits.map(at=>({at,length:.75,type:'impact'})),{at:0,length:1.3,type:'portal'},{at:2.15,length:.6,type:'portal'},{at:20,length:1.8,type:'portal'},{at:26,length:1.6,type:'portal'},{at:28.1,length:.5,type:'portal'},{at:25.1,length:.4,type:'confirm'},{at:3.1,length:.2,type:'confirm'},{at:28.55,length:.7,type:'laser'}];
 for(let i=0;i<count;i++){const t=i/rate;rnd=(Math.imul(rnd,1664525)+1013904223)>>>0;const n=rnd/4294967296*2-1;low+=.04*(n-low);let s=.018*Math.sin(t*2*Math.PI*47)+.015*low;
  for(const e of tones){const u=(t-e.at)/e.length;if(u<0||u>=1)continue;const env=Math.sin(Math.PI*u)*Math.exp(-2*u),phase=2*Math.PI*(t-e.at);
   if(e.type==='laser')s+=.27*env*Math.sin(phase*(1500-900*u));
   else if(e.type==='impact')s+=.42*env*(.6*low+Math.sin(phase*(70-35*u))*.6+n*.2);
   else if(e.type==='torpedo')s+=.2*env*(Math.sin(phase*(180+300*u))*.5+low);
   else if(e.type==='confirm')s+=.15*env*Math.sin(phase*(u<.5?880:1174));
   else s+=.3*env*(low*1.8+Math.sin(phase*(42+80*u))*.5+n*.13);
  }
  const fade=Math.min(1,t/.02,(30-t)/.3);dv.setInt16(44+i*2,Math.round(Math.tanh(s*1.3)*fade*30000),true);
 }return bytes;}
// Code-native vector starfield; smooth gradients avoid baked storyboard art in the animation.
const stars=Array.from({length:850},()=>{const x=(random()*1080).toFixed(1),y=(random()*1920).toFixed(1),r=(.3+random()*1.1).toFixed(2),a=(.15+random()*.6).toFixed(2);return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#ccddf6" opacity="'+a+'"/>';}).join('');
const sky='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><radialGradient id="cloud"><stop offset="0" stop-color="#33325e" stop-opacity=".7"/><stop offset="1" stop-color="#050b19" stop-opacity="0"/></radialGradient><radialGradient id="blue"><stop offset="0" stop-color="#16475b" stop-opacity=".45"/><stop offset="1" stop-color="#050b19" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="#050b19"/><ellipse cx="220" cy="850" rx="600" ry="1100" transform="rotate(28 220 850)" fill="url(#cloud)"/><ellipse cx="930" cy="1450" rx="700" ry="500" fill="url(#blue)"/>'+stars+'</svg>';
const assets={nebula:{name:'Silent relay sector — vector nebula.svg',data:'data:image/svg+xml;base64,'+Buffer.from(sky).toString('base64')}};
const cover=board.images['sketch-arrival-hook'];
const project=validateProject({...source,title:'Six Targets. One Escape. | Space Adventure',description:'One pilot. Six targets. Then an entire fleet arrives. Can Needlefin finish the mission and escape in time?\n\nAn original 30-second sci-fi short with stylized 3D spacecraft, cockpit views and an electronic soundtrack. No franchise ships. No dialogue — just action.\n\n#SciFi #SpaceAdventure #3DAnimation #Shorts',firstComment:'Finish the mission or escape immediately — what would you do?',hashtags:'#SciFi #SpaceAdventure #3DAnimation #Shorts',format:'portrait',storyboard:board,assets,characters,stages:{sector:stage},groups3d:{},videos:{},backgroundVideo:null,backgroundSimulation:null,audios:{spacefx:{name:'Needlefin — original synthesized space effects.wav',duration:30,data:'data:audio/wav;base64,'+Buffer.from(effectsWav()).toString('base64')}},narration:{asset:'spacefx',volume:.8,fadeIn:.01,fadeOut:.25,instructions:'Original synthesized spatial tears, engines, laser pulses, torpedoes, impacts and UI confirmation. No spoken narration.'},thumbnail:{name:'Space-Adventure-Needlefin-Cover.jpg',data:cover.data},music:{...defaultMusic('focus'),enabled:true,mode:'score',tempo:128,volume:.3,fadeIn:.1,fadeOut:.8,instruments:[bass,pluck,noise],notes},scenes});
assert.deepEqual(project.storyboard,source.storyboard);
assert.equal(project.scenes.reduce((n,s)=>n+s.duration,0),30);
assert.equal(project.scenes.length,9);assert.equal(weapons.length,6);
assert.equal(await readFile(new URL('spaceadventure_scenescript.json',root),'utf8'),input);
const dest=new URL('space-adventure.scenescript.json',root),tmp=new URL(dest.href+'.tmp');await writeFile(tmp,JSON.stringify(project,null,2)+'\n');await rename(tmp,dest);
console.log('Created space-adventure.scenescript.json: 30 s, 9 scenes (8 storyboard shots + cockpit insert), six targets, 3D resources, original audio. Approved storyboard and source file preserved.');
