import {vec} from './path3d.ts';
import {truckModel3D} from './model3d-example.ts';
import {parseModel3D,defaultPart3D,vector3D,type Part3D} from './model3d.ts';
/** Detail remains ordinary reusable construction data, including all rotating wheel children. */
export function raceTruck3D(blue=false){
 const model=parseModel3D(structuredClone(truckModel3D))!,body=blue?'#369cdd':'#ed5948';
 for(const p of model.parts)if(p.color==='#ed5948'||p.color==='#dc493f')p.color=body;
 const part=(id:string,shape:Part3D['shape'],position:Partial<Part3D['position']>,size:Partial<Part3D['size']>,color:string,extra:Partial<Part3D>={})=>model.parts.push({...defaultPart3D(),id,shape,position:{...vector3D(),...position},size:{...vector3D(1),...size},color,...extra});
 const metal={metalness:.7,roughness:.3},onBody={parent:'body'};
 for(const side of [-1,1]){
  const tag=side<0?'L':'R';part('window'+tag,'box',{x:side*1.12,y:.78,z:-.45},{x:.035,y:.68,z:1.25},'#81cbe3',{...onBody,opacity:.86,metalness:.3});
  part('door'+tag,'box',{x:side*1.13,y:.19,z:-.45},{x:.04,y:.38,z:1.45},body,onBody);part('handle'+tag,'box',{x:side*1.17,y:.35,z:-.82},{x:.04,y:.06,z:.23},'#d6e3ed',{...onBody,...metal});
  part('step'+tag,'box',{x:side*1.36,y:-.2,z:-.35},{x:.35,y:.1,z:1.7},'#34424e',{...onBody,...metal});
  part('mirrorArm'+tag,'box',{x:side*1.35,y:.8,z:.22},{x:.45,y:.06,z:.06},'#334552',onBody);part('mirror'+tag,'box',{x:side*1.57,y:.84,z:.22},{x:.11,y:.3,z:.23},'#d1e3e9',{...onBody,...metal});
  part('rollUpright'+tag,'cylinder',{x:side*1.12,y:1.17,z:-1.45},{x:.12,y:1.05,z:.12},'#33414e',{...onBody,...metal});
  part('exhaust'+tag,'cylinder',{x:side*1.2,y:.6,z:-1.52},{x:.13,y:1.4,z:.13},'#adbcc8',{...onBody,...metal});
  for(const front of [-1,1]){
   const id=(side<0?'left':'right')+(front>0?'Front':'Rear'),parent='roll'+id;
   part('fender'+id,'box',{x:side*1.34,y:.12,z:front*1.35},{x:.5,y:.17,z:1.45},body,onBody);
   for(let i=0;i<10;i++){const a=i/10*Math.PI*2;part('tread'+id+i,'box',{y:.72*Math.cos(a),z:.72*Math.sin(a)},{x:.7,y:.07,z:.2},'#121c25',{parent,rotation:vec(a*180/Math.PI)});}
   for(let i=0;i<4;i++)part('spoke'+id+i,'box',{x:side*.42},{x:.05,y:.64,z:.07},'#c7d5df',{parent,rotation:vec(i*45),...metal});
   part('nuts'+id,'sphere',{x:side*.46},{x:.085,y:.085,z:.085},'#ecdfab',{parent,instances:Array.from({length:5},(_,i)=>({x:0,y:.23*Math.cos(i/5*Math.PI*2),z:.23*Math.sin(i/5*Math.PI*2)})),...metal});
   part('shock'+id,'cylinder',{x:side*1.05,y:1.03,z:front*1.35},{x:.15,y:.75,z:.15},'#e9b74b',metal);
   part('coil'+id,'cylinder',{x:side*1.05,y:.79,z:front*1.35},{x:.27,y:.045,z:.27},'#dce3e9',{instances:Array.from({length:6},(_,i)=>({x:0,y:i*.095,z:0})),...metal});
  }
 }
 part('rollCrossbar','cylinder',{y:1.7,z:-1.45},{x:.12,y:2.35,z:.12},'#33414e',{...onBody,rotation:vec(0,0,90),...metal});
 part('roofLightBar','box',{y:1.54,z:.12},{x:2.05,y:.13,z:.18},'#263847',onBody);part('roofLights','sphere',{y:1.56,z:.22},{x:.28,y:.2,z:.13},'#fff3b5',{...onBody,instances:[-.78,-.26,.26,.78].map(x=>({x,y:0,z:0}))});
 part('grille','box',{y:.06,z:1.87},{x:1.55,y:.33,z:.045},'#162936',onBody);part('grilleSlats','box',{y:-.05,z:1.9},{x:1.4,y:.027,z:.03},'#bfccd3',{...onBody,instances:Array.from({length:4},(_,i)=>({x:0,y:i*.07,z:0})),...metal});
 part('rearBumper','box',{y:-.06,z:-2.03},{x:3,y:.25,z:.22},'#b5c4cd',{...onBody,...metal});part('towHook','box',{y:-.16,z:2.13},{x:.22,y:.17,z:.2},'#f5bd4e',onBody);
 part('spareTire','cylinder',{y:.7,z:-2},{x:.95,y:.26,z:.95},'#1a2732',{...onBody,rotation:vec(90)});part('spareHub','cylinder',{y:.7,z:-2.15},{x:.44,y:.05,z:.44},'#c5d5df',{...onBody,rotation:vec(90),...metal});
 for(const side of [-1,1])part('tailLight'+side,'box',{x:side*1.12,y:.15,z:-1.97},{x:.35,y:.15,z:.06},'#ee383c',onBody);
 for(const front of [-1,1]){part('axle'+front,'cylinder',{y:.75,z:front*1.35},{x:.15,y:3.2,z:.15},'#455664',{rotation:vec(0,0,90),...metal});part('differential'+front,'sphere',{y:.74,z:front*1.35},{x:.47,y:.42,z:.42},'#637481',metal);}
 model.animations.drive.tracks=model.animations.drive.tracks.filter(t=>!t.joint.startsWith('steer'));
 const suspension=model.animations.drive.tracks.find(t=>t.joint==='suspension')!;suspension.keys=Array.from({length:17},(_,i)=>({at:i/4,value:[0,.06,0,-.06][i%4]}));
 return model;
}
