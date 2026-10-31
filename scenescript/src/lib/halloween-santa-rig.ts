import {defaultPart2D,parseModel2D,type Part2D,type Model2D} from './model2d.ts';
export type SantaRigImage={name:string;data:string;width:number;height:number};
export type SantaMouthKey={at:number;value:number};
const p=(id:string,shape:Part2D['shape'],extra:Partial<Part2D>={}):Part2D=>({...defaultPart2D(id),shape,fill:null,...extra});
const group=(id:string,extra:Partial<Part2D>={})=>p(id,'group',extra);
const track=(part:string,property:'x'|'y'|'rotation'|'scaleY'|'opacity',frames:[number,number][])=>({part,property,keys:frames.map(([at,value])=>({at,value,easing:'smooth' as const}))});
const path=(id:string,commands:[string,number[]][],extra:Partial<Part2D>={})=>p(id,'path',{path:commands.map(([op,values])=>({op:op as 'M'|'L'|'Q'|'C'|'Z',values})),...extra});
const glow=(id:string,x:number,y:number,width:number,height:number,color:string,opacity:number,parent:string|null=null)=>p(id,'ellipse',{parent,x,y,width,height,fill:'#000000',blend:'screen',opacity,gradient:{type:'radial',x0:.5,y0:.5,x1:1,y1:.5,stops:[{at:0,color},{at:1,color:'#000000'}]}});
/** Stationary sleigh; separately articulated deer, greeting arm, eyelids and audio-keyed mouth. */
export function santaRig(sleigh:SantaRigImage,deer:SantaRigImage,arm:SantaRigImage,upperLeg:SantaRigImage,lowerLeg:SantaRigImage,voiceDuration:number,mouth:SantaMouthKey[]):Model2D{
 const speechKeys=mouth.length?mouth:[{at:0,value:.08},{at:voiceDuration,value:.08}];
 const parts:Part2D[]=[],idle:Model2D['animations'][string]['tracks']=[];
 function reindeer(id:string,x:number,y:number,scale:number,phase:number){
  parts.push(group(id,{x,y,scaleX:scale,scaleY:scale}));
  idle.push(track(id,'y',[[0,y],[.625,y-2],[1.25,y],[1.875,y+2],[2.5,y]]));
  for(let i=0;i<4;i++){
   const leg=id+'-leg-'+i,fore=i<2,far=i%2===0,hipX=(fore?66:150)+(far?-5:5),hipY=fore?107:110,sign=(i+phase)%2?-1:1;
   parts.push(group(leg,{parent:id,x:hipX,y:hipY,opacity:far?.85:1}),p(leg+'-fur','sprite',{parent:leg,image:'upper-leg',x:-27,y:0,width:40,height:33}),group(leg+'-knee',{parent:leg,x:-2,y:27}),p(leg+'-shin','sprite',{parent:leg+'-knee',image:'lower-leg',x:-25,y:0,width:40,height:33}));
   idle.push(track(leg,'rotation',[[0,sign*13],[.625,-sign*17],[1.25,sign*13],[1.875,-sign*17],[2.5,sign*13]]),track(leg+'-knee','rotation',[[0,sign*7],[.625,sign>0?23:-9],[1.25,sign*7],[1.875,sign>0?23:-9],[2.5,sign*7]]));
  }
  // Fur edge overlaps the leg roots; legs were not baked into the body artwork.
  parts.push(p(id+'-body','sprite',{parent:id,image:'deer',width:185,height:185*deer.height/deer.width}),glow(id+'-nose',1,40,32,28,'#ff3425',.15,id));
  idle.push(track(id+'-nose','opacity',[[0,.12],[1.25,.3],[2.5,.12]]));
 }
 reindeer('rear-deer',96,134,.76,1);
 for(let i=0;i<3;i++)parts.push(path('reins-'+i,[['M',[150,171+i*13]],['Q',[115,194+i*8,i===2?83:161,i===2?244:203+i*3]]],{stroke:i%2?'#d9ac4d':'#ffe0a0',strokeWidth:1.3}));
 parts.push(glow('sleigh-light',172,327,300,65,'#d4a147',.14),p('sleigh-art','sprite',{image:'sleigh',x:150,y:30,width:350,height:350*sleigh.height/sleigh.width}));
 reindeer('lead-deer',3,154,1,0);
 // Attachment point is the red shoulder. The former resting forearm was removed
 // from the base image; this really is a separately moving arm, not a third hand.
 parts.push(group('santa-wave',{x:368,y:123}),p('waving-arm-art','sprite',{parent:'santa-wave',image:'arm',x:-15,y:-90,width:120,height:120*arm.height/arm.width}));
 idle.push(track('santa-wave','rotation',[[0,3],[.625,-3],[1.25,3],[1.875,-3],[2.5,3]]));
 for(const [id,x,y]of [['left',324.8,80],['right',340.4,82.2]] as const){
  parts.push(group('lid-'+id,{x,y,opacity:0}),path('lid-'+id+'-skin',[['M',[-5.7,0]],['Q',[0,-7.5,5.7,0]],['Q',[0,7.5,-5.7,0]],['Z',[]]],{parent:'lid-'+id,fill:'#e6ac8a',blur:.35,gradient:{type:'linear',x0:0,y0:0,x1:0,y1:1,stops:[{at:0,color:'#edbea0'},{at:1,color:'#d9997d'}]}}),path('lid-'+id+'-edge',[['M',[-4.8,.2]],['Q',[0,2.1,4.8,.2]]],{parent:'lid-'+id,stroke:'#985f47',strokeWidth:.7}));
  idle.push(track('lid-'+id,'opacity',[[0,0],[1.78,0],[1.88,1],[1.99,1],[2.1,0],[2.5,0]]));
 }
 parts.push(group('santa-brows',{x:333,y:74,opacity:.7}),path('eyebrows',[['M',[-13,-1]],['Q',[-7,-4,-2,-1]],['M',[3,1]],['Q',[8,-1,13,2]]],{parent:'santa-brows',stroke:'#fff4df',strokeWidth:1.2}),group('santa-mouth',{x:327,y:96.5,scaleY:.08}),p('mouth-lip','ellipse',{parent:'santa-mouth',x:-5.4,y:-2.8,width:10.8,height:6,fill:'#b87562'}),p('mouth-cavity','ellipse',{parent:'santa-mouth',x:-4.5,y:-2.1,width:9,height:5.2,fill:'#49252a',gradient:{type:'linear',x0:0,y0:0,x1:0,y1:1,stops:[{at:0,color:'#311a20'},{at:1,color:'#784047'}]}}),p('mouth-teeth','rectangle',{parent:'santa-mouth',x:-3.4,y:-1.7,width:6.8,height:1.1,radius:.5,fill:'#fff0d5'}),p('mouth-tongue','ellipse',{parent:'santa-mouth',x:-2.8,y:.9,width:5.6,height:1.2,fill:'#c57c79',opacity:.6}));
 idle.push(track('santa-brows','y',[[0,74],[1.25,73.5],[2.5,74]]),track('sleigh-light','opacity',[[0,.12],[1.25,.2],[2.5,.12]]));
 for(let i=0;i<7;i++){const id='sleigh-glint-'+i;parts.push(glow(id,215+i*35,290+i%3*27,8,8,'#ffe7a2',.3));idle.push(track(id,'opacity',[[0,.05],[.3+i*.2,.6],[2.5,.05]]));}
 const greeting:[number,number][]=[[0,3],[.45,-12],[.9,9],[1.35,-10],[1.8,9],[2.25,-10],[2.7,8],[3.15,-9],[3.6,8],[4.05,-10],[4.5,9],[4.95,-9],[5.4,7],[5.85,-8],[6.3,7],[7,3]];
 return parseModel2D({width:500,height:400,originX:250,originY:200,images:{sleigh:{name:sleigh.name,data:sleigh.data},deer:{name:deer.name,data:deer.data},arm:{name:arm.name,data:arm.data},'upper-leg':{name:upperLeg.name,data:upperLeg.data},'lower-leg':{name:lowerLeg.name,data:lowerLeg.data}},parts,animations:{idle:{duration:2.5,loop:true,tracks:idle},laugh:{duration:voiceDuration,loop:false,tracks:[{part:'santa-mouth',property:'scaleY',keys:speechKeys.map(k=>({...k,easing:'linear' as const}))},track('santa-brows','y',[[0,74],[voiceDuration*.2,72.8],[voiceDuration*.72,73],[voiceDuration,74]])]},greet:{duration:7,loop:false,tracks:[track('santa-wave','rotation',greeting),track('santa-brows','y',[[0,74],[1,73],[3.5,73.5],[7,74]])]}}});
}
