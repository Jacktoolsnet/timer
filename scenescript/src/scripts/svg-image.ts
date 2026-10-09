import {validateSvg,svgSource} from '../lib/svg';
export function createSvgImage(data:string,fit:'contain'|'cover',background=false){
 const source=validateSvg(svgSource(data));
 const svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement as unknown as SVGSVGElement;
 const prefix='svg-'+crypto.randomUUID()+'-';
 const ids=new Map<string,string>();[...(svg.id?[svg]:[]),...Array.from(svg.querySelectorAll('[id]'))].forEach(node=>{ids.set(node.id,prefix+node.id);node.id=prefix+node.id;});
 for(const node of [svg,...Array.from(svg.querySelectorAll('*'))])for(const attr of Array.from(node.attributes)){
  const value=attr.value.replace(/url\(#([\w.-]+)\)/g,(_match,id)=>`url(#${ids.get(id)||id})`);if(value!==attr.value)node.setAttribute(attr.name,value);
 }
 // Shared site SVG icon styles must not change imported artwork defaults.
 for(const [property,fallback] of Object.entries({fill:'black',stroke:'none','stroke-width':'1','stroke-linecap':'butt','stroke-linejoin':'miter',color:'black','font-family':'Arial','font-size':'16'}))svg.style.setProperty(property,svg.getAttribute(property)||fallback);
 svg.style.width='100%';svg.style.height='100%';svg.style.pointerEvents='none';svg.setAttribute('preserveAspectRatio',fit==='cover'?'xMidYMid slice':'xMidYMid meet');svg.classList.add(background?'scene-svg-background':'scene-svg-image');svg.setAttribute('aria-hidden','true');
 return svg;
}
export function seekSvg(svg:SVGSVGElement|undefined,time:number){if(!svg)return;svg.pauseAnimations();svg.setCurrentTime(Math.max(0,time));}
