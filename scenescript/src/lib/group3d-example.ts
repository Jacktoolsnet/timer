/** Four original low-poly seated spectators, sharing a named cheer clip, not renderer presets. */
const box=(id:string,position:object,size:object,color:string,extra:object={})=>({id,shape:'box',position,size,color,...extra});
const track=(joint:string,values:number[],duration=2)=>({joint,keys:values.map((value,i)=>({at:i*duration/(values.length-1),value})),easing:'ease-in-out'});
function spectator(index:number){
 const shirt=['#e9b341','#3ba8bd','#d365a5','#6e80cf'][index],skin=['#efc59d','#a86f4d','#d99d70','#f2d5b4'][index],hair=['#6b422f','#24313f','#824b2a','#d69b38'][index];
 return {name:['Cap-Fan','Locken-Fan','Brillen-Fan','Mützen-Fan'][index],height:3,expression:'happy',model:{parts:[
  box('torso',{y:1.35},{x:.65,y:.7,z:.4},shirt),box('hips',{y:.93},{x:.64,y:.2,z:.45},'#34465a'),
  {id:'head',shape:index===1?'sphere':'box',position:{y:1.98},size:{x:.58,y:.6,z:.5},color:skin},
  box('hair',{y:2.28},{x:.63,y:.16,z:.54},hair),box('eyes',{y:2.02,z:.265},{x:index===2?.17:.06,y:.07,z:.025},'#23313e',{instances:[{x:-.13,y:0,z:0},{x:.13,y:0,z:0}]}),
  box('smile',{y:1.86,z:.27},{x:.2,y:.05,z:.03},'#8a3e40'),box('nose',{y:1.96,z:.3},{x:.07,y:.09,z:.09},skin),
  ...[-1,1].flatMap(side=>{const id=side<0?'left':'right';return [
   {id:id+'Shoulder',shape:'group',position:{x:side*.42,y:1.62},joints:[{id:id+'Arm',axis:'z',min:-160,max:160}]},
   box(id+'Hand',{y:-.25},{x:.19,y:.62,z:.22},skin,{parent:id+'Shoulder'}),
   box(id+'Thigh',{x:side*.2,y:.9,z:.27},{x:.22,y:.2,z:.65},'#34465a'),
   box(id+'Shin',{x:side*.2,y:.46,z:.53},{x:.18,y:.75,z:.18},'#34465a'),
   box(id+'Shoe',{x:side*.2,y:.1,z:.63},{x:.25,y:.15,z:.4},'#f0f1ea')
  ];}),
  ...(index===0?[box('cap',{y:2.29,z:.18},{x:.68,y:.08,z:.7},'#ed664d')]:index===3?[{id:'beanie',shape:'sphere',position:{y:2.28},size:{x:.65,y:.38,z:.58},color:'#6ebc9c'}]:[])
 ],animations:{cheer:{duration:2,tracks:[track('leftArm',[-105,-150,-110,-145,-105]),track('rightArm',[130,95,150,110,130])]}}}};
}
export const audienceCharacters3D=Object.fromEntries(Array.from({length:4},(_,i)=>['fan'+(i+1),spectator(i)]));
export const audienceGroup3D={name:'Tribünenpublikum – vier Vorlagen',characters:['fan1','fan2','fan3','fan4'],layout:'grid',count:48,columns:12,spacing:{x:1.1,y:.6,z:-1.4},seed:73,jitter:{x:.035,y:0,z:.025},rotationVariation:6,scale:.6,scaleVariation:.035,animation:'cheer',phase:2,speedVariation:.12};
export const grandstandParts3D=Array.from({length:4},(_,i)=>[
 box('standStep'+i,{x:0,y:(.43+i*.6)/2,z:1.5-i*1.4},{x:14,y:.43+i*.6,z:1.4},'#8799ab'),
 box('standBench'+i,{x:0,y:.82+i*.6,z:1.6-i*1.4},{x:13.5,y:.12,z:.5},'#348aa8'),
 box('standBack'+i,{x:0,y:1.05+i*.6,z:1.33-i*1.4},{x:13.5,y:.6,z:.09},'#38778d')
]).flat();
// Tiny code-native block lettering, grouped as instanced primitives (no bitmap/font dependency).
const glyphs:Record<string,string[]>={Z:['111','001','010','100','111'],O:['111','101','101','101','111'],M:['101','111','111','101','101'],B:['110','101','110','101','110'],L:['100','100','100','100','111'],T:['111','010','010','010','010'],N:['101','111','111','111','101'],V:['101','101','101','101','010'],A:['010','101','111','101','101']};
export const advertisingParts3D=['ZOOM','BOLT','NOVA'].flatMap((text,i)=>{
 const id='ad'+text,instances=text.split('').flatMap((letter,col)=>glyphs[letter].flatMap((row,y)=>[...row].flatMap((v,x)=>v==='1'?[{x:(col*4+x-7)*.22,y:(2-y)*.22,z:.09}]:[])));
 return [{id,shape:'group',position:{x:-9+i*9,y:2.3,z:10},rotation:{y:180}},
 box(id+'Board',{},{x:4.2,y:1.6,z:.12},['#cc554b','#4976bf','#8a5dba'][i],{parent:id}),
 box(id+'Letters',{},{x:.19,y:.19,z:.03},'#fff3c7',{parent:id,instances:[...instances,...instances.map(p=>({x:-p.x,y:p.y,z:-p.z}))]}),
 box(id+'Posts',{y:-1.1},{x:.1,y:2.3,z:.1},'#e3e7ea',{parent:id,instances:[{x:-1.7,y:0,z:0},{x:1.7,y:0,z:0}]})];
});
