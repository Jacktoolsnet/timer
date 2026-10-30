import {Container,Graphics,Text,FillGradient,BlurFilter} from 'pixi.js';
import {poseClipsModel2D,poseModel2D,type Model2D,type Paint2D} from '../lib/model2d';
/** Render only the validated vector vocabulary. No eval, HTML, external URLs or SVG strings. */
export function createModel2DView(model:Model2D,color='#79a8cb',accent='#fff5c0'){
 const root=new Container(),background=new Container(),foreground=new Container(),nodes=new Map<string,Container>();root.addChild(background,foreground);
 background.position.set(-model.originX,-model.originY);foreground.position.copyFrom(background.position);
 const paint=(value:Paint2D)=>value==='$color'?color:value==='$accent'?accent:value;
 for(const part of model.parts){
  const node=new Container();node.label=part.id;node.pivot.set(part.pivotX,part.pivotY);nodes.set(part.id,node);
  if(part.shape==='text'){
   const lines=part.text.split('\n'),size=Math.max(.25,Math.min(part.fontSize,part.width/(Math.max(1,...lines.map(s=>s.length))*1.2),part.height/(lines.length*1.5)));
   const label=new Text({text:part.text,style:{fontFamily:'Arial',fontSize:size,fill:paint(part.fill)??'#000000'}});
   const fit=Math.min(1,part.width/Math.max(1,label.width),part.height/Math.max(1,label.height));label.scale.set(fit);node.addChild(label);
  }
  else if(part.shape!=='group'){
   const geometry=()=>{const g=new Graphics();
   if(part.shape==='rectangle')g.roundRect(0,0,part.width,part.height,Math.min(part.radius,part.width/2,part.height/2));
   else if(part.shape==='ellipse')g.ellipse(part.width/2,part.height/2,part.width/2,part.height/2);
   else if(part.shape==='polygon')g.poly(part.points,true);
   else for(const {op,values:v}of part.path){if(op==='M')g.moveTo(v[0],v[1]);else if(op==='L')g.lineTo(v[0],v[1]);else if(op==='Q')g.quadraticCurveTo(v[0],v[1],v[2],v[3]);else if(op==='C')g.bezierCurveTo(v[0],v[1],v[2],v[3],v[4],v[5]);else g.closePath();}
   return g;};
   if(part.shadow){const shadow=geometry(),s=part.shadow;shadow.fill(s.color);shadow.alpha=s.opacity;shadow.position.set(s.x,s.y);if(s.blur)shadow.filters=[new BlurFilter({strength:s.blur,quality:4})];shadow.once('destroyed',()=>{for(const f of shadow.filters??[])f.destroy();});node.addChild(shadow);}
   const g=geometry(),fill=paint(part.fill),stroke=paint(part.stroke);if(part.gradient){const v=part.gradient,colorStops=v.stops.map(s=>({offset:s.at,color:s.color}));const gradient=new FillGradient(v.type==='linear'?{type:'linear',start:{x:v.x0,y:v.y0},end:{x:v.x1,y:v.y1},colorStops,textureSpace:'local'}:{type:'radial',center:{x:v.x0,y:v.y0},outerCenter:{x:v.x0,y:v.y0},innerRadius:0,outerRadius:Math.hypot(v.x1-v.x0,v.y1-v.y0),colorStops,textureSpace:'local'});g.fill(gradient);g.once('destroyed',()=>gradient.destroy());}else if(fill!==null)g.fill(fill);if(stroke!==null&&part.strokeWidth>0)g.stroke({color:stroke,width:part.strokeWidth,cap:'round',join:'round'});if(part.blur)g.filters=[new BlurFilter({strength:part.blur,quality:4})];g.once('destroyed',()=>{for(const f of g.filters??[])f.destroy();});g.blendMode=part.blend??'normal';node.addChild(g);
  }
 }
 for(const part of model.parts)(part.parent?nodes.get(part.parent)!:part.layer==='foreground'?foreground:background).addChild(nodes.get(part.id)!);
 return {root,nodes,draw(time:number,clip:string|null|{clip:string;time:number}[]='idle',camera?:{x:number;y:number;zoom:number}){
  const pose=Array.isArray(clip)?poseClipsModel2D(model,clip):poseModel2D(model,clip,time);
  for(const part of model.parts){
   const node=nodes.get(part.id)!,p=pose.get(part.id)!;node.position.set(p.x,p.y);node.angle=p.rotation;node.scale.set(p.scaleX,p.scaleY);node.alpha=p.opacity;
   if(camera&&!part.parent){node.x=p.x*camera.zoom+camera.x*part.parallax-(camera.zoom-1)*model.width/2;node.y=p.y*camera.zoom+camera.y*part.parallax-(camera.zoom-1)*model.height/2;node.scale.set(p.scaleX*camera.zoom,p.scaleY*camera.zoom);}
  }
 }};
}
