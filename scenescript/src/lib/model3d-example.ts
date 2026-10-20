/** Original designs assembled only from the public SceneScript construction vocabulary. */
const part=(id:string,shape:string,position:object,size:object,color:string,extra:object={})=>({id,shape,position,size,color,...extra});
const joint=(id:string,axis:string,min:number,max:number,extra:object={})=>({id,axis,min,max,...extra});
const track=(joint:string,values:number[],duration:number)=>({joint,keys:values.map((value,i)=>({at:i*duration/(values.length-1),value}))});
const wheels=([-1,1] as const).flatMap(side=>([-1,1] as const).flatMap(front=>{
 const id=(side<0?'left':'right')+(front>0?'Front':'Rear'),steer='steer'+id,roll='roll'+id;
 return [
  part(steer,'group',{x:side*1.65,y:.75,z:front*1.35},{},'#253746',{joints:front>0?[joint(steer,'y',-35,35)]:[]}),
  part(roll,'group',{},{},'#253746',{parent:steer,joints:[joint(roll,'x',-3600,3600)]}),
  part('tire'+id,'cylinder',{},{x:1.45,y:.65,z:1.45},'#27333e',{parent:roll,rotation:{z:90},roughness:1}),
  part('hub'+id,'cylinder',{x:side*.36},{x:.7,y:.08,z:.7},'#f6b52d',{parent:roll,rotation:{z:90},metalness:.6}),
  part('stripe'+id,'box',{x:side*.41},{x:.04,y:.62,z:.1},'#ecf5fa',{parent:roll})
 ];
}));
export const truckModel3D={
 parts:[
  part('chassis','box',{y:1.1},{x:2.7,y:.35,z:3.7},'#334c60'),
  part('body','group',{y:1.55},{},'#dc493f',{joints:[joint('suspension','y',-.12,.12,{motion:'translation'})]}),
  part('hood','box',{z:1.05},{x:2.65,y:.55,z:1.6},'#ed5948',{parent:'body'}),
  part('cab','box',{y:.65,z:-.45},{x:2.2,y:1.35,z:1.9},'#ed5948',{parent:'body'}),
  part('windshield','box',{y:.85,z:.52},{x:1.8,y:.65,z:.04},'#9bdeef',{parent:'body',metalness:.35}),
  part('roof','box',{y:1.38,z:-.45},{x:2.5,y:.15,z:2.1},'#f7be38',{parent:'body'}),
  part('bumper','box',{y:-.05,z:1.95},{x:3,y:.22,z:.2},'#d6e3ed',{parent:'body',metalness:.7}),
  ...[-1,1].map(side=>part('lamp'+(side<0?'L':'R'),'sphere',{x:side*.9,y:.08,z:1.88},{x:.4,y:.28,z:.12},'#fff4a2',{parent:'body'})),
  ...wheels
 ],
 animations:{drive:{duration:4,tracks:[
  ...['leftFront','rightFront','leftRear','rightRear'].map(id=>track('roll'+id,[0,1440],4)),
  ...['leftFront','rightFront'].map(id=>track('steer'+id,[0,24,0,-24,0],4)),
  track('suspension',[0,.1,0,-.1,0,.1,0],4)
 ]}}
};
export const robotModel3D={
 parts:[
  part('body','box',{y:1.45},{x:1.1,y:1.1,z:.6},'#6f68d8'),
  part('head','box',{y:2.45},{x:1,y:.8,z:.75},'#dceaf5'),
  part('visor','box',{y:2.5,z:.39},{x:.85,y:.4,z:.06},'#233d51'),
  ...[-1,1].flatMap(side=>{
   const suffix=side<0?'L':'R';
   return [
    part('eye'+suffix,'sphere',{x:side*.22,y:2.57,z:.44},{x:.14,y:.15,z:.06},'#5ce5d1'),
    part('lid'+suffix,'box',{x:side*.22,y:2.75,z:.49},{x:.19,y:.17,z:.04},'#dceaf5',{joints:[joint('blink'+suffix,'y',-.16,0,{motion:'translation',control:'blink',target:-.16})]}),
    part('leg'+suffix,'box',{x:side*.3,y:.55},{x:.4,y:.95,z:.5},'#3d5a83'),
    part('foot'+suffix,'box',{x:side*.3,y:.15,z:.15},{x:.48,y:.25,z:.8},'#6f68d8'),
    part('arm'+suffix,'box',{x:side*.8,y:1.65},{x:.3,y:.9,z:.4},'#dceaf5',{pivot:{y:.4},joints:[joint('shoulder'+suffix,'z',-150,150)]})
   ];
  }),
  part('mouth','box',{y:2.22,z:.42},{x:.5,y:.06,z:.07},'#233d51',{joints:[joint('jaw','y',-.18,0,{motion:'translation',control:'mouth',target:-.18})]}),
  part('antenna','cylinder',{y:3},{x:.08,y:.4,z:.08},'#3d5a83'),
  part('antennaTip','sphere',{y:3.23},{x:.25,y:.25,z:.25},'#f7be38')
 ],
 animations:{cheer:{duration:2,tracks:[track('shoulderL',[0,-120,-95,-135,0],2),track('shoulderR',[0,120,95,135,0],2)]}}
};
export const workshopModel3D={
 parts:[
  part('platform','box',{y:0},{x:12,y:.2,z:9},'#cfdae1'),
  ...[-1,1].flatMap(side=>[
   part('trunk'+(side<0?'L':'R'),'cylinder',{x:side*5,y:1,z:-3},{x:.45,y:2,z:.45},'#896444'),
   part('tree'+(side<0?'L':'R'),'cone',{x:side*5,y:2.65,z:-3},{x:2.2,y:3,z:2.2},'#44916b')
  ]),
  part('gatePost','box',{x:4,y:1.3,z:-2},{x:.3,y:2.6,z:.3},'#f6b52d'),
  part('gate','box',{x:2.3,y:1.3,z:-2},{x:3.2,y:.22,z:.2},'#ed5948',{pivot:{x:1.7},joints:[joint('gateHinge','y',0,100)]}),
  part('backPanel','box',{y:1.2,z:-4},{x:7,y:2.2,z:.12},'#3d5a83')
 ],
 animations:{openGate:{duration:2,tracks:[track('gateHinge',[0,95],2)]}}
};
export const construction3DExample={
 version:'1.0',title:'Baukasten-Werkstatt: Monstertruck und Roboter',format:'landscape',
 description:'Eine bunte 3D-Werkstatt für Fans von Bauklotz-Fahrzeugen: Ein selbst gebauter Monstertruck zeigt seine beweglichen Räder und Federung, während ein Roboter jubelt.',
 firstComment:'Welches Fahrzeug sollen wir als Nächstes aus dem Baukasten zusammensetzen?',hashtags:'#Monstertruck, #Bauklotzwelt, #3DAnimation',
 characters:{truck:{name:'Freier Monstertruck',model:truckModel3D},robot:{name:'Freier Werkstatt-Roboter',model:robotModel3D}},
 stages:{workshop:{name:'Freie Werkstatt-Bühne',skyColor:'#b5e1f4',groundColor:'#79ac78',model:workshopModel3D}},
 scenes:[{id:'workshop',name:'Freie Bauteile in Bewegung',duration:8,transition:'none',stage3d:{
  stage:'workshop',camera:{yaw:22,pitch:16,distance:21,targetY:1.4,orbit:-1},
  stageMotions:[{animation:'openGate',duration:8,blend:0}],
  actors:[{id:'truck',character:'truck',x:-2,z:.8,motions:[{animation:'drive',duration:8,loop:true,blend:.2}]},
   {id:'robot',character:'robot',x:2,z:1,expressions:[{expression:'blink',at:1,duration:.25,blend:.12},{expression:'surprised',at:2,duration:1.5}],motions:[{animation:'cheer',duration:8,loop:true,blend:.2}]}]
 },elements:[{id:'title',type:'text',space:'screen',x:5,y:4,width:90,height:9,fontSize:52,bold:true,color:'#173247',text:'Alles aus frei definierten Bauteilen',animation:'none'}]}]
};
/** Tiny, complete syntax example; not a rendered mesh dump or executable script. */
export const aiModel3DExample={version:'1.0',title:'Joint example',format:'landscape',characters:{sign:{model:{parts:[{id:'pole',shape:'cylinder',position:{y:1},size:{x:.15,y:2,z:.15}},{id:'panel',parent:'pole',position:{y:1},size:{x:2,y:.8,z:.1},joints:[{id:'hinge',axis:'y',min:-90,max:90}]}],animations:{swing:{duration:2,tracks:[{joint:'hinge',keys:[{at:0,value:-60},{at:1,value:60},{at:2,value:-60}]}]}}}}},stages:{yard:{model:{parts:[{id:'floor',size:{x:8,y:.1,z:8}}]}}},scenes:[{id:'s',duration:6,stage3d:{stage:'yard',actors:[{id:'sign',character:'sign',motions:[{animation:'swing',duration:6,loop:true,blend:0}]}]},elements:[]}]};
