import {DOMParser,XMLSerializer,type Element as XmlElement} from '@xmldom/xmldom';
export const SVG_NS='http://www.w3.org/2000/svg';
export const MAX_SVG_BYTES=1024*1024;
const tags=new Set('svg g defs path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath title desc animate animateTransform'.split(' '));
const paintTags=new Set('svg g path rect circle ellipse line polyline polygon text tspan'.split(' '));
const numeric=new Set('x y x1 y1 x2 y2 cx cy r rx ry width height dx dy stroke-width stroke-dashoffset font-size offset'.split(' '));
const opacity=new Set(['opacity','fill-opacity','stroke-opacity','stop-opacity']);
const styling=new Set('fill stroke color opacity fill-opacity stroke-opacity stroke-width stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit fill-rule clip-rule clip-path font-family font-size font-weight font-style text-anchor dominant-baseline stop-color stop-opacity'.split(' '));
const common=new Set(['id',...styling,'transform']);
const specific:Record<string,string[]>={svg:['viewBox','width','height','preserveAspectRatio'],path:['d'],rect:['x','y','width','height','rx','ry'],circle:['cx','cy','r'],ellipse:['cx','cy','rx','ry'],line:['x1','y1','x2','y2'],polyline:['points'],polygon:['points'],text:['x','y','dx','dy'],tspan:['x','y','dx','dy'],linearGradient:['x1','y1','x2','y2','gradientUnits','gradientTransform','spreadMethod'],radialGradient:['cx','cy','r','fx','fy','fr','gradientUnits','gradientTransform','spreadMethod'],stop:['offset'],clipPath:['clipPathUnits']};
const animateAttrs=new Set('attributeName from to values dur begin repeatCount fill calcMode keyTimes keySplines'.split(' '));
const animateProperties=new Set('opacity fill stroke fill-opacity stroke-opacity stroke-width stroke-dashoffset x y x1 y1 x2 y2 cx cy r rx ry width height'.split(' '));
const checkedSources=new Map<string,string>();
function fail(message:string):never{throw new Error('SVG: '+message);}
function numbers(value:string,min=-100000,max=100000){
 const parts=value.trim().split(/[\s,]+/);if(!parts.length||parts.some(v=>!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(v)||!Number.isFinite(Number(v))||Number(v)<min||Number(v)>max))fail('invalid or excessive numeric value');return parts.map(Number);
}
function duration(value:string,min=0){const match=/^(\d+(?:\.\d+)?)(ms|s)?$/.exec(value);if(!match)fail('use numeric seconds or ms for animation timing');const n=Number(match![1])/(match![2]==='ms'?1000:1);if(n<min||n>3600)fail('animation timing must be within '+min+'–3600 seconds');return n;}
function paint(value:string){if(!/^(?:#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d\s.,%/+\-]+\))$/i.test(value)||value.length>128)fail('unsupported paint color');}
export function svgDataURL(source:string){const bytes=new TextEncoder().encode(source);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return 'data:image/svg+xml;base64,'+btoa(binary);}
export function svgSource(data:string){
 const match=/^data:image\/svg\+xml;base64,((?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(data);if(!match||!match[1])fail('expected base64 SVG data URL');
 if(match![1].length>Math.ceil(MAX_SVG_BYTES/3)*4)fail('maximum 1 MiB');
 try{const bytes=Uint8Array.from(atob(match![1]),c=>c.charCodeAt(0));return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return fail('invalid UTF-8/Base64');}
}
export function validateSvg(source:string):string{
 const cached=checkedSources.get(source);if(cached)return cached;
 if(new TextEncoder().encode(source).length>MAX_SVG_BYTES)fail('maximum 1 MiB');
 if(/<!DOCTYPE|<!ENTITY/i.test(source))fail('DOCTYPE and entities are not supported');
 const doc=new DOMParser({onError:(_level,message)=>fail('invalid XML: '+message)}).parseFromString(source,'image/svg+xml');
 const root=doc.documentElement;if(!root||root.tagName!=='svg'||root.namespaceURI!==SVG_NS)fail('expected SVG root and SVG namespace');
 for(let node=doc.firstChild;node;node=node.nextSibling)if(node!==root&&node.nodeType!==8&&!(node.nodeType===3&&!node.nodeValue?.trim())&&!(node.nodeType===7&&node.nodeName==='xml'))fail('unsupported document node');
 const ids=new Map<string,XmlElement>(),references:{id:string;attribute:string;node:XmlElement}[]=[];let count=0,animations=0;
 function attribute(node:XmlElement,key:string,value:string,inClip:boolean){
  if(value.length>16000)fail('attribute too long');
  if(key==='id'){if(!/^[A-Za-z_][\w.-]{0,99}$/.test(value)||ids.has(value))fail('invalid or duplicate ID');ids.set(value,node);return;}
  if(numeric.has(key)){const list=numbers(value.replace(/(?:px|%)$/,''),['r','rx','ry','width','height','stroke-width','font-size'].includes(key)?0:-100000);if(!['x','y','dx','dy'].includes(key)&&list.length!==1)fail('expected a single numeric value');return;}
  if(opacity.has(key)){if(numbers(value,0,1).length!==1)fail('opacity must be a single value');return;}
  if(['fill','stroke','color','stop-color'].includes(key)){
   const ref=/^url\(#([A-Za-z_][\w.-]*)\)$/.exec(value);if(ref){if(key==='color'||key==='stop-color')fail('color references not supported');references.push({id:ref[1],attribute:key,node});}else paint(value);return;
  }
  if(key==='clip-path'){if(inClip)fail('nested clipping is unsupported');const ref=/^url\(#([A-Za-z_][\w.-]*)\)$/.exec(value);if(value==='none')return;if(!ref)fail('only internal clip paths are allowed');references.push({id:ref![1],attribute:key,node});return;}
  if(key==='viewBox'){const box=numbers(value);if(box.length!==4||box[2]<=0||box[3]<=0)fail('invalid viewBox');return;}
  if(key==='d'){if(!/^[MmZzLlHhVvCcSsQqTtAa\d\s.,+\-eE]+$/.test(value))fail('invalid path');numbers(value.replace(/[MmZzLlHhVvCcSsQqTtAa]/g,' ').trim()||'0');return;}
  if(key==='points'||key==='stroke-dasharray'){if(key==='stroke-dasharray'&&value==='none')return;numbers(value,key==='points'?-100000:0);return;}
  if(key==='transform'||key==='gradientTransform'){
   const transforms=value.match(/(?:matrix|translate|scale|rotate|skewX|skewY)\([^()]+\)/g);
   if(!transforms||value.replace(/(?:matrix|translate|scale|rotate|skewX|skewY)\([^()]+\)/g,'').replace(/[\s,]/g,''))fail('unsupported transform');
   transforms!.forEach(t=>{const kind=t.slice(0,t.indexOf('(')),n=numbers(t.slice(t.indexOf('(')+1,-1));const sizes:Record<string,number[]>={matrix:[6],translate:[1,2],scale:[1,2],rotate:[1,3],skewX:[1],skewY:[1]};if(!sizes[kind].includes(n.length))fail('invalid transform arguments');});return;
  }
  const enums:Record<string,string[]>={'stroke-linecap':['butt','round','square'],'stroke-linejoin':['miter','round','bevel'],'fill-rule':['nonzero','evenodd'],'clip-rule':['nonzero','evenodd'],'font-style':['normal','italic','oblique'],'text-anchor':['start','middle','end'],gradientUnits:['userSpaceOnUse','objectBoundingBox'],clipPathUnits:['userSpaceOnUse','objectBoundingBox'],spreadMethod:['pad','reflect','repeat']};
  if(enums[key]){if(!enums[key].includes(value))fail('unsupported '+key);return;}
  if(key==='stroke-miterlimit'){numbers(value,1,100);return;}
  if(key==='font-weight'){if(!/^(normal|bold|[1-9]00)$/.test(value))fail('unsupported font weight');return;}
  if(key==='font-family'){if(!/^[\w\s,'"-]{1,200}$/.test(value))fail('unsupported font family');return;}
  if(key==='preserveAspectRatio'){if(!/^(none|x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?: (?:meet|slice))?)$/.test(value))fail('unsupported aspect ratio');return;}
  if(key==='dominant-baseline'){if(!/^[a-z-]{1,40}$/.test(value))fail('unsupported baseline');return;}
  fail('unsupported attribute '+key);
 }
 function walk(node:XmlElement,depth=0,inClip=false){
  if(++count>2000||depth>32)fail('maximum 2000 elements / 32 nesting levels');
  const tag=node.tagName;if(node.namespaceURI!==SVG_NS||!tags.has(tag))fail('unsupported element '+tag);if(tag==='svg'&&node!==root)fail('nested SVG roots unsupported');
  inClip=inClip||tag==='clipPath';
  const animated=tag==='animate'||tag==='animateTransform';
  if(animated){if(++animations>100)fail('maximum 100 animations');if(!paintTags.has(node.parentNode?.nodeName||''))fail('animation needs a graphic parent');}
  if(node.hasAttribute('style')){
   if(animated)fail('animation style attributes unsupported');
   for(const declaration of node.getAttribute('style')!.split(';').filter(v=>v.trim())){const split=declaration.indexOf(':');if(split<0)fail('invalid style');const key=declaration.slice(0,split).trim(),value=declaration.slice(split+1).trim();if(!styling.has(key))fail('unsupported style '+key);node.setAttribute(key,value);}
   node.removeAttribute('style');
  }
  for(const attr of Array.from(node.attributes)){
   const key=attr.name,value=attr.value.trim();
   if(key==='xmlns'&&node===root&&value===SVG_NS)continue;
   if(key==='xmlns:xlink'&&node===root&&value==='http://www.w3.org/1999/xlink')continue;
   if(attr.namespaceURI||/^on/i.test(key))fail('namespaced/event attributes unsupported');
   if(animated){if(!animateAttrs.has(key)&&!(tag==='animateTransform'&&key==='type'))fail('unsupported animation attribute '+key);continue;}
   if(!common.has(key)&&!(specific[tag]||[]).includes(key))fail('unsupported attribute '+key);
   attribute(node,key,value,inClip);
  }
  if(animated){
   const property=node.getAttribute('attributeName')||'',type=node.getAttribute('type');
   if(tag==='animateTransform'){if(property!=='transform'||!['translate','scale','rotate'].includes(type||''))fail('supported animateTransform types: translate, scale, rotate');}
   else if(!animateProperties.has(property))fail('unsupported animated property '+property);
   duration(node.getAttribute('dur')||'',.01);duration(node.getAttribute('begin')||'0');
   const repeat=node.getAttribute('repeatCount')||'1';if(repeat!=='indefinite'&&(numbers(repeat,.01,1000).length!==1))fail('invalid repeat count');
   if(node.hasAttribute('fill')&&!['freeze','remove'].includes(node.getAttribute('fill')!))fail('animation fill must be freeze/remove');
   const mode=node.getAttribute('calcMode')||'linear';if(!['linear','discrete','spline'].includes(mode))fail('unsupported calculation mode');if(mode==='spline'&&(!node.hasAttribute('keyTimes')||!node.hasAttribute('keySplines')))fail('spline needs keyTimes and keySplines');
   const values=node.hasAttribute('values')?node.getAttribute('values')!.split(';'):[node.getAttribute('from'),node.getAttribute('to')];if(values.length>200||values.some(v=>!v?.trim()))fail('use from/to or up to 200 values');
   values.forEach(v=>{if(tag==='animateTransform'){const n=numbers(v!);if(type==='translate'&&n.length!==1&&n.length!==2||type==='scale'&&n.length!==1&&n.length!==2||type==='rotate'&&n.length!==1&&n.length!==3)fail('invalid transform animation values');}else{attribute(node,property,v!.trim(),false);if(property==='fill'||property==='stroke'){if(v!.includes('url('))fail('animated paint references unsupported');}}});
   if(node.hasAttribute('keyTimes')){const times=node.getAttribute('keyTimes')!.split(';').flatMap(v=>numbers(v,0,1));if(times.length!==values.length||times[0]!==0||times.at(-1)!==1||times.some((v,i)=>i>0&&v<times[i-1]))fail('keyTimes must match values and range 0–1');}
   if(node.hasAttribute('keySplines')){const splines=node.getAttribute('keySplines')!.split(';');if(splines.length!==values.length-1||splines.some(v=>numbers(v,0,1).length!==4))fail('invalid keySplines');}
  }
  for(let child=node.firstChild;child;child=child.nextSibling){if(child.nodeType===1)walk(child as XmlElement,depth+1,inClip);else if(child.nodeType===3||child.nodeType===4){if((child.nodeValue?.length||0)>16000)fail('text too long');if(child.nodeValue?.trim()&&!['text','tspan','title','desc'].includes(tag))fail('text outside text elements');}else if(child.nodeType!==8)fail('unsupported XML node');}
 }
 walk(root);
 for(const ref of references){const target=ids.get(ref.id);if(!target||!(ref.attribute==='clip-path'?target.tagName==='clipPath':['linearGradient','radialGradient'].includes(target.tagName)))fail('missing or incompatible internal reference '+ref.id);}
 if(!root.hasAttribute('viewBox')){const width=Number(root.getAttribute('width')),height=Number(root.getAttribute('height'));if(!width||!height)fail('provide a viewBox or numeric width and height');root.setAttribute('viewBox',`0 0 ${width} ${height}`);}
 const canonical=new XMLSerializer().serializeToString(root);if(checkedSources.size>=8)checkedSources.delete(checkedSources.keys().next().value!);checkedSources.set(source,canonical);return canonical;
}
