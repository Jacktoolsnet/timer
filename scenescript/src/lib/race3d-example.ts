import {path3DExample} from './path3d-example.ts';
import {samplePath3D} from './path3d.ts';
import {defaultMusic,presetInstrument} from './music.ts';
/** Finished, data-only production. The smaller technical path demo remains unchanged. */
const base=structuredClone(path3DExample),route=base.stages.track.paths.circuit;
export const raceStart3D=7,raceFinish3D=55.5,raceDuration3D=61.5;
export const raceProgress3D=(car:'red'|'blue',t:number)=>{
 const keys=car==='red'?[[0,0],[12,1],[24,2],[36,3],[48,4]]:[[0,0],[12,1.02],[24,1.98],[36,3.03],[48,3.98],[48.5,4]];
 const time=Math.max(0,t);for(let i=1;i<keys.length;i++)if(time<=keys[i][0]){const a=keys[i-1],b=keys[i];return a[1]+(b[1]-a[1])*(time-a[0])/(b[0]-a[0]);}return 4;
};
const text=(id:string,value:string,extra:object={})=>({id,type:'text',text:value,x:4,y:4,width:92,height:12,fontSize:50,bold:true,color:'#ffffff',animation:'none',...extra});
const stationary=(car:'red'|'blue')=>{const f=samplePath3D(route,0,car==='red'?-.98:.98);return {id:car,character:car,scale:.55,x:f.position.x,y:f.position.y,z:f.position.z,rotation:Math.atan2(f.forward.x,f.forward.z)*180/Math.PI};};
const crowd=(at:number)=>[{id:'audience',group:'audience',y:.4,z:1.6,timeOffset:at}];
const wide={fov:48,keys:[{at:0,position:{x:-25,y:13,z:-24},target:{x:-1,y:1.5,z:-1}},{at:4,position:{x:-23,y:11,z:-21},target:{x:-1,y:1.5,z:-1}}]};
const follow=(car:string)=>({fov:52,follow:{actor:car,mode:'chase',offset:{x:6,y:2.5,z:-4},target:{y:1,z:2}}});
const driver={fov:85,follow:{actor:'blue',mode:'onboard',offset:{x:-.4,y:1.35,z:.65},target:{x:-.4,y:1.35,z:6}}};
const spectator={fov:52,follow:{actor:'red',mode:'track',offset:{x:17,y:6,z:3},target:{y:1}}};
const finish={fov:55,yaw:-100,pitch:16,distance:12,targetX:-11,targetY:1.2,targetZ:-7};
const intervals=[0,6,12,18,24,30,36,42,47,48,48.5];
const cameras=[follow('red'),spectator,driver,follow('blue'),{fov:48,keys:[{at:0,position:{x:22,y:15,z:24},target:{y:1.5}},{at:6,position:{x:-19,y:13,z:23},target:{y:1.5}}]},spectator,follow('red'),driver,finish,finish];
const scenes:any[]=[
 {id:'opening',name:'Monstertruck-Duell – die Arena',duration:4,transition:'none',elements:[text('title','MONSTERTRUCK-DUELL',{y:7,height:18,fontSize:88}),text('subtitle','2 Trucks · 4 Runden · Looping & Sprung',{y:79,fontSize:42})],stage3d:{stage:'track',camera:wide,groups:crowd(0),actors:[stationary('red'),stationary('blue')]}},
 {id:'countdown',name:'Am Start: Rot gegen Blau',duration:3,transition:'none',elements:[3,2,1].map((n,i)=>text('count'+n,String(n),{at:i,until:i+1,x:35,y:25,width:30,height:45,fontSize:220})),stage3d:{stage:'track',camera:{fov:52,follow:{actor:'red',mode:'track',offset:{x:-16,y:3,z:-12},target:{y:1}}},groups:crowd(4),actors:[stationary('red'),stationary('blue')]}}
];
for(let i=0;i<intervals.length-1;i++){
 const a=intervals[i],b=intervals[i+1],duration=b-a,lap=Math.min(4,Math.floor(a/12)+1),actors=(['red','blue'] as const).map(car=>{
  const finishTime=car==='red'?48:48.5;if(a>=finishTime)return stationary(car);
  const start=raceProgress3D(car,a),end=raceProgress3D(car,b),span=Math.min(b,finishTime)-a;
  return {id:car,character:car,scale:.55,path:{path:'circuit',start:start%1,laps:end-start,duration:span,offset:car==='red'?-.98:.98},motions:[{animation:'drive',duration:span,loop:true,speed:2,blend:0}]};
 });
 scenes.push({id:'race'+i,name:a>=47?'Zielfoto':`Runde ${lap} – ${['Verfolgung','Zuschauerschwenk','Fahrerkamera','Duell'][i%4]}`,duration,transition:'none',elements:[text('lap'+i,`RUNDE ${lap} / 4`,{width:32,fontSize:40,align:'left'}),...(a===0?[text('go','LOS!',{x:35,y:30,width:30,height:25,fontSize:130,until:.8})]:[]),...(a>=48?[text('winner','ROT IM ZIEL! BLAU ZIEHT NACH',{y:76,fontSize:48})]:[])],stage3d:{stage:'track',camera:cameras[i],groups:crowd(raceStart3D+a),actors,...(a>=47?{stageMotions:[{animation:'finishWave',duration,loop:true,blend:0}]}:{})}});
}
scenes.push({id:'podium',name:'Rot gewinnt – beide vier Runden geschafft',duration:6,transition:'none',elements:[text('result','ROT GEWINNT!',{y:7,fontSize:92,height:18,color:'#ffe48c'}),text('times','Rot: 48,0 s  ·  Blau: 48,5 s',{y:27,fontSize:42}),text('ask','Team Rot oder Team Blau?',{y:77,fontSize:50})],stage3d:{stage:'track',camera:{fov:50,keys:[{at:0,position:{x:-22,y:6,z:-15},target:{x:-10,y:1.5,z:-7}},{at:6,position:{x:-21,y:8,z:-12},target:{x:-10,y:1.5,z:-7}}]},groups:crowd(raceFinish3D),actors:[stationary('red'),stationary('blue')],stageMotions:[{animation:'finishWave',duration:6,loop:true,blend:0}]}});
const stage:any=base.stages.track;stage.name='Roboblox-Rennarena';for(const part of stage.model.parts)if(/^road\d+$/.test(part.id))part.size.z+=.32;stage.model.parts.push({id:'finishFlag',shape:'group',pivot:{x:-13,y:3.3,z:-7},joints:[{id:'flagWave',axis:'z',min:-12,max:12}]});for(const part of stage.model.parts)if(/^check\d+$/.test(part.id))part.parent='finishFlag';stage.model.animations={finishWave:{duration:1.2,tracks:[{joint:'flagWave',keys:[-5,8,-8,5,-5].map((value,i)=>({at:i*.3,value})),easing:'ease-in-out'}]}};
const bass={...presetInstrument('bass'),volume:.3,release:.08},lead={...presetInstrument('kalimba','lead'),volume:.25,release:.12,reverb:0,echo:{delay:.2,feedback:0,mix:0}},drum={...presetInstrument('bass','drum'),wave:'noise' as const,volume:.12,attack:.001,decay:.04,sustain:0,release:.02,filter:'lowpass' as const,cutoff:700};
const beat=60/132,notes=[];for(let i=0;i<raceDuration3D/beat;i++){const at=i*beat;notes.push({instrument:'bass',at,duration:.22,pitch:[36,36,43,39][Math.floor(i/4)%4],velocity:.65},{instrument:'drum',at,duration:.05,pitch:48,velocity:i%2?.3:.65});if(i%2===0)notes.push({instrument:'lead',at,duration:.18,pitch:[60,67,72,70,65,67,74,72][i/2%8],velocity:.5});}
export const race3DExample={...base,title:'Monstertruck-Duell: 4 Runden, Looping & Sprung! 🏁',description:'Für Fans von bunten Klemmbaustein- und Monstertruck-Rennen: Team Rot gegen Team Blau! Vier Runden mit Looping, Sprung und einem knappen Zieleinlauf – inklusive Fahrerkamera und jubelnder Tribüne.\n\nWelches Team würdest du wählen? Schreib Rot oder Blau in die Kommentare!\n\nOriginale blockige 3D-Animation im Roboblox-Stil, keine offiziellen Roblox-Inhalte. Motoren- und Publikumseffekte sind synthetisch erzeugt.\n\n#Monstertruck #Rennen #Klemmbausteine #3DAnimation',firstComment:'Team Rot ❤️ oder Team Blau 💙? Und was war cooler: der Looping oder der Sprung?',hashtags:'#Monstertruck #Rennen #Klemmbausteine #3DAnimation',scenes,music:{...defaultMusic('uplifting'),mode:'score',tempo:132,volume:.22,fadeIn:1,fadeOut:3,instruments:[bass,lead,drum],notes}};
