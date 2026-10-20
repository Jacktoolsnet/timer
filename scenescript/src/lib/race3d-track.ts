import {samplePath3D,vec,add,mul,sub,norm,cross,dot,type Path3D,type V3} from './path3d.ts';
const height=1.4,points:V3[]=[vec(-19,height,-15),vec(-16,height,-15),vec(-12.05,height,-15)],ups:V3[]=[vec(0,1,0),vec(0,1,0),vec(0,1,0)];
export const spiralEntryIndex3D=points.length;
// One full turn, but with 6.4 units of side separation and zero lateral derivative at both ends.
for(let i=0;i<=24;i++){const f=i/24,a=f*Math.PI*2,s=f*f*(3-2*f);points.push(vec(-11+4*Math.sin(a),height+4*(1-Math.cos(a)),-15+6.4*s));ups.push(vec(-Math.sin(a),Math.cos(a),0));}
export const spiralExitIndex3D=points.length-1;
const extras=[[-9.95,height,-8.6],[-6,height,-8.6],[0,1.7,-8.6],[4,2.4,-8.6],[6,3.9,-8.6],[8,3.6,-8.6],[10,2.1,-8.6],[13,1.5,-8.6],[18,1.8,-9],[23,2,-6],[24,2,-1],[20,2.2,3],[15,2,5],[12,1.6,9],[17,1.8,13],[22,2,16],[20,2,21],[14,2,23],[8,1.8,20],[4,1.6,17],[-2,height,18],[-8,1.6,22],[-16,2,21],[-23,2,16],[-24,2,9],[-20,1.6,5],[-15,height,3],[-16,height,-2],[-22,1.6,-5],[-24,1.6,-10],[-23,height,-14]];
points.push(...extras.map(([x,y,z])=>vec(x,y,z)));
for(let i=ups.length;i<points.length;i++){
 const p=points[i],previous=points[i-1],next=points[(i+1)%points.length],a=norm(vec(p.x-previous.x,0,p.z-previous.z)),b=norm(vec(next.x-p.x,0,next.z-p.z)),angle=Math.atan2(cross(a,b).y,dot(a,b));
 const bank=i<spiralExitIndex3D+8?0:-Math.max(-.49,Math.min(.49,angle*.72)),forward=norm(sub(next,previous)),vertical=vec(0,1,0);
 ups.push(add(add(mul(vertical,Math.cos(bank)),mul(cross(forward,vertical),Math.sin(bank))),mul(forward,dot(forward,vertical)*(1-Math.cos(bank)))));
}
export const racePath3D:Path3D={closed:true,interpolation:'smooth',points,ups};
export const raceRoadWidth3D=4.8,raceRoadSamples3D=448;
export const raceJumpGap3D=(p:V3)=>p.z>-9.2&&p.z<-8&&p.x>4.8&&p.x<8.6;
export function frameRotation3D(f:ReturnType<typeof samplePath3D>){
 const y=Math.asin(Math.max(-1,Math.min(1,f.forward.x))),c=Math.cos(y);
 // Gimbal lock: retain a valid combined X/Z rotation rather than atan2(0,0).
 const x=Math.abs(c)>1e-7?Math.atan2(-f.forward.y,f.forward.z):Math.atan2(f.up.z,f.up.y),z=Math.abs(c)>1e-7?Math.atan2(-f.up.x,f.right.x):0;
 return {x:x*180/Math.PI+0,y:y*180/Math.PI+0,z:z*180/Math.PI+0};
}
export const raceRoadParts3D=Array.from({length:raceRoadSamples3D},(_,i)=>{
 const f=samplePath3D(racePath3D,(i+.5)/raceRoadSamples3D),a=samplePath3D(racePath3D,i/raceRoadSamples3D),b=samplePath3D(racePath3D,(i+1)/raceRoadSamples3D),angle=Math.acos(Math.max(-1,Math.min(1,dot(a.forward,b.forward)))),distance=Math.hypot(...Object.values(sub(a.position,b.position)));
 if(raceJumpGap3D(f.position))return [];
 return [{id:'road'+i,shape:'box',position:add(f.position,mul(f.up,-.12+(i%2)*.003)),rotation:frameRotation3D(f),size:{x:raceRoadWidth3D,y:.2,z:distance+raceRoadWidth3D*Math.tan(Math.min(.5,angle)/2)+.05},color:i%10===0?'#de7947':'#3e4b5a',roughness:.95}];
}).flat();
// Pillars underneath ordinary elevated/banked sections, never across the airborne gap or loop interior.
export const raceSupports3D={id:'trackSupports',shape:'cylinder',size:{x:.34,y:1.2,z:.34},color:'#8b9aa8',instances:Array.from({length:48},(_,i)=>samplePath3D(racePath3D,i/48).position).filter(p=>!raceJumpGap3D(p)&&p.y<2.2).map(p=>({x:p.x,y:.55,z:p.z}))};
