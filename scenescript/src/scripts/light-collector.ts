import {createModel2DView} from './model2d-view';
import {Container,Graphics,Text,FillGradient,type ColorSource} from 'pixi.js';
import type {Object2D,Stage2DResource,Actor2D} from '../lib/stage2d';
import type {actorFrame2D} from '../lib/motion2d';
const W=960,H=540,TAU=Math.PI*2;
const rand=(i:number)=>{const x=Math.sin(i*127.1+31.7)*43758.5453;return x-Math.floor(x);};
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const shade=(hex:string,amount:number)=>{const value=parseInt(hex.slice(1),16),target=amount>0?255:0,q=Math.abs(amount);return [16,8,0].reduce((n,shift)=>n+(Math.round(((value>>shift)&255)*(1-q)+target*q)<<shift),0);};
const pulse=(t:number,a:number,b:number)=>Math.sin(clamp((t-a)/(b-a))*Math.PI);
const rect=(parent:Container,x:number,y:number,w:number,h:number,color:ColorSource,r=0)=>{const g=new Graphics();g.roundRect(x,y,w,h,r).fill(color);parent.addChild(g);return g;};
const ellipse=(parent:Container,x:number,y:number,rx:number,ry:number,color:ColorSource)=>{const g=new Graphics().ellipse(x,y,rx,ry).fill(color);parent.addChild(g);return g;};
function star(parent:Container,x:number,y:number,size:number,color:ColorSource){const g=new Graphics();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,r=i%2?size*.28:size; i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath().fill(color);g.position.set(x,y);parent.addChild(g);return g;}
function label(parent:Container,text:string,x:number,y:number,size:number,color:ColorSource,weight:'normal'|'bold'='normal'){const n=new Text({text,style:{fontFamily:'Georgia',fontSize:size,fill:color,fontWeight:weight}});n.position.set(x,y);if(n.width>680)n.scale.set(680/n.width);parent.addChild(n);return n;}
function hill(parent:Container,x:number,y:number,w:number,h:number,color:ColorSource){const g=new Graphics().ellipse(x,y,w,h).fill(color);parent.addChild(g);return g;}

function plant(parent:Container,x:number,y:number,size:number,color:ColorSource,side=1){const root=new Container();
root.position.set(x,y);root.scale.set(size);parent.addChild(root);const stem=new Graphics().moveTo(0,0).quadraticCurveTo(-8*side,-45,8*side,-102).stroke({color,width:3});root.addChild(stem);for(let i=0;i<4;i++){const leaf=new Graphics().moveTo(0,0).bezierCurveTo(-34,-23,-43,8,0,0).fill(color);leaf.position.set((i%2?-1:1)*3,-22-i*19);leaf.rotation=i%2?Math.PI*.12:Math.PI*.95;root.addChild(leaf);}return root;}

export {label};
export function createBackdrop2D(resource:Stage2DResource){
const root=new Container();
if(resource.preset==='custom'&&resource.model){
 const view=createModel2DView(resource.model,resource.groundColor,resource.skyColor),world=new Container();root.addChild(view.root);view.root.addChildAt(world,1);
 return {root,world,draw(t:number,camera:{x:number;y:number;zoom:number},clip='idle'){view.draw(t,[{clip:'idle',time:t},...(clip&&clip!=='idle'?[{clip,time:t}]:[])],camera);world.scale.set(camera.zoom);world.position.set(camera.x-(camera.zoom-1)*480,camera.y-(camera.zoom-1)*270);}};
}
if(resource.preset==='night-garden'){
const night=root;const world=new Container();rect(night,0,0,W,H,resource.skyColor);ellipse(night,750,115,47,47,0xf5e9b4);ellipse(night,765,100,43,43,resource.skyColor);
for(let i=0;i<45;i++)ellipse(night,rand(i+400)*W,40+rand(i+500)*310,i%5===0?2:1,i%5===0?2:1,0xb8d4cb).alpha=.3+rand(i+600)*.6;
hill(night,80,470,420,220,0x21484e);hill(night,800,480,500,270,0x234f50);rect(night,0,439,W,160,resource.groundColor);
const nightPlants:Container[]=[];for(let i=0;i<16;i++)nightPlants.push(plant(night,i*70-30,480,.8+rand(i+700)*.6,i%2?0x467b70:0x315e5c));
const fireflies:Container[]=[];for(let i=0;i<32;i++){const c=new Container();ellipse(c,0,0,8,8,0xe5edba).alpha=.06;ellipse(c,0,0,2,2,0xe5edba);night.addChild(c);fireflies.push(c);}

root.addChild(world);return {root,world,draw(t:number,camera:{x:number;y:number;zoom:number}){world.scale.set(camera.zoom);world.position.set(camera.x-(camera.zoom-1)*432,camera.y-(camera.zoom-1)*378);for(let i=0;i<fireflies.length;i++){const a=rand(i+1200);fireflies[i].position.set(55+a*850+Math.sin(t*.5+i)*18,110+rand(i+1300)*330+Math.cos(t*.7+i)*12);fireflies[i].alpha=.25+.75*Math.sin(t*1.4+i)**2;}for(let i=0;i<nightPlants.length;i++)nightPlants[i].rotation=Math.sin(t*1.2+i)*.025;}};
}
const sky=new Graphics().rect(0,0,W,H).fill(new FillGradient({type:'linear',start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:resource.skyColor},{offset:1,color:'#a5c3a0'}]}));root.addChild(sky);
ellipse(root,755,114,52,52,0xe1e6b2);ellipse(root,755,114,75,75,0xe1e6b2).alpha=.06;
const far=new Container(),middle=new Container(),world=new Container(),foreground=new Container();root.addChild(far,middle,world,foreground);
hill(far,90,403,360,170,0x537f68);hill(far,650,430,450,210,0x648e72);hill(middle,10,465,430,160,0x396e5c);hill(middle,880,455,380,200,0x477b60);
for(let i=0;i<9;i++){const x=-130+i*155;rect(middle,x,100+rand(i)*100,12+rand(i+3)*12,360,0x346354,8);ellipse(middle,x+10,130+rand(i+30)*55,50+rand(i+31)*35,95+rand(i+32)*50,0x386e58).alpha=.8;}
rect(world,-900,424,2900,300,resource.groundColor,30);rect(world,-900,424,2900,4,0x84a27b);
const path=new Graphics().moveTo(-100,462).bezierCurveTo(160,430,430,460,1020,448).stroke({color:0x406b55,width:20});world.addChild(path);
const plants:Container[]=[];for(let i=0;i<13;i++)plants.push(plant(world,-120+i*110,429,.5+rand(i+44)*.5,i%2?0x537e59:0x719265));
const rocks:Graphics[]=[];for(let i=0;i<10;i++){const r=ellipse(world,-20+i*125,446+rand(i+100)*24,10+rand(i+80)*12,4,0x173f38);rocks.push(r);}
for(const [i,x] of [-90,75,790,1030].entries())plants.push(plant(foreground,x,565,1.7,i%2?0x193f35:0x163b34));

