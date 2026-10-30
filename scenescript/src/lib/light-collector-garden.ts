import {parseModel2D,type Clip2D,type Property2D,type Part2D} from './model2d.ts';
import {lightCollector2D,defaultAction2D,defaultActor2D,defaultObject2D,type Actor2D} from './stage2d.ts';

export const LIGHT_COLLECTOR_DURATION=22;
/** Scene-local contact with the existing robot's right hand at the end of its catch. */
export const BUTTERFLY_BIRTH={at:8.05,x:587.5899171472884,y:160.10624036879545};
export const GARDEN_LANDINGS=[
 {id:'blue',name:'Blauer Schmetterling',color:'#8dd9df',flower:'flower-blue',x:654,y:452,scale:.85,flowerColor:'#efa5bd',at:13.75,delay:0,route:[[650,105],[760,160],[700,232],[600,285],[660,320]]},
 {id:'gold',name:'Goldener Schmetterling',color:'#f4cf82',flower:'flower-gold',x:780,y:465,scale:1,flowerColor:'#f2cb79',at:14.5,delay:.07,route:[[550,112],[595,225],[735,265],[825,295],[780,325]]},
 {id:'rose',name:'Rosafarbener Schmetterling',color:'#f0a8cc',flower:'flower-rose',x:894,y:448,scale:.9,flowerColor:'#b9a4df',at:15.25,delay:.16,route:[[630,78],[865,135],[820,215],[930,265],[892,318]]}
] as const;
const track=(part:string,property:Property2D,keys:readonly (readonly [number,number])[]):Clip2D['tracks'][number]=>({part,property,keys:keys.map(([at,value])=>({at,value,easing:'smooth'}))});
export function butterflyModel2D(){
 const parts:Partial<Part2D>[]=[{id:'insect',shape:'group',x:46,y:44}];
 for(const [side,mirror]of [['left',1],['right',-1]] as const){
  parts.push({id:side,parent:'insect',shape:'group',scaleX:mirror});
  parts.push({id:side+'-wing',parent:side,shape:'path',fill:'$color',stroke:'#fff0c7',strokeWidth:1.1,path:[
   {op:'M',values:[0,0]},{op:'C',values:[-16,-38,-43,-35,-37,-8]},
   {op:'C',values:[-49,18,-16,29,0,5]},{op:'Q',values:[-7,1,0,0]},{op:'Z',values:[]}
  ]});
  parts.push({id:side+'-shine',parent:side,shape:'path',fill:'#fff9dd',opacity:.24,path:[
   {op:'M',values:[-5,-4]},{op:'C',values:[-16,-29,-33,-30,-30,-14]},
   {op:'Q',values:[-20,-20,-5,-4]},{op:'Z',values:[]}
  ]});
  parts.push({id:side+'-veins',parent:side,shape:'path',fill:null,stroke:'#315c59',strokeWidth:.9,opacity:.45,path:[
   {op:'M',values:[0,0]},{op:'Q',values:[-16,-8,-28,-21]},
   {op:'M',values:[-1,4]},{op:'Q',values:[-16,8,-29,13]}
  ]});
  for(const [i,x,y]of [[0,-31,-14],[1,-29,8],[2,-20,16]])parts.push({id:side+'-dot-'+i,parent:side,shape:'ellipse',x,y,width:4,height:4,fill:'$accent',opacity:.85});
 }
 parts.push(
  {id:'body',parent:'insect',shape:'ellipse',x:-4,y:-18,width:8,height:38,fill:'#294d49'},
  {id:'head',parent:'insect',shape:'ellipse',x:-5,y:-23,width:10,height:10,fill:'#355b52'},
  {id:'antennae',parent:'insect',shape:'path',fill:null,stroke:'#31554e',strokeWidth:1.3,path:[
   {op:'M',values:[-2,-20]},{op:'Q',values:[-12,-36,-15,-30]},
   {op:'M',values:[2,-20]},{op:'Q',values:[12,-36,15,-30]}
  ]},
  {id:'back-light',parent:'insect',shape:'ellipse',x:-1.2,y:-13,width:2.4,height:16,fill:'#fff2c2',opacity:.65}
 );
 const wing=(duration:number,fast:boolean):Clip2D=>({duration,loop:true,tracks:[
  track('left','scaleX',[[0,fast?.18:.7],[duration/2,fast?1:.88],[duration,fast?.18:.7]]),
  track('right','scaleX',[[0,fast?-.18:-.7],[duration/2,fast?-1:-.88],[duration,fast?-.18:-.7]]),
  track('left','rotation',[[0,-5],[duration/2,4],[duration,-5]]),
  track('right','rotation',[[0,5],[duration/2,-4],[duration,5]])
 ]});
 return parseModel2D({width:92,height:82,originX:46,originY:64,parts,animations:{
  idle:wing(2.4,false),fly:wing(.34,true),
  hidden:{duration:.1,loop:false,tracks:[track('insect','opacity',[[0,0],[.1,0]])]},
  emerge:{duration:.3,loop:false,tracks:[
   track('insect','opacity',[[0,0],[.12,1],[.3,1]]),
   track('insect','scaleX',[[0,.12],[.19,1.12],[.3,1]]),
   track('insect','scaleY',[[0,.12],[.19,1.12],[.3,1]])
  ]},
  alight:{duration:.7,loop:false,tracks:[
   track('left','scaleX',[[0,.18],[.23,1],[.46,.5],[.7,.74]]),
   track('right','scaleX',[[0,-.18],[.23,-1],[.46,-.5],[.7,-.74]])
  ]}
 }});
}
export function flowerModel2D(){
 const parts:Partial<Part2D>[]=[
  {id:'ground-shadow',shape:'ellipse',x:36,y:176,width:68,height:8,fill:'#103d37',opacity:.3},
  {id:'plant',shape:'group',x:70,y:180,rotationMin:-12,rotationMax:12},
  {id:'stem',parent:'plant',shape:'path',fill:null,stroke:'#72a77b',strokeWidth:4,path:[{op:'M',values:[0,0]},{op:'C',values:[-8,-36,8,-70,0,-102]}]},
  {id:'left-leaf',parent:'plant',shape:'path',fill:'#55926c',stroke:'#8fba83',strokeWidth:1,path:[{op:'M',values:[-1,-34]},{op:'C',values:[-37,-65,-46,-32,-1,-34]},{op:'Z',values:[]}]},
  {id:'right-leaf',parent:'plant',shape:'path',fill:'#6caa78',path:[{op:'M',values:[0,-57]},{op:'C',values:[28,-87,45,-60,0,-57]},{op:'Z',values:[]}]},
  {id:'bloom',parent:'plant',shape:'group',y:-102}
 ];
 for(let i=0;i<6;i++)parts.push({id:'petal-'+i,parent:'bloom',shape:'ellipse',width:28,height:44,pivotX:14,pivotY:36,rotation:i*60,fill:'$color',stroke:'#ffe8c9',strokeWidth:.8});
 parts.push(
  {id:'center-shadow',parent:'bloom',shape:'ellipse',x:-13,y:-12,width:26,height:26,fill:'#b98b58'},
  {id:'center',parent:'bloom',shape:'ellipse',x:-11,y:-12,width:22,height:22,fill:'#ffe09c'},
  {id:'hand',parent:'bloom',shape:'group',y:-4}
 );
 for(const [i,x,y]of [[0,-5,-6],[1,3,-4],[2,-1,2]])parts.push({id:'pollen-'+i,parent:'bloom',shape:'ellipse',x,y,width:2.5,height:2.5,fill:'#bf8a57'});
 return parseModel2D({width:140,height:180,originX:70,originY:180,parts,animations:{
  idle:{duration:4,loop:true,tracks:[track('plant','rotation',[[0,-.7],[2,.7],[4,-.7]])]},
  landing:{duration:1.4,loop:false,tracks:[
   track('plant','rotation',[[0,0],[.14,-6],[.35,4],[.62,-2.3],[.9,1.2],[1.16,-.45],[1.4,0]]),
   track('bloom','rotation',[[0,0],[.14,5],[.35,-3],[.62,1.6],[.9,-.6],[1.4,0]])
  ]}
 }});
}
/** Elaborated demo choreography. Every flower and butterfly remains a reusable resource instance. */
export function lightCollectorGarden2D(){
 const resources=lightCollector2D(),shot=resources.shot;
 const butterfly={...defaultObject2D('custom'),name:'Lichtschmetterling',color:'#8dd9df',accentColor:'#fff1c5',model:butterflyModel2D()};
 const flower={...defaultObject2D('custom'),name:'Wiesenblume',color:'#efa5bd',model:flowerModel2D()};
 resources.objects2d.butterfly=butterfly;resources.objects2d.flower=flower;
 // The original contact particle burst is the butterfly birth, not a second delayed explosion.
 shot.actors[1].actions.find(a=>a.type==='fade')!.at=BUTTERFLY_BIRTH.at;shot.actors[1].actions.find(a=>a.type==='fade')!.duration=.32;
 shot.actors[0].actions.push({...defaultAction2D('wave'),at:10.1,duration:2.3});
 const flowers:Actor2D[]=[],butterflies:Actor2D[]=[];
 for(const [i,landing]of GARDEN_LANDINGS.entries()){
  const blossom=defaultActor2D('flower',landing.flower);blossom.name=['Rosa Blume','Goldene Blume','Lila Blume'][i];blossom.layer='foreground';
  blossom.x=landing.x;blossom.y=landing.y;blossom.scale=landing.scale;blossom.color=landing.flowerColor;
  blossom.actions=[{...defaultAction2D('play'),clip:'landing',at:landing.at,duration:1.4}];flowers.push(blossom);
  const actor=defaultActor2D('butterfly','butterfly-'+landing.id),birth=BUTTERFLY_BIRTH.at+landing.delay,landStart=landing.at-.35;
  actor.name=landing.name;actor.layer='foreground';actor.x=BUTTERFLY_BIRTH.x;actor.y=BUTTERFLY_BIRTH.y;actor.scale=[.66,.6,.56][i];actor.color=landing.color;
  actor.actions=[
   {...defaultAction2D('play'),clip:'hidden',at:0,duration:birth},
   {...defaultAction2D('play'),clip:'emerge',at:birth,duration:.3},
   {...defaultAction2D('play'),clip:'fly',at:birth,duration:landStart-birth},
   {...defaultAction2D('play'),clip:'alight',at:landStart,duration:.7},
   {...defaultAction2D('float'),at:birth,duration:landStart-birth,height:5+i*2}
  ];
  const points=[...landing.route,[landing.x,landing.y-106*landing.scale-14]],interval=(landStart-birth)/points.length;
  for(const [j,[x,y]]of points.entries())actor.actions.push({...defaultAction2D('move'),at:birth+j*interval,duration:interval,toX:x,toY:y});
  actor.actions.push({...defaultAction2D('attach'),at:landStart,duration:.35,target:blossom.id,burst:false});butterflies.push(actor);
 }
 shot.actors.push(...flowers,...butterflies);
 shot.camera=[...shot.camera.slice(0,3),{at:10.8,x:-75,y:0,zoom:1.04},{at:13.2,x:-35,y:0,zoom:1},{at:22,x:-35,y:0,zoom:1}];
 shot.transition={...shot.transition!,at:17.2,duration:1.8};
 shot.ending={...shot.ending!,at:19.3,duration:1.2};
 return resources;
}
