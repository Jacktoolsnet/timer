import {parseModel3D,type Model3D,type Joint3D} from './model3d.ts';
import {pixelFaces3D} from './stage3d-face.ts';
/** Old presets are now plain construction data. The renderer contains no figure-specific logic. */
const palette:Record<string,string>={bodyColor:'#36a9e1',headColor:'#dde7ed',limbColor:'#64748b',accentColor:'#ffe066',groundColor:'#78a653',blockColor:'#e6bd7a'};
export function presetCharacterModel3D(style='classic'):Model3D{
 const parts:Record<string,unknown>[]=[],person=style==='brick';
 const add=(id:string,color:string,x:number,y:number,z:number,w:number,h:number,d:number,parent='body',extra:Record<string,unknown>={})=>{
  parts.push({id,parent,shape:'box',color:palette[color]??color,palette:palette[color]?color:'',position:{x,y,z},size:{x:w,y:h,z:d},...extra});return id;
 };
 const joint=(id:string,motion:Joint3D['motion'],axis:'x'|'y'|'z',min:number,max:number,value=0,control='none',target=max,responses:Record<string,number>={})=>({id,motion,axis,min,max,value,control,target,responses});
 const response=(id:string,motion:Joint3D['motion'],axis:'x'|'y'|'z',min:number,max:number,value:number,responses:Record<string,number>,control='none',target=max)=>joint(id,motion,axis,min,max,value,control,target,responses);
 parts.push({id:'body',shape:'group',joints:[joint('breathing','translation','y',-.1,.1,0,'bob',.1)]});
 add('shadow','#526674',0,.1,0,1.7,.01,1.7,'body',{shape:'cylinder',opacity:.18,roughness:1,metalness:0});
 add('torso','bodyColor',0,1.65,0,1.15,1.05,.65);
 if(!person){add('chest','accentColor',0,1.7,.345,.55,.45,.08);add('chestLight','#effaff',0,1.72,.4,.16,.15,.04);}
 else{add('belt','accentColor',0,1.22,.34,1.08,.12,.04);[1.5,1.8,2].forEach((y,i)=>add('button'+i,'accentColor',0,y,.34,.07,.07,.04));}
 add('neck',person?'headColor':'limbColor',0,2.26,0,.35,.2,.35);
 parts.push({id:'face',parent:'body',shape:'group'});
 add('head','headColor',0,2.67,0,.96,.75,person?.96:.8,'body',{shape:person?'cylinder':'box'});
 if(person){
  add('headStud','headColor',0,3.09,0,.32,.13,.32);
  for(const [i,x]of [-.19,.19].entries()){
   const eyeJoints=[response('eyeHeight'+i,'scale','y',.01,2,1,{happy:.7,sad:.8,angry:.65,surprised:1.45},'blink',.05),response('eyeTilt'+i,'rotation','z',-90,90,0,{angry:Math.sign(x)*.22*180/Math.PI,sad:-Math.sign(x)*.12*180/Math.PI})];
   add('eye'+i,'#213746',x,2.77,.441,.09,.13,.055,'face',{joints:eyeJoints});
   add('eyeHighlight'+i,'#ffffff',x-.015,2.8,.474,.025,.035,.015,'face',{joints:[joint('highlight'+i,'scale','y',0,1,1,'blink',0)]});
  }
  add('nose','headColor',0,2.63,.5,.14,.15,.17,'face');
  for(const [i,[x,y]]of [[-.19,2.51],[-.12,2.47],[0,2.45],[.12,2.47],[.19,2.51]].entries()){
   const edge=Math.abs(x)/.19-.5;
   add('mouth'+i,'#663d32',x,y,Math.sqrt(.48*.48-x*x)+.012,.085,.045,.04,'face',{joints:[
    response('smile'+i,'translation','y',-.2,.2,0,{happy:.06*edge,sad:-.18*edge,angry:-.126*edge}),
    joint('mouthWidth'+i,'scale','x',0,1,1,'mouth',0),joint('mouthHeight'+i,'scale','y',0,1,1,'mouth',0)
   ]});
  }
  add('openMouth','#663d32',0,2.43,.496,.17,.035,.17,'face',{shape:'cylinder',rotation:{x:90},joints:[joint('openMouthX','scale','x',0,1,0,'mouth',1),joint('openMouthZ','scale','z',0,1.4,0,'mouth',1.4)]});
 }else if(style==='pixel'){
  add('monitorFrame','limbColor',0,2.67,.432,.88,.64,.1,'face');add('monitor','#101e2c',0,2.67,.492,.78,.54,.035,'face');
  for(let row=0;row<8;row++)for(let col=0;col<12;col++){
   const lit=(key:keyof typeof pixelFaces3D)=>pixelFaces3D[key][row][col]==='#'?1:0,base=lit('neutral');
   const responses=Object.fromEntries((['happy','sad','angry','surprised'] as const).map(key=>[key,lit(key)]));
   add('pixel_'+row+'_'+col,'accentColor',(col-5.5)*.058,2.67+(3.5-row)*.058,.518,.046,.046,.02,'face',{joints:
    (['x','y'] as const).map(axis=>response('pixel_'+row+'_'+col+'_'+axis,'scale',axis,0,1,base,responses,row<4?'blink':'speech',row<4?lit('blink'):lit('surprised')))
   });
  }
 }else{
  add('visor','#213746',0,2.71,.414,.76,.34,.04,'face');
  for(const [i,x]of [-.21,.21].entries())add('eye'+i,'accentColor',x,2.75,.445,.17,.12,.03,'face',{joints:[
   response('eyeHeight'+i,'scale','y',.01,2,1,{happy:.7,sad:.8,angry:.65,surprised:1.45},'blink',.05),
   response('eyeTilt'+i,'rotation','z',-90,90,0,{angry:Math.sign(x)*.22*180/Math.PI,sad:-Math.sign(x)*.12*180/Math.PI})
  ]});
  if(style==='robot'){
   add('mouthFrame','limbColor',0,2.43,.43,.54,.16,.06,'face',{joints:[joint('frameHeight','scale','y',1,1.9,1,'mouth',1.9),joint('frameWidth','scale','x',.65,1,1,'mouth',.65)]});
   add('mouth','#142733',0,2.43,.468,.44,.09,.025,'face',{joints:[joint('mouthWidth','scale','x',.45,1,1,'mouth',.45),joint('mouthHeight','scale','y',1,2.6,1,'mouth',2.6),response('mouthTilt','rotation','z',-20,20,0,{sad:.12*180/Math.PI}),response('smile','translation','y',-.1,.1,0,{happy:.015,sad:-.015})]});
   [-.14,0,.14].forEach((x,i)=>add('grille'+i,'headColor',x,2.43,.486,.027,.08,.02,'face',{joints:[joint('grilleHeight'+i,'scale','y',0,1,1,'mouth',0),response('grilleSmile'+i,'translation','y',-.1,.1,0,{happy:(Math.abs(x)/.14-.5)*.045,sad:-(Math.abs(x)/.14-.5)*.045})]}));
  }else add('mouth','headColor',0,2.49,.45,.23,.045,.03,'face',{joints:[joint('mouthHeight','scale','y',1,2.6,1,'mouth',2.6)]});
 }
 if(!person){add('antenna','limbColor',0,3.12,0,.1,.25,.1);add('antennaTip','accentColor',0,3.26,0,.23,.12,.23);}
 if(style!=='pixel')for(const [i,x]of [-.2,.2].entries())add('brow'+i,person?'#663d32':'accentColor',x,2.94,person?.446:.45,.19,.035,.035,'face',{joints:[
  response('browHeight'+i,'scale','y',0,1,0,{happy:.4,sad:1,angry:1,surprised:1}),
  response('browTilt'+i,'rotation','z',-90,90,0,{angry:Math.sign(x)*.45*180/Math.PI,sad:-Math.sign(x)*.4*180/Math.PI}),
  response('browLift'+i,'translation','y',-.1,.1,0,{surprised:.035,angry:-.04})
 ]});
 for(const [name,x,y,leg]of [['leftArm',-.78,2.05,false],['rightArm',.78,2.05,false],['leftLeg',-.31,1.13,true],['rightLeg',.31,1.13,true]] as const){
  parts.push({id:name,parent:'body',shape:'group',position:{x,y},joints:[joint(name,'rotation','x',-180,180,0,name,180),...(name==='rightArm'?[joint('wave','rotation','z',-90,90,0,'wave',180/2)]:[])]});
  add(name+'Segment',person&&!leg?'bodyColor':'limbColor',0,leg?-.48:-.42,0,leg?.38:.32,leg?.85:.72,.4,name);
  add(name+'End',leg?(person?'limbColor':'bodyColor'):'headColor',0,leg?-.89:-.87,leg?.1:0,leg?.44:.38,.28,leg?.66:.44,name);
 }
 // Named clips are independently usable, while the joint controls preserve old actions.
 const keys=(joint:string,values:number[],duration:number)=>({joint,keys:values.map((value,i)=>({at:i*duration/(values.length-1),value}))});
 return parseModel3D({parts,animations:{
  walk:{duration:1,tracks:[keys('leftArm',[0,34,0,-34,0],1),keys('rightArm',[0,-34,0,34,0],1),keys('leftLeg',[0,-34,0,34,0],1),keys('rightLeg',[0,34,0,-34,0],1)]},
  wave:{duration:2,tracks:[keys('rightArm',[0,-144,-144,-144,0],2),keys('wave',[0,10,-10,10,0],2)]}
 }})!;
}
export function presetStageModel3D():Model3D{
 const parts:Record<string,unknown>[]=[],add=(id:string,color:string,x:number,y:number,z:number,w:number,h:number,d:number,extra:Record<string,unknown>={})=>parts.push({id,shape:'box',color:palette[color]??color,palette:palette[color]?color:'',position:{x,y,z},size:{x:w,y:h,z:d},...extra});
 add('plaza','#c7d4d9',0,-.08,0,16,.25,10);let index=0;
 for(let x=-7;x<=7;x+=2)for(let z=-4;z<=4;z+=2)add('tile'+index++,(x+z)%4===0?'#dce6e7':'#b8c9ce',x,.055,z,1.94,.05,1.94);
 const instances=[];for(let x=-14;x<=13;x+=2)for(let z=-14;z<=16;z+=2)instances.push({x,y:0,z});
 add('studs','groundColor',0,.04,0,.26,.09,.26,{shape:'cylinder',instances});
 for(const [i,[x,z,h,c]]of [[-9,-7,4,'#e6956e'],[8,-8,6,'blockColor'],[-12,2,3,'#8fb5cf'],[12,0,4,'#9c9ed2']].entries()){
  add('tower'+i,c as string,x as number,(h as number)/2,z as number,3,h as number,3);add('cap'+i,'#f4e6c6',x as number,(h as number)+.2,z as number,3.35,.4,3.35);
  for(let y=1;y<(h as number);y+=1.5)add('window'+index++,'#537b95',x as number,y,(z as number)+1.52,1,.7,.06);
 }
 add('archL','blockColor',-3,2,-8,1,4,1);add('archR','blockColor',3,2,-8,1,4,1);add('archTop','#fff0cd',0,4.3,-8,7,1,1.3);
 for(const [i,[x,z]]of [[-7,5],[8,5],[-6,-11],[12,-11]].entries()){add('trunk'+i,'#946c47',x,1.2,z,.65,2.4,.65);add('leaves'+i,'#4d9466',x,3,z,2.6,2.3,2.6);add('crown'+i,'#6cad73',x-.35,4.3,z,1.8,1,1.8);}
 return parseModel3D({parts})!;
}
