import {parseModel2D} from './model2d.ts';
import {defaultActor2D,defaultObject2D,defaultStage2D,defaultStage2DResource,defaultAction2D} from './stage2d.ts';
import {demoProject} from './model.ts';
export function birdModel2D(){return parseModel2D({
 width:240,height:240,originX:120,originY:200,
 parts:[
  {id:'body',shape:'ellipse',x:38,y:55,width:155,height:115,fill:'#5f9dc5',stroke:'#204761',strokeWidth:3},
  {id:'tail',shape:'polygon',x:36,y:118,points:[0,0,-35,-20,-25,23,20,0],fill:'#36779e'},
  {id:'wing',shape:'path',x:65,y:110,pivotX:0,pivotY:0,rotationMin:-70,rotationMax:40,fill:'#badde4',path:[{op:'M',values:[0,0]},{op:'C',values:[30,-65,100,-90,120,-65]},{op:'Q',values:[115,0,0,0]},{op:'Z',values:[]}]},
  {id:'head',shape:'group',x:154,y:70},
  {id:'face',parent:'head',shape:'ellipse',width:62,height:62,fill:'#5f9dc5'},
  {id:'eye',parent:'head',shape:'ellipse',x:38,y:15,width:9,height:12,fill:'#102a43'},
  {id:'beak',parent:'head',shape:'polygon',x:58,y:28,points:[0,0,25,10,0,15],fill:'#f2be66'},
  {id:'hand',shape:'group',x:120,y:170}
 ],
 animations:{
  idle:{duration:2,loop:true,tracks:[{part:'head',property:'rotation',keys:[{at:0,value:-4},{at:1,value:4},{at:2,value:-4}]}]},
  fly:{duration:1,loop:true,tracks:[{part:'wing',property:'rotation',keys:[{at:0,value:-55},{at:.5,value:25},{at:1,value:-55}]}]},
  blink:{duration:.4,loop:false,tracks:[{part:'eye',property:'scaleY',keys:[{at:0,value:1},{at:.2,value:.1},{at:.4,value:1}]}]}
 }
});}
export function cityModel2D(){return parseModel2D({
 width:960,height:540,originX:0,originY:0,
 parts:[
  {id:'sky',shape:'rectangle',width:960,height:540,fill:'#f3dfc6',parallax:0},
  {id:'sun',shape:'ellipse',x:720,y:45,width:110,height:110,fill:'#fff6ce',parallax:.1},
  {id:'houses',shape:'group',x:60,y:160,parallax:.35},
  {id:'left',parent:'houses',shape:'rectangle',width:180,height:280,radius:12,fill:'#c48282'},
  {id:'roof',parent:'houses',shape:'polygon',x:-15,points:[0,0,105,-85,210,0],fill:'#6d5d7d'},
  {id:'window',parent:'houses',shape:'rectangle',x:60,y:80,width:55,height:90,radius:25,fill:'#ffedaf'},
  {id:'shop',shape:'rectangle',x:520,y:235,width:340,height:200,fill:'#92b8ae',parallax:.6},
  {id:'sign',shape:'text',x:570,y:265,width:220,height:60,text:'Bäckerei',fontSize:32,fill:'#294e50',parallax:.6},
  {id:'road',shape:'rectangle',y:435,width:960,height:105,fill:'#797d8c'},
  {id:'foreground',shape:'path',layer:'foreground',parallax:1.3,fill:null,stroke:'#4b5c61',strokeWidth:10,path:[{op:'M',values:[30,540]},{op:'Q',values:[45,390,80,365]}]}
 ],
 animations:{idle:{duration:4,loop:true,tracks:[{part:'window',property:'opacity',keys:[{at:0,value:.6},{at:2,value:1},{at:4,value:.6}]}]}}
 });}
export function free2DProject(){
 const p=demoProject();p.title='Der Vogel über der Stadt';p.storyboard=null;
 p.objects2d={bird:{...defaultObject2D(),name:'Blauer Vogel',kind:'custom',model:birdModel2D()}};
 p.stages2d={city:{...defaultStage2DResource(),name:'Stadt mit Bäckerei',preset:'custom',model:cityModel2D()}};
 const actor=defaultActor2D('bird','bird');actor.x=350;actor.y=320;actor.actions=[{...defaultAction2D('play'),clip:'fly',duration:6}];
 p.scenes=p.scenes.slice(0,1);p.scenes[0].elements=[];p.scenes[0].duration=6;p.scenes[0].stage2d={...defaultStage2D('city'),actors:[actor]};
 return p;
}
