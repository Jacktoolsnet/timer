import {Container,Graphics,Text,FillGradient,type ColorSource} from 'pixi.js';
import type {Stage2D} from '../lib/stage2d';
const W=960,H=540,DURATION=16,TAU=Math.PI*2;
const clamp=(x:number,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
const between=(t:number,a:number,b:number)=>smooth((t-a)/(b-a));
const pulse=(t:number,a:number,b:number)=>Math.sin(clamp((t-a)/(b-a))*Math.PI);
const spring=(t:number)=>t<=0?0:1-Math.exp(-6*t)*Math.cos(12*t);
const rand=(i:number)=>{const x=Math.sin(i*127.1+31.7)*43758.5453;return x-Math.floor(x);};
/** Reusable preset rig: no DOM, ticker, network, wall-clock or accumulated physics. */
export function createLightCollector(shot:Stage2D,duration:number){
const root=new Container();
const texts:Text[]=[];
const rect=(parent:Container,x:number,y:number,w:number,h:number,color:ColorSource,r=0)=>{const g=new Graphics();g.roundRect(x,y,w,h,r).fill(color);parent.addChild(g);return g;};
const ellipse=(parent:Container,x:number,y:number,rx:number,ry:number,color:ColorSource)=>{const g=new Graphics().ellipse(x,y,rx,ry).fill(color);parent.addChild(g);return g;};
function star(parent:Container,x:number,y:number,size:number,color:ColorSource){const g=new Graphics();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,r=i%2?size*.28:size; i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath().fill(color);g.position.set(x,y);parent.addChild(g);return g;}
function label(parent:Container,text:string,x:number,y:number,size:number,color:ColorSource,weight:'normal'|'bold'='normal'){const n=new Text({text,style:{fontFamily:'Georgia',fontSize:size,fill:color,fontWeight:weight}});texts.push(n);n.position.set(x,y);if(n.width>680)n.scale.set(680/n.width);parent.addChild(n);return n;}
const sky=new Graphics().rect(0,0,W,H).fill(new FillGradient({type:'linear',start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:'#205a50'},{offset:1,color:'#a5c3a0'}]}));root.addChild(sky);
ellipse(root,755,114,52,52,0xe1e6b2);ellipse(root,755,114,75,75,0xe1e6b2).alpha=.06;
const far=new Container(),middle=new Container(),world=new Container(),foreground=new Container();root.addChild(far,middle,world,foreground);
function hill(parent:Container,x:number,y:number,w:number,h:number,color:ColorSource){const g=new Graphics().ellipse(x,y,w,h).fill(color);parent.addChild(g);return g;}
hill(far,90,403,360,170,0x537f68);hill(far,650,430,450,210,0x648e72);hill(middle,10,465,430,160,0x396e5c);hill(middle,880,455,380,200,0x477b60);
function plant(parent:Container,x:number,y:number,size:number,color:ColorSource,side=1){const root=new Container();
const texts:Text[]=[];root.position.set(x,y);root.scale.set(size);parent.addChild(root);const stem=new Graphics().moveTo(0,0).quadraticCurveTo(-8*side,-45,8*side,-102).stroke({color,width:3});root.addChild(stem);for(let i=0;i<4;i++){const leaf=new Graphics().moveTo(0,0).bezierCurveTo(-34,-23,-43,8,0,0).fill(color);leaf.position.set((i%2?-1:1)*3,-22-i*19);leaf.rotation=i%2?Math.PI*.12:Math.PI*.95;root.addChild(leaf);}return root;}
for(let i=0;i<9;i++){const x=-130+i*155;rect(middle,x,100+rand(i)*100,12+rand(i+3)*12,360,0x346354,8);ellipse(middle,x+10,130+rand(i+30)*55,50+rand(i+31)*35,95+rand(i+32)*50,0x386e58).alpha=.8;}
rect(world,-900,424,2900,300,0x244e43,30);rect(world,-900,424,2900,4,0x84a27b);
const path=new Graphics().moveTo(-100,462).bezierCurveTo(160,430,430,460,1020,448).stroke({color:0x406b55,width:20});world.addChild(path);
const plants:Container[]=[];for(let i=0;i<13;i++)plants.push(plant(world,-120+i*110,429,.5+rand(i+44)*.5,i%2?0x537e59:0x719265));
const rocks:Graphics[]=[];for(let i=0;i<10;i++){const r=ellipse(world,-20+i*125,446+rand(i+100)*24,10+rand(i+80)*12,4,0x173f38);rocks.push(r);}
const shadow=ellipse(world,250,429,40,8,0x10382f);shadow.alpha=.35;
// A small articulated puppet. Each limb is a transform hierarchy, not a single image.
const robot=new Container();world.addChild(robot);
function leg(x:number){const hip=new Container();hip.position.set(x,-50);robot.addChild(hip);rect(hip,-8,0,16,30,0x485e60,7);const shin=new Container();shin.position.set(0,25);hip.addChild(shin);rect(shin,-7,0,14,23,0xa2b1a1,6);rect(shin,-10,17,29,12,0x203c3d,6);return {hip,shin};}
const leftLeg=leg(-17),rightLeg=leg(17);
const torso=new Container();robot.addChild(torso);rect(torso,-36,-119,72,77,shot.bodyColor,22);rect(torso,-27,-112,54,10,0xffb698,5);rect(torso,-26,-59,52,13,0xd56d5d,6);
ellipse(torso,0,-86,11,11,0x244b47);ellipse(torso,0,-86,5,5,0xe6e9bb);
function arm(x:number){const shoulder=new Container();shoulder.position.set(x,-108);torso.addChild(shoulder);ellipse(shoulder,0,0,10,10,0xd56d5d);rect(shoulder,-7,0,14,32,shot.bodyColor,7);const fore=new Container();fore.position.set(0,28);shoulder.addChild(fore);rect(fore,-6,0,12,29,shot.bodyColor,6);ellipse(fore,0,29,10,10,0xffc1a0);return {shoulder,fore};}
const armL=arm(-38),armR=arm(38);
rect(torso,-10,-137,20,23,0x495f5c,4);
const head=new Container();head.position.set(0,-149);torso.addChild(head);
rect(head,-47,-36,94,65,shot.bodyColor,23);rect(head,-38,-28,76,45,0x214c49,16);
const eyeL=ellipse(head,-17,-6,5,7,0xf1f4cf),eyeR=ellipse(head,17,-6,5,7,0xf1f4cf);
const mouth=new Graphics().moveTo(-7,7).quadraticCurveTo(0,13,7,7).stroke({color:0xa7cab1,width:2});head.addChild(mouth);
const antenna=new Container();antenna.position.set(0,-35);head.addChild(antenna);rect(antenna,-2,-22,4,23,0x31544c,2);ellipse(antenna,0,-23,6,6,0xf4e9a3);
const sparkRoot=new Container();world.addChild(sparkRoot);for(let i=0;i<3;i++)ellipse(sparkRoot,0,0,36-i*9,36-i*9,0xf8edb1).alpha=.045+i*.035;const spark=star(sparkRoot,0,0,15,shot.accentColor);ellipse(sparkRoot,0,0,4,4,0xffffff);
const orbit:Graphics[]=[];for(let i=0;i<7;i++)orbit.push(ellipse(world,0,0,2,2,i%2?0xffe9a4:0xcbe9b0));
const dust:Graphics[]=[];for(let i=0;i<42;i++){const p=star(world,0,0,2+rand(i+300)*3, i%3?0xffedb5:0xf9ad86);dust.push(p);}
const thought=new Container();world.addChild(thought);ellipse(thought,0,0,18,21,0xe5edcf);label(thought,'?',-7,-17,26,0x2a6152);
const night=new Container();root.addChild(night);rect(night,0,0,W,H,0x132d39);ellipse(night,750,115,47,47,0xf5e9b4);ellipse(night,765,100,43,43,0x132d39);
for(let i=0;i<45;i++)ellipse(night,rand(i+400)*W,40+rand(i+500)*310,i%5===0?2:1,i%5===0?2:1,0xb8d4cb).alpha=.3+rand(i+600)*.6;
hill(night,80,470,420,220,0x21484e);hill(night,800,480,500,270,0x234f50);rect(night,0,439,W,160,0x183c40);
const nightPlants:Container[]=[];for(let i=0;i<16;i++)nightPlants.push(plant(night,i*70-30,480,.8+rand(i+700)*.6,i%2?0x467b70:0x315e5c));
const fireflies:Container[]=[];for(let i=0;i<32;i++){const c=new Container();ellipse(c,0,0,8,8,0xe5edba).alpha=.06;ellipse(c,0,0,2,2,0xe5edba);night.addChild(c);fireflies.push(c);}
const ending=new Container();night.addChild(ending);label(ending,shot.endingTitle,94,154,39,0xe7eed9);label(ending,shot.endingSubtitle,94,202,45,0xffd6a5);const underline=new Graphics().moveTo(96,264).bezierCurveTo(185,256,271,271,357,260).stroke({color:0xf7b89a,width:2});ending.addChild(underline);label(ending,'GESTIK  /  GEWICHT  /  ATMOSPHÄRE',98,289,12,0x91b7ac);
const nightMask=new Graphics();night.addChild(nightMask);night.mask=nightMask;
for(const [i,x] of [-90,75,790,1030].entries())plants.push(plant(foreground,x,565,1.7,i%2?0x193f35:0x163b34));
let debug={} as {time:number;x:number;y:number;zoom:number;wave:number;flight:number;stretch:number;reveal:number;rightShoulder:number;handX:number;handY:number;handDistance:number};
let burstOrigin={x:580,y:170};
function renderAt(time:number){const t=clamp(time*16/duration,0,DURATION),walkEnd=3.6,walk=shot.walk?1-between(t,3,walkEnd):0,phase=t*8.7;
 const travel=shot.walk?between(t,.2,walkEnd):1;let x=mix(145,470,travel),y=425;
 const pre=shot.jump?pulse(t,6.6,7.3):0,flight=shot.jump?pulse(t,7.3,8.6):0,landing=shot.jump&&t>=8.6?Math.exp(-7*(t-8.6))*Math.sin(17*(t-8.6)):0;
 x+=shot.jump?92*between(t,7.3,8.6):0;y-=flight*shot.jumpHeight;y+=pre*12+landing*11;
 const zoom=shot.cameraMotion?1+.12*between(t,3.6,6.2)-.08*between(t,9.5,11.2):1;const camX=shot.cameraMotion?-65*travel-26*between(t,4.5,6.5):0;
 world.scale.set(zoom);world.position.set(camX-(zoom-1)*W*.45,-(zoom-1)*H*.7);
 far.x=camX*.12;middle.x=camX*.4;foreground.x=camX*1.35;
 robot.position.set(x,y-Math.abs(Math.sin(phase))*5*walk);robot.rotation=.035*Math.sin(phase)*walk-.08*flight;
 const stretch=flight*.13-pre*.16-landing*.1;robot.scale.set(1-stretch*.6,1+stretch);
 leftLeg.hip.rotation=Math.sin(phase)*.48*walk+.3*flight;rightLeg.hip.rotation=-Math.sin(phase)*.48*walk-.5*flight;
 leftLeg.shin.rotation=Math.max(0,-Math.sin(phase))*.6*walk+.5*flight;rightLeg.shin.rotation=Math.max(0,Math.sin(phase))*.6*walk+.8*flight;
 const wave=shot.wave?between(t,4.1,4.65)*(1-between(t,5.9,6.4)):0;
 armL.shoulder.rotation=-.18-Math.sin(phase)*.4*walk+.35*pre-.5*flight;armL.fore.rotation=-.15-.4*flight;
 armR.shoulder.rotation=.15+Math.sin(phase)*.4*walk-wave*2.35+pre*.5-flight*2.25;
 armR.fore.rotation=-.15-wave*(.45+Math.sin((t-4.4)*14)*.35)-flight*.45;
 torso.rotation=.018*Math.sin(t*2.5)*(1-walk);head.rotation=-.12*between(t,3.7,4.4)+.08*Math.sin(t*2)*wave+.09*landing;
 head.y=-149+Math.sin(t*2.5)*1.2-pre*1.5;antenna.rotation=.13*Math.sin(t*5)*walk+.2*Math.exp(-Math.max(0,t-8.6)*3)*Math.sin(Math.max(0,t-8.6)*19);
 const blink=1-.92*pulse(t,3.85,4.03)-.92*pulse(t,10.1,10.28);eyeL.scale.y=eyeR.scale.y=blink;eyeL.x=-17+between(t,3.5,4.4)*2;eyeR.x=17+between(t,3.5,4.4)*2;
 shadow.x=x;shadow.scale.set(1-flight*.45,1-flight*.25);shadow.alpha=.32-flight*.18;
 const hand=world.toLocal(armR.fore.toGlobal({x:0,y:29}));
 const catchT=shot.jump?between(t,7.65,8.05):0;sparkRoot.position.set(mix(610,hand.x,catchT),mix(220+Math.sin(t*2)*9,hand.y,catchT));sparkRoot.alpha=1-between(t,9.3,10.7);sparkRoot.scale.set(1+.08*Math.sin(t*3));spark.rotation=t*.4;
 thought.position.set(x+67,y-214);thought.alpha=between(t,3.65,3.9)*(1-between(t,4.4,4.7));thought.scale.set(.7+.3*spring(Math.max(0,t-3.65)));
 for(let i=0;i<plants.length;i++)plants[i].rotation=Math.sin(t*1.6+i)*.035;
 for(let i=0;i<orbit.length;i++){const a=t*.7+i*TAU/7;orbit[i].position.set(sparkRoot.x+Math.cos(a)*35,sparkRoot.y+Math.sin(a)*17);orbit[i].alpha=(.25+.3*Math.sin(t*2+i)**2)*sparkRoot.alpha;}
 for(let i=0;i<dust.length;i++){const age=t-8.05,life=1.5+rand(i+800),p=clamp(age/life);dust[i].visible=shot.jump&&age>=0&&p<1;const a=rand(i+900)*TAU,speed=35+rand(i+1000)*120;dust[i].position.set(burstOrigin.x+Math.cos(a)*speed*age,burstOrigin.y+Math.sin(a)*speed*age+45*age*age);dust[i].alpha=(1-p)**2;dust[i].rotation=t*(rand(i+1100)*3-1.5);}
 const reveal=shot.night?between(t,10.6,12.4):0;nightMask.clear().circle(550,290,Math.max(.01,reveal*1150)).fill(0xffffff);night.visible=reveal>0;
 ending.alpha=between(t,12.1,13.3);ending.y=12*(1-between(t,12.1,13.3));
 for(let i=0;i<fireflies.length;i++){const a=rand(i+1200);fireflies[i].position.set(55+a*850+Math.sin(t*.5+i)*18,110+rand(i+1300)*330+Math.cos(t*.7+i)*12);fireflies[i].alpha=.25+.75*Math.sin(t*1.4+i)**2;}
 for(let i=0;i<nightPlants.length;i++)nightPlants[i].rotation=Math.sin(t*1.2+i)*.025;
 debug={time:t,x,y,zoom,wave,flight,stretch,reveal,rightShoulder:armR.shoulder.rotation,handX:hand.x,handY:hand.y,handDistance:Math.hypot(hand.x-sparkRoot.x,hand.y-sparkRoot.y)};return debug;
}
renderAt(8.05*duration/16);burstOrigin={x:debug.handX,y:debug.handY};
return {root,draw:renderAt,setResolution(resolution:number){for(const text of texts)text.resolution=Math.max(1,resolution);}};
}
