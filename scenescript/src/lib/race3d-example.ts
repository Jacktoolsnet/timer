import {racePath3D,raceRoadParts3D,raceSupports3D,frameRotation3D} from './race3d-track.ts';
import {raceTowerParts3D,raceMarshal3D,raceMarshalActor3D} from './race3d-finish.ts';
import {raceTruck3D} from './race3d-truck.ts';
import {path3DExample} from './path3d-example.ts';
import {samplePath3D} from './path3d.ts';
import {defaultMusic,presetInstrument} from './music.ts';
/** Finished, data-only production. The smaller technical path demo remains unchanged. */
const original=structuredClone(path3DExample),route=racePath3D;
const base={...original,characters:{...original.characters,marshal:raceMarshal3D,red:{...original.characters.red,model:raceTruck3D()},blue:{...original.characters.blue,model:raceTruck3D(true)}}};
base.stages.track.paths.circuit=route;
const arena:any=base.stages.track;
arena.model.parts=arena.model.parts.filter((p:any)=>!/^road\d+$|^check\d+$|^finishPole$/.test(p.id));
arena.model.parts.push(...raceRoadParts3D,raceSupports3D,...raceTowerParts3D);
for(const p of arena.model.parts){
 if(/^stand(?:Step|Bench|Back)/.test(p.id)){p.position.x=-9-p.position.x;p.position.z=3-p.position.z;}
 if(/^trunk|^tree/.test(p.id)){const index=Number(p.id.split('_')[1]);p.position.x=[-29,-10,12,31][index];p.position.z=p.position.z<0?-26:41;}
 if(/^ad(?:ZOOM|BOLT|NOVA)$/.test(p.id))p.position.z=41;
}
export const raceStart3D=7,raceFinish3D=55.5,raceDuration3D=61.5;
export const raceProgress3D=(car:'red'|'blue',t:number)=>{
 const keys=car==='red'?[[0,0],[12,1],[24,2],[36,3],[48,4]]:[[0,0],[12,1.02],[24,1.98],[36,3.03],[48,3.98],[48.5,4]];
 const time=Math.max(0,t);for(let i=1;i<keys.length;i++)if(time<=keys[i][0]){const a=keys[i-1],b=keys[i];return a[1]+(b[1]-a[1])*(time-a[0])/(b[0]-a[0]);}return 4;
};
const text=(id:string,value:string,extra:object={})=>({id,type:'text',text:value,x:4,y:4,width:92,height:12,fontSize:50,bold:true,color:'#ffffff',animation:'none',...extra});
const stationary=(car:'red'|'blue')=>{const f=samplePath3D(route,0,car==='red'?-1.15:1.15);return {id:car,character:car,scale:.55,x:f.position.x,y:f.position.y,z:f.position.z,rotation:frameRotation3D(f).y,pitch:frameRotation3D(f).x,roll:frameRotation3D(f).z};};
const crowd=(at:number)=>[{id:'audience',group:'audience',x:-9,y:.4,z:1.4,rotation:180,timeOffset:at}];
const wide={fov:56,keys:[{at:0,position:{x:-46,y:34,z:-46},target:{x:0,y:2,z:8}},{at:4,position:{x:-43,y:32,z:-43},target:{x:0,y:2,z:8}}]};
const follow=(car:string)=>({fov:52,follow:{actor:car,mode:'chase',offset:{x:6,y:2.5,z:-4},target:{y:1,z:2}}});
const driver={fov:85,follow:{actor:'blue',mode:'onboard',offset:{x:-.4,y:1.35,z:.65},target:{x:-.4,y:1.35,z:6}}};
const spectator={fov:52,follow:{actor:'red',mode:'track',offset:{x:29,y:9,z:14},target:{y:1}}};
const finish={fov:55,yaw:-100,pitch:16,distance:12,targetX:-19,targetY:2.3,targetZ:-15};
const intervals=[0,6,12,18,24,30,36,42,47,48,48.5];
const cameras=[follow('red'),spectator,driver,follow('blue'),{fov:48,keys:[{at:0,position:{x:43,y:33,z:43},target:{y:1.5}},{at:6,position:{x:-42,y:32,z:42},target:{y:1.5}}]},spectator,follow('red'),driver,finish,finish];
const scenes:any[]=[
 {id:'opening',name:'Monstertruck-Duell – die Arena',duration:4,transition:'none',elements:[text('title','MONSTERTRUCK-DUELL',{y:7,height:18,fontSize:88}),text('subtitle','2 Trucks · 4 Runden · Looping & Sprung',{y:79,fontSize:42})],stage3d:{stage:'track',camera:wide,groups:crowd(0),actors:[stationary('red'),stationary('blue')]}},
 {id:'countdown',name:'Am Start: Rot gegen Blau',duration:3,transition:'none',elements:[3,2,1].map((n,i)=>text('count'+n,String(n),{at:i,until:i+1,x:35,y:25,width:30,height:45,fontSize:220})),stage3d:{stage:'track',camera:{fov:52,follow:{actor:'red',mode:'track',offset:{x:-24,y:7,z:-9},target:{y:1}}},groups:crowd(4),actors:[stationary('red'),stationary('blue')]}}
];
for(let i=0;i<intervals.length-1;i++){
 const a=intervals[i],b=intervals[i+1],duration=b-a,lap=Math.min(4,Math.floor(a/12)+1),actors=(['red','blue'] as const).map(car=>{
  const finishTime=car==='red'?48:48.5;if(a>=finishTime)return stationary(car);
  const start=raceProgress3D(car,a),end=raceProgress3D(car,b),span=Math.min(b,finishTime)-a;
  return {id:car,character:car,scale:.55,path:{path:'circuit',start:start%1,laps:end-start,duration:span,offset:car==='red'?-1.15:1.15},motions:[{animation:'drive',duration:span,loop:true,speed:2,blend:0}]};
 });
 scenes.push({id:'race'+i,name:a>=47?'Zielfoto':`Runde ${lap} – ${['Verfolgung','Zuschauerschwenk','Fahrerkamera','Duell'][i%4]}`,duration,transition:'none',elements:[text('lap'+i,`RUNDE ${lap} / 4`,{width:32,fontSize:40,align:'left'}),...(a===0?[text('go','LOS!',{x:35,y:30,width:30,height:25,fontSize:130,until:.8})]:[]),...(a>=48?[text('winner','ROT IM ZIEL! BLAU ZIEHT NACH',{y:76,fontSize:48})]:[])],stage3d:{stage:'track',camera:cameras[i],groups:crowd(raceStart3D+a),actors}});
}
scenes.push({id:'podium',name:'Rot gewinnt – beide vier Runden geschafft',duration:6,transition:'none',elements:[text('result','ROT GEWINNT!',{y:7,fontSize:92,height:18,color:'#ffe48c'}),text('times','Rot: 48,0 s  ·  Blau: 48,5 s',{y:27,fontSize:42}),text('ask','Team Rot oder Team Blau?',{y:77,fontSize:50})],stage3d:{stage:'track',camera:{fov:50,keys:[{at:0,position:{x:-28,y:10,z:-7},target:{x:-19,y:3,z:-18}},{at:6,position:{x:-26,y:9,z:-8},target:{x:-19,y:3,z:-18}}]},groups:crowd(raceFinish3D),actors:[stationary('red'),stationary('blue')]}});
arena.name='Roboblox-Rennarena mit Start-Ziel-Turm';
let origin=0;for(const scene of scenes){scene.stage3d.actors.push(raceMarshalActor3D(origin,scene.duration));origin+=scene.duration;}
const bass={...presetInstrument('bass'),volume:.3,release:.08},lead={...presetInstrument('kalimba','lead'),volume:.25,release:.12,reverb:0,echo:{delay:.2,feedback:0,mix:0}},drum={...presetInstrument('bass','drum'),wave:'noise' as const,volume:.12,attack:.001,decay:.04,sustain:0,release:.02,filter:'lowpass' as const,cutoff:700};
const beat=60/132,notes=[];for(let i=0;i<raceDuration3D/beat;i++){const at=i*beat;notes.push({instrument:'bass',at,duration:.22,pitch:[36,36,43,39][Math.floor(i/4)%4],velocity:.65},{instrument:'drum',at,duration:.05,pitch:48,velocity:i%2?.3:.65});if(i%2===0)notes.push({instrument:'lead',at,duration:.18,pitch:[60,67,72,70,65,67,74,72][i/2%8],velocity:.5});}
export const race3DExample={...base,title:"Monster Truck Race: Red vs Blue! Loop, Jump & 4 Laps",description:"Red or Blue — which monster truck will win? Two block-built trucks tackle a spiral loop, a jump and banked turns in a four-lap race.\n\nFollow the action from chase cameras, trackside views and the driver's seat, all the way to the checkered flag.\n\nAn original block-style 3D animation with music and synthesized engine and crowd sounds. Not Roblox gameplay or an official Roblox video.\n\n#MonsterTruck #TruckRace #3DAnimation",firstComment:"Team Red or Team Blue? Which stunt would you race first: the loop or the jump?",hashtags:"#MonsterTruck #TruckRace #3DAnimation",scenes,music:{...defaultMusic('uplifting'),mode:'score',tempo:132,volume:.22,fadeIn:1,fadeOut:3,instruments:[bass,lead,drum],notes}};
