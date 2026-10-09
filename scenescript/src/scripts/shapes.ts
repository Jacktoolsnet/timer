import {gradientCSS} from '../lib/gradient';
import type {Element} from '../lib/model';
const ns='http://www.w3.org/2000/svg';
export function renderShape(node:HTMLElement,e:Element,width:number,height:number){
 const stroke=Math.min(e.borderWidth,width/2,height/2);
 if(e.shapeType==='rectangle'){
  node.style.background=gradientCSS(e.fillGradient,e.fillColor);
  node.style.border=e.borderColor==='none'?'none':`${stroke}px ${e.borderStyle} ${e.borderColor}`;
  return;
 }
 node.style.borderRadius='0';
 const svg=document.createElementNS(ns,'svg');svg.classList.add('shape-svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('aria-hidden','true');
 const inset=e.borderColor==='none'?0:stroke/2,x=inset,y=inset,w=Math.max(0,width-inset*2),h=Math.max(0,height-inset*2);
 const points:Record<string,number[][]>={triangle:[[.5,0],[1,1],[0,1]],diamond:[[.5,0],[1,.5],[.5,1],[0,.5]],arrow:[[0,.25],[.6,.25],[.6,0],[1,.5],[.6,1],[.6,.75],[0,.75]]};
 let shape:SVGElement;
 if(e.shapeType==='ellipse'){shape=document.createElementNS(ns,'ellipse');shape.setAttribute('cx',String(width/2));shape.setAttribute('cy',String(height/2));shape.setAttribute('rx',String(w/2));shape.setAttribute('ry',String(h/2));}
 else{
  shape=document.createElementNS(ns,'polygon');const vertices=e.shapeType==='star'?Array.from({length:10},(_,i)=>{const angle=-Math.PI/2+i*Math.PI/5,r=i%2?.22:.5;return [.5+Math.cos(angle)*r,.5+Math.sin(angle)*r];}):points[e.shapeType];
  shape.setAttribute('points',vertices.map(([px,py])=>`${x+px*w},${y+py*h}`).join(' '));
 }
 if(e.fillGradient){
  const defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath'),id='shape-fill-'+crypto.randomUUID();clip.id=id;clip.append(shape.cloneNode());defs.append(clip);svg.append(defs);
  const foreign=document.createElementNS(ns,'foreignObject');foreign.setAttribute('width',String(width));foreign.setAttribute('height',String(height));foreign.setAttribute('clip-path',`url(#${id})`);
  const fill=document.createElementNS('http://www.w3.org/1999/xhtml','div');fill.style.width='100%';fill.style.height='100%';fill.style.background=gradientCSS(e.fillGradient,e.fillColor);foreign.append(fill);svg.append(foreign);
 }
 shape.setAttribute('fill',e.fillGradient?'none':e.fillColor);shape.setAttribute('stroke','none');svg.append(shape);
 if(e.borderColor!=='none'&&stroke>0){
  const outline=shape.cloneNode() as SVGElement;outline.setAttribute('fill','none');outline.setAttribute('stroke',e.borderColor);outline.setAttribute('stroke-width',String(stroke));outline.setAttribute('stroke-linejoin','round');
  if(e.borderStyle==='dashed')outline.setAttribute('stroke-dasharray',`${stroke*3} ${stroke*2}`);
  if(e.borderStyle==='dotted'){outline.setAttribute('stroke-dasharray',`0 ${stroke*2}`);outline.setAttribute('stroke-linecap','round');}
  if(e.borderStyle==='double'){
   const defs=document.createElementNS(ns,'defs'),mask=document.createElementNS(ns,'mask'),id='shape-border-'+crypto.randomUUID();mask.id=id;mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('x','0');mask.setAttribute('y','0');mask.setAttribute('width',String(width));mask.setAttribute('height',String(height));mask.style.maskType='luminance';
   const band=outline.cloneNode() as SVGElement;band.setAttribute('stroke','white');const gap=outline.cloneNode() as SVGElement;gap.setAttribute('stroke','black');gap.setAttribute('stroke-width',String(stroke/3));mask.append(band,gap);defs.append(mask);svg.append(defs);outline.setAttribute('mask',`url(#${id})`);
  }
  svg.append(outline);
 }
 node.append(svg);
}
