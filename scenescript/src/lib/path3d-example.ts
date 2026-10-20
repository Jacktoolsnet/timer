import {samplePath3D,vec,add,mul,type Path3D} from './path3d.ts';
import {truckModel3D} from './model3d-example.ts';
/** A small proof of the general path/camera vocabulary, not a built-in racing system. */
const points=[vec(-11,.15,-7),vec(-9,.15,-7)];
for(let i=0;i<=16;i++){const a=i/16*Math.PI*2;points.push(vec(-5+3*Math.sin(a),.15+3*(1-Math.cos(a)),-7));}
points.push(vec(0,.15,-7),vec(3,.7,-7),vec(5,2.3,-7),vec(7,1.7,-7),vec(9,.15,-7),vec(12,.15,-6),vec(14,.15,-3),vec(14,.15,3),vec(12,.15,6),vec(9,.15,7),vec(0,.15,7),vec(-9,.15,7),vec(-13,.15,5),vec(-15,.15,1),vec(-15,.15,-3),vec(-13,.15,-6));
export const demoPath3D:Path3D={closed:true,interpolation:'smooth',points};
const part=(id:string,position:object,size:object,color:string,extra:object={})=>({id,shape:'box',position,size,color,...extra});
const road=[];
for(let i=0;i<160;i++){
 const f=samplePath3D(demoPath3D,(i+.5)/160),a=samplePath3D(demoPath3D,i/160).position,b=samplePath3D(demoPath3D,(i+1)/160).position;
 if(f.position.x>4&&f.position.x<8&&f.position.z<-6.5)continue; // Flight over an actual gap, no physics solver.
 const pitch=Math.asin(Math.max(-1,Math.min(1,f.forward.x))),rotation={x:Math.atan2(-f.forward.y,f.forward.z)*180/Math.PI,y:pitch*180/Math.PI,z:Math.atan2(-f.up.x,f.right.x)*180/Math.PI};
 for(const k of ['x','y','z'] as const)rotation[k]+=0;
 road.push(part('road'+i,add(f.position,mul(f.up,-.1+(i%2)*.001)),{x:4.6,y:.16,z:Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)+.025},i%8===0?'#dc7848':'#394654',{rotation}));
}
const flags=Array.from({length:24},(_,i)=>part('check'+i,{x:-11.9+(i%8)*.24,y:3.7-Math.floor(i/8)*.24,z:-7},{x:.24,y:.24,z:.08},(i%8+Math.floor(i/8))%2?'#ffffff':'#18212d'));
const scenery=[...[-1,1].flatMap(s=>Array.from({length:4},(_,i)=>[
 part('trunk'+s+'_'+i,{x:-9+i*6,y:.8,z:s*12},{x:.3,y:1.6,z:.3},'#866343'),
 {id:'tree'+s+'_'+i,shape:'cone',position:{x:-9+i*6,y:2.3,z:s*12},size:{x:2,y:3,z:2},color:'#3e965f'}
]).flat()),part('finishPole',{x:-13,y:1.8,z:-7},{x:.12,y:3.6,z:.12},'#e6e8e9')];
const red=structuredClone(truckModel3D),blue=structuredClone(truckModel3D);for(const p of blue.parts)if(p.color==='#ed5948'||p.color==='#dc493f')p.color='#369cdd';
// Straight wheel animation: steering is not a substitute for route orientation.
for(const m of [red,blue])m.animations.drive.tracks=m.animations.drive.tracks.filter(t=>!t.joint.startsWith('steer'));
const cameras=[
 {follow:{actor:'red',mode:'chase',offset:{x:6,y:2,z:-4},target:{x:0,y:1,z:2}}},
 {follow:{actor:'blue',mode:'track',offset:{x:12,y:6,z:13},target:{y:1}}},
 {keys:[{at:0,position:{x:20,y:13,z:20},target:{y:1}},{at:12,position:{x:-20,y:10,z:20},target:{y:1}}]},
 {fov:85,follow:{actor:'red',mode:'onboard',offset:{x:-.4,y:1.35,z:.65},target:{x:-.4,y:1.35,z:6}}}
];
export const path3DExample={version:'1.0',title:'Zwei Monstertrucks – vier Runden auf der Loopingbahn',description:'Für Fans bunter Klemmbaustein-Rennen: zwei Monstertrucks, ein Looping und ein Sprung – aus vier Kameraperspektiven. #Monstertruck #Klemmbausteine #3DAnimation',format:'landscape',assets:{},videos:{},audios:{},characters:{red:{name:'Roter Monstertruck',height:3,model:red},blue:{name:'Blauer Monstertruck',height:3,model:blue}},stages:{track:{name:'Looping-Teststrecke',skyColor:'#b5dcf5',groundColor:'#78a867',blockColor:'#d0b278',model:{parts:[...road,...flags,...scenery]},paths:{circuit:demoPath3D}}},scenes:cameras.map((camera,i)=>({id:'lap'+(i+1),name:['Folgekamera','Zuschauer mit Kameraschwenk','Freier Kameraflug','Fahrerkamera'][i],duration:12,transition:'none',elements:[{id:'label'+i,type:'text',text:'Runde '+(i+1)+' / 4',x:4,y:4,width:38,height:10,fontSize:38,color:'#ffffff'}],stage3d:{stage:'track',camera,actors:['red','blue'].map((character,j)=>({id:character,character,scale:.55,path:{path:'circuit',duration:12,laps:1,offset:j?.98:-.98},motions:[{animation:'drive',duration:12,loop:true,speed:2,blend:0}]}))}}))};