return {root,world,draw(t:number,camera:{x:number;y:number;zoom:number}){const zoom=camera.zoom;world.scale.set(zoom);world.position.set(camera.x-(zoom-1)*432,camera.y-(zoom-1)*378);far.x=camera.x*.12;middle.x=camera.x*.4;foreground.x=camera.x*1.35;for(let i=0;i<plants.length;i++)plants[i].rotation=Math.sin(t*1.6+i)*.035;}};
}
export function createObjectView2D(resource:Object2D,instance:Actor2D){
const host=new Container(),node=new Container();host.addChild(node);const color=instance.color??resource.color;
let hand:Container|undefined;let animate:(frame:ReturnType<typeof actorFrame2D>,t:number)=>void=()=>{};
if(resource.kind==='custom'&&resource.model){
 const view=createModel2DView(resource.model,color,resource.accentColor);node.addChild(view.root);
 const anchor=view.nodes.get('hand');if(anchor){hand=new Container();hand.y=-29;anchor.addChild(hand);}
 animate=(_,t)=>{const actions=instance.actions.filter(a=>t>=a.at&&t<=a.at+a.duration&&Object.hasOwn(resource.model!.animations,a.clip||a.type)).sort((a,b)=>a.at-b.at);view.draw(t,[{clip:'idle',time:t},...actions.map(a=>({clip:a.clip||a.type,time:t-a.at}))]);};
}else if(resource.kind==='robot'){
const light=shade(color,.32),dark=shade(color,-.14),handColor=shade(color,.45);
const shadow=ellipse(node,0,0,40,8,0x10382f);shadow.alpha=.35;
// A small articulated puppet. Each limb is a transform hierarchy, not a single image.
const robot=new Container();node.addChild(robot);
function leg(x:number){const hip=new Container();hip.position.set(x,-50);robot.addChild(hip);rect(hip,-8,0,16,30,0x485e60,7);const shin=new Container();shin.position.set(0,25);hip.addChild(shin);rect(shin,-7,0,14,23,0xa2b1a1,6);rect(shin,-10,17,29,12,0x203c3d,6);return {hip,shin};}
const leftLeg=leg(-17),rightLeg=leg(17);
const torso=new Container();robot.addChild(torso);rect(torso,-36,-119,72,77,color,22);rect(torso,-27,-112,54,10,light,5);rect(torso,-26,-59,52,13,dark,6);
ellipse(torso,0,-86,11,11,0x244b47);ellipse(torso,0,-86,5,5,resource.accentColor);
function arm(x:number){const shoulder=new Container();shoulder.position.set(x,-108);torso.addChild(shoulder);ellipse(shoulder,0,0,10,10,dark);rect(shoulder,-7,0,14,32,color,7);const fore=new Container();fore.position.set(0,28);shoulder.addChild(fore);rect(fore,-6,0,12,29,color,6);ellipse(fore,0,29,10,10,handColor);return {shoulder,fore};}
const armL=arm(-38),armR=arm(38);
rect(torso,-10,-137,20,23,0x495f5c,4);
const head=new Container();head.position.set(0,-149);torso.addChild(head);
rect(head,-47,-36,94,65,color,23);rect(head,-38,-28,76,45,0x214c49,16);
const eyeL=ellipse(head,-17,-6,5,7,0xf1f4cf),eyeR=ellipse(head,17,-6,5,7,0xf1f4cf);
const mouth=new Graphics().moveTo(-7,7).quadraticCurveTo(0,13,7,7).stroke({color:0xa7cab1,width:2});head.addChild(mouth);
const antenna=new Container();antenna.position.set(0,-35);head.addChild(antenna);rect(antenna,-2,-22,4,23,0x31544c,2);ellipse(antenna,0,-23,6,6,resource.accentColor);

hand=armR.fore;
const thought=new Container();node.addChild(thought);ellipse(thought,0,0,18,21,0xe5edcf);label(thought,'?',-7,-17,26,0x2a6152);
animate=(frame,t)=>{const {walk,phase,flight,pre,landing,wave}=frame;
robot.rotation=.035*Math.sin(phase)*walk-.08*flight;
 const stretch=frame.stretch;robot.scale.set(1-stretch*.6,1+stretch);
 leftLeg.hip.rotation=Math.sin(phase)*.48*walk+.3*flight;rightLeg.hip.rotation=-Math.sin(phase)*.48*walk-.5*flight;
 leftLeg.shin.rotation=Math.max(0,-Math.sin(phase))*.6*walk+.5*flight;rightLeg.shin.rotation=Math.max(0,Math.sin(phase))*.6*walk+.8*flight;

 armL.shoulder.rotation=-.18-Math.sin(phase)*.4*walk+.35*pre-.5*flight;armL.fore.rotation=-.15-.4*flight;
 armR.shoulder.rotation=.15+Math.sin(phase)*.4*walk-wave*2.35+pre*.5-flight*2.25;
 armR.fore.rotation=-.15-wave*(.45+Math.sin(frame.wavePhase)*.35)-flight*.45;
 torso.rotation=.018*Math.sin(t*2.5)*(1-walk);head.rotation=-.12*wave+.08*Math.sin(t*2)*wave+.09*landing;
 head.y=-149+Math.sin(t*2.5)*1.2-pre*1.5;antenna.rotation=.13*Math.sin(t*5)*walk+.2*landing;
 const blink=1-.92*pulse(t%4.8,3.85,4.03);eyeL.scale.y=eyeR.scale.y=blink;eyeL.x=-17+wave*2;eyeR.x=17+wave*2;

shadow.y=frame.groundY-frame.y;shadow.scale.set(1-flight*.45,1-flight*.25);shadow.alpha=.32-flight*.18;
thought.position.set(67,-214);thought.alpha=frame.question;
};
}else if(resource.kind==='spark'){
for(let i=0;i<3;i++)ellipse(node,0,0,36-i*9,36-i*9,color).alpha=.045+i*.035;
const starView=star(node,0,0,15,color);ellipse(node,0,0,4,4,0xffffff);
const orbit:Graphics[]=[];for(let i=0;i<7;i++)orbit.push(ellipse(node,0,0,2,2,resource.accentColor));
animate=(_,t)=>{starView.rotation=t*.4;node.scale.set(instance.scale*(1+.08*Math.sin(t*3)));for(let i=0;i<orbit.length;i++){const a=t*.7+i*TAU/7;orbit[i].position.set(Math.cos(a)*35,Math.sin(a)*17);orbit[i].alpha=.25+.3*Math.sin(t*2+i)**2;}};
}else{
if(resource.shape==='star')star(node,0,0,30,color);else if(resource.shape==='ellipse')ellipse(node,0,0,30,30,color);else rect(node,-30,-30,60,60,color,8);
}
const particles=new Container();host.addChild(particles);const dust:Graphics[]=[];for(let i=0;i<42;i++)dust.push(star(particles,0,0,2+rand(i+300)*3,resource.accentColor));
return {host,node,hand,draw(frame:ReturnType<typeof actorFrame2D>,t:number){node.position.set(frame.x,frame.y);node.scale.set(instance.scale);node.rotation=instance.rotation*Math.PI/180;node.alpha=frame.opacity;animate(frame,t);},burst(origin:{x:number;y:number},age:number){particles.position.set(origin.x,origin.y);for(let i=0;i<dust.length;i++){const life=1.5+rand(i+800),p=clamp(age/life),a=rand(i+900)*TAU,speed=35+rand(i+1000)*120;dust[i].visible=age>=0&&p<1;dust[i].position.set(Math.cos(a)*speed*age,Math.sin(a)*speed*age+45*age*age);dust[i].alpha=(1-p)**2;dust[i].rotation=age*(rand(i+1100)*3-1.5);}}};
}
