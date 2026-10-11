import {displayElementMatrix} from './groups.ts';
import {animationState,type Element,type Scene} from './model.ts';
import type {Point} from './motion-path.ts';

export type Anchors=Record<string,Point>;
export type Bubble={kind:'speech'|'thought';padding:number;lineHeight:number;tail:{mode:'none'|'manual'|'anchor';target:Point;element:string;anchor:string;base:number|null;width:number;curve:number}};
export function defaultBubble():Bubble{return {kind:'speech',padding:24,lineHeight:1.2,tail:{mode:'manual',target:{x:50,y:150},element:'',anchor:'',base:null,width:36,curve:0}};}
const object=(v:unknown,p:string)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw new Error(p+': expected object');return v as Record<string,unknown>;};
const keys=(o:Record<string,unknown>,allowed:string[],p:string)=>{for(const k of Object.keys(o))if(!allowed.includes(k))throw new Error(p+'.'+k+': unknown field');};
const number=(v:unknown,p:string,min:number,max:number)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(p+': expected number '+min+'–'+max);return v;};
const identifier=(v:unknown,p:string,empty=false)=>{if(typeof v!=='string'||v.length>100||!(empty&&v===''||/^[a-zA-Z0-9_-]+$/.test(v)))throw new Error(p+': invalid identifier');return v;};
function point(v:unknown,p:string,min:number,max:number):Point{const o=object(v,p);keys(o,['x','y'],p);return {x:number(o.x,p+'.x',min,max),y:number(o.y,p+'.y',min,max)};}
export function parseAnchors(v:unknown,p:string):Anchors{
 if(v===undefined)return {};
 const o=object(v,p);if(Object.keys(o).length>16)throw new Error(p+': maximum 16 anchors');
 return Object.fromEntries(Object.entries(o).map(([name,value])=>[identifier(name,p),point(value,p+'.'+name,0,100)]));
}
export function parseBubble(v:unknown,p:string):Bubble|null{
 if(v===undefined||v===null)return null;
 const o=object(v,p),d=defaultBubble();keys(o,Object.keys(d),p);const b={...d,...o};
 if(b.kind!=='speech'&&b.kind!=='thought')throw new Error(p+'.kind: speech, thought');
 const raw=o.tail===undefined?d.tail:object(o.tail,p+'.tail');keys(raw,Object.keys(d.tail),p+'.tail');const tail={...d.tail,...raw};
 if(!['none','manual','anchor'].includes(tail.mode as string))throw new Error(p+'.tail.mode: none, manual, anchor');
 return {kind:b.kind,padding:number(b.padding,p+'.padding',0,500),lineHeight:number(b.lineHeight,p+'.lineHeight',.5,4),tail:{mode:tail.mode as Bubble['tail']['mode'],target:point(tail.target,p+'.tail.target',-1000,1000),element:identifier(tail.element,p+'.tail.element',true),anchor:identifier(tail.anchor,p+'.tail.anchor',true),base:tail.base===null?null:number(tail.base,p+'.tail.base',-360,360),width:number(tail.width,p+'.tail.width',1,500),curve:number(tail.curve,p+'.tail.curve',-1,1)}};
}
export type Matrix={a:number;b:number;c:number;d:number;e:number;f:number};
export function multiplyMatrix(l:Matrix,r:Matrix):Matrix{return {a:l.a*r.a+l.c*r.b,b:l.b*r.a+l.d*r.b,c:l.a*r.c+l.c*r.d,d:l.b*r.c+l.d*r.d,e:l.a*r.e+l.c*r.f+l.e,f:l.b*r.e+l.d*r.f+l.f};}
export function applyMatrix(m:Matrix,p:Point):Point{return {x:m.a*p.x+m.c*p.y+m.e,y:m.b*p.x+m.d*p.y+m.f};}
export function inversePoint(m:Matrix,p:Point):Point{const det=m.a*m.d-m.b*m.c;return {x:(m.d*(p.x-m.e)-m.c*(p.y-m.f))/det,y:(-m.b*(p.x-m.e)+m.a*(p.y-m.f))/det};}
/** Same transform-origin and operation order as the CSS renderer. */
export function elementMatrix(e:Element,time:number,w:number,h:number,duration:number):Matrix{
 const p=animationState(e,time,w,h,duration).pose,angle=p.rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),cx=e.width*w/200,cy=e.height*h/200;
 const a=cos*p.scale,b=sin*p.scale,c=-sin*p.scale,d=cos*p.scale;
 return {a,b,c,d,e:e.x*w/100+cx+p.motionX+cos*p.slideX-sin*p.slideY-a*cx-c*cy,f:e.y*h/100+cy+p.motionY+sin*p.slideX+cos*p.slideY-b*cx-d*cy};
}
export function bubbleTarget(e:Element,s:Scene,time:number,w:number,h:number):Point{
 const tail=e.bubble!.tail;
 if(tail.mode==='anchor'){
  const speaker=s.elements.find(v=>v.id===tail.element),anchor=speaker?.anchors[tail.anchor];
  if(speaker&&anchor){
   const world=applyMatrix(displayElementMatrix(speaker,s,time,w,h),{x:anchor.x*speaker.width*w/10000,y:anchor.y*speaker.height*h/10000});
   return inversePoint(displayElementMatrix(e,s,time,w,h),world);
  }
 }
 return {x:tail.target.x*e.width*w/10000,y:tail.target.y*e.height*h/10000};
}
export function detachAnchor(s:Scene,id:string,anchor:string|undefined,time:number,w:number,h:number){
 for(const e of s.elements)if(e.bubble?.tail.mode==='anchor'&&e.bubble.tail.element===id&&(anchor===undefined||e.bubble.tail.anchor===anchor)){
  const p=bubbleTarget(e,s,time,w,h);e.bubble.tail={...e.bubble.tail,mode:'manual',element:'',anchor:'',target:{x:Math.max(-1000,Math.min(1000,p.x/(e.width*w/10000))),y:Math.max(-1000,Math.min(1000,p.y/(e.height*h/10000)))}};
 }
}
export function renameAnchor(s:Scene,id:string,from:string,to:string){
 if(from===to)return;
 const speaker=s.elements.find(e=>e.id===id)!;Object.defineProperty(speaker.anchors,to,{value:speaker.anchors[from],enumerable:true,writable:true,configurable:true});delete speaker.anchors[from];
 for(const e of s.elements)if(e.bubble?.tail.mode==='anchor'&&e.bubble.tail.element===id&&e.bubble.tail.anchor===from)e.bubble.tail.anchor=to;
}
export type BubbleGeometry={path:string;dots:{x:number;y:number;r:number}[];bounds:{x:number;y:number;width:number;height:number};text:{x:number;y:number;width:number;height:number};tailVisible:boolean};
/** One closed speech outline: the tail replaces a section of the contour. */
export function bubbleGeometry(b:Bubble,w:number,h:number,target:Point):BubbleGeometry{
 const tau=Math.PI*2,center={x:w/2,y:h/2},dx=target.x-center.x,dy=target.y-center.y;
 const contour=(angle:number):Point=>{
  const cos=Math.cos(angle),sin=Math.sin(angle);
  if(b.kind==='thought'){const ripple=1+.055*Math.cos(angle*12);return {x:center.x+w*.46*cos*ripple,y:center.y+h*.46*sin*ripple};}
  return {x:center.x+w/2*Math.sign(cos)*Math.sqrt(Math.abs(cos)),y:center.y+h/2*Math.sign(sin)*Math.sqrt(Math.abs(sin))};
 };
 const inside=b.kind==='thought'?(dx/(w*.49))**2+(dy/(h*.49))**2<=1:(dx/(w/2))**4+(dy/(h/2))**4<=1;
 const tailVisible=b.tail.mode!=='none'&&!inside;
 const angle=b.tail.base===null?Math.atan2(dy/(h/2),dx/(w/2)):b.tail.base*Math.PI/180;
 const points:Point[]=[],dots:BubbleGeometry['dots']=[];
 const delta=Math.min(.55,b.tail.width/Math.max(1,Math.hypot(w*Math.sin(angle),h*Math.cos(angle))));
 const curvePoints=(a:Point,c:Point,z:Point)=>{for(let i=1;i<=16;i++){const t=i/16;points.push({x:(1-t)**2*a.x+2*(1-t)*t*c.x+t*t*z.x,y:(1-t)**2*a.y+2*(1-t)*t*c.y+t*t*z.y});}};
 if(tailVisible&&b.kind==='speech'){
  const start=contour(angle+delta),end=contour(angle+tau-delta);points.push(start);
  for(let i=1;i<=128;i++)points.push(contour(angle+delta+(tau-2*delta)*i/128));
  const bend={x:-dy*b.tail.curve*.35,y:dx*b.tail.curve*.35};
  curvePoints(end,{x:(end.x+target.x)/2+bend.x,y:(end.y+target.y)/2+bend.y},target);
  curvePoints(target,{x:(start.x+target.x)/2+bend.x,y:(start.y+target.y)/2+bend.y},start);
 }else{
  for(let i=0;i<192;i++)points.push(contour(i/192*tau));
  if(tailVisible){const from=contour(Math.atan2(dy/(h/2),dx/(w/2)));
   for(const [t,r] of [[.25,12],[.55,8],[.85,4]])dots.push({x:from.x+(target.x-from.x)*t,y:from.y+(target.y-from.y)*t,r:r*Math.min(1,Math.min(w,h)/200)*(1+b.tail.width/100)});
  }
 }
 const margin=2,all=[...points,...dots.flatMap(p=>[{x:p.x-p.r,y:p.y-p.r},{x:p.x+p.r,y:p.y+p.r}])],minX=Math.min(0,...all.map(p=>p.x))-margin,minY=Math.min(0,...all.map(p=>p.y))-margin,maxX=Math.max(w,...all.map(p=>p.x))+margin,maxY=Math.max(h,...all.map(p=>p.y))+margin;
 const insetX=(b.kind==='thought'?.2:.09)*w+b.padding,insetY=(b.kind==='thought'?.2:.09)*h+b.padding;
 return {path:points.map((p,i)=>(i?'L':'M')+p.x.toFixed(3)+' '+p.y.toFixed(3)).join(' ')+' Z',dots,bounds:{x:minX,y:minY,width:maxX-minX,height:maxY-minY},text:{x:insetX,y:insetY,width:Math.max(0,w-2*insetX),height:Math.max(0,h-2*insetY)},tailVisible};
}
