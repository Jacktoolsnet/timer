import {updateAfterimages} from './afterimages';
import {renderPaper} from './paper';
import {exposureCSS} from '../lib/exposure';
import {updateLiquid} from './liquid';
import {updateParticles} from './particles';
import {cameraTransform} from '../lib/camera';
import {createCropImage} from './crop-image';
import type {Crop} from '../lib/crop';
import {sceneElementState} from '../lib/groups';
import {createBubble} from './bubble';
import {toSvg} from 'html-to-image';
import {formats,locateTime,sceneTransitionState,type Project,type Scene} from '../lib/model';
import {gradientCSS} from '../lib/gradient';
import {videoTime,type VideoSettings} from '../lib/video';
import {createSimulation} from './simulation';
import {renderShape,updateShapeDrawing} from './shapes';
import {renderRuns} from './rich-text';
import {createSvgImage,seekSvg} from './svg-image';
import type {ExportMedia} from './export-media';
/** A separate, offscreen scene tree: exporting never changes the editor playhead. */
export class ExportRenderer{
 readonly root=document.createElement('div');private w:number;private h:number;
 constructor(private p:Project,private media:ExportMedia){[this.w,this.h]=formats[p.format];Object.assign(this.root.style,{position:'fixed',left:'-30000px',top:'0',width:this.w+'px',height:this.h+'px',overflow:'hidden',background:'#000',pointerEvents:'none',fontFamily:'Arial',lineHeight:'normal',fontSize:'16px'});this.root.setAttribute('aria-hidden','true');this.root.dataset.exportRenderer='true';document.body.append(this.root);}
 private box(){const n=document.createElement('div');Object.assign(n.style,{position:'absolute',inset:'0',width:'100%',height:'100%'});return n;}
 private async image(asset:string,fit:'contain'|'cover',parent:HTMLElement,crop:Crop|null=null){const data=this.p.assets[asset].data;if(crop){const view=createCropImage(data,fit,crop);parent.append(view.svg);await view.ready;return view.svg;}if(data.startsWith('data:image/svg+xml;')){const svg=createSvgImage(data,fit);parent.append(svg);return svg;}const img=document.createElement('img');img.src=data;Object.assign(img.style,{width:'100%',height:'100%',objectFit:fit,display:'block'});parent.append(img);}
 private simulation(config:NonNullable<Project['backgroundSimulation']>,w:number,h:number,time:number,parent:HTMLElement,maxPixels=1500000){const view=createSimulation(config,w,h,maxPixels);view.draw(time);Object.assign(view.canvas.style,{width:'100%',height:'100%',display:'block'});parent.append(view.canvas);}
 private async video(c:VideoSettings,elapsed:number,parent:HTMLElement){if(!c.asset)return;const frame=await this.media.frame(c.asset,videoTime(c,this.p.videos[c.asset].duration,elapsed));const canvas=document.createElement('canvas');canvas.width=frame.canvas.width;canvas.height=frame.canvas.height;canvas.getContext('2d')!.drawImage(frame.canvas,0,0);Object.assign(canvas.style,{width:'100%',height:'100%',objectFit:c.fit,display:'block'});parent.append(canvas);}
 private async layer(s:Scene,local:number){const viewport=this.box();viewport.style.overflow='hidden';viewport.style.isolation='isolate';this.root.append(viewport);const layer=this.box();layer.className='scene-camera-world';layer.style.transformOrigin='0 0';layer.style.overflow='visible';layer.style.transform=cameraTransform(s.camera,local,this.w,this.h);viewport.append(layer);
 const bg=this.box();bg.style.background=gradientCSS(s.backgroundGradient,s.background);bg.style.opacity=String(s.backgroundEnabled?s.backgroundOpacity:0);layer.append(bg);if(s.backgroundAsset){const host=this.box();bg.append(host);host.style.opacity=String(s.transition==='fade'?Math.min(1,local/s.transitionDuration):1);seekSvg(await this.image(s.backgroundAsset,'cover',host),local);}
 const fade=s.transition==='fade'?Math.min(1,local/s.transitionDuration):1;
 for(const e of s.elements){const state=sceneElementState(e,s,local,this.w,this.h,true);if(!state.visible)continue;const node=document.createElement('div');node.dataset.elementId=e.id;node.dataset.space=e.space;const w=e.width*this.w/100,h=e.height*this.h/100;
 Object.assign(node.style,{position:'absolute',left:e.x*this.w/100+'px',top:e.y*this.h/100+'px',width:w+'px',height:h+'px',overflow:'hidden',boxSizing:'border-box',display:'flex',alignItems:'center',whiteSpace:'pre-wrap',fontFamily:e.font,fontSize:e.fontSize+'px',fontWeight:e.bold?'700':'400',fontStyle:e.italic?'italic':'normal',color:e.color,textAlign:e.align,justifyContent:e.align==='left'?'flex-start':e.align==='right'?'flex-end':'center',borderRadius:e.radius+'px',opacity:String(state.opacity*fade),transform:state.transform,transformOrigin:'0 0'});layer.append(node);
 if(e.type==='bubble'){createBubble(node,e,w,h,this.w,this.h).update(s,local,state.text);}
 else if(e.type==='text'){const text=document.createElement('span');text.style.width='100%';renderRuns(text,e,state.text);node.append(text);}
 else if(e.type==='shape'){renderShape(node,e,w,h);updateShapeDrawing(node,e,state.sampleTime);}
 else if(e.type==='simulation'&&e.simulation)this.simulation(e.simulation,w,h,state.sampleTime-e.at,node,8000000/Math.max(1,s.elements.filter(e=>e.type==='simulation').length));
 else if(e.type==='video'&&e.video)await this.video(e.video,local-e.at,node);
 else if(e.asset)seekSvg(await this.image(e.asset,e.fit,node,e.type==='image'?e.crop:null),state.sampleTime-e.at);
 renderPaper(node,e,w,h);Object.assign(node.style,exposureCSS(e.exposure,state.opacity*fade));
 updateLiquid(node,e,state.sampleTime,w,h);updateParticles(node,e,state.sampleTime,s.duration,w,h);
 await updateAfterimages(node,e,s,this.p.assets,local,this.w,this.h,fade);
 }
 return viewport;
 }
 /** Bake supported SMIL attributes before serializing; cloned SVG clocks otherwise reset. */
 private freezeSvg(){for(const svg of Array.from(this.root.querySelectorAll('svg'))){const originals=[svg,...Array.from(svg.querySelectorAll('*'))],clone=svg.cloneNode(true) as SVGSVGElement,copies=[clone,...Array.from(clone.querySelectorAll('*'))];originals.forEach((n,index)=>{const copy=copies[index];if(!copy)return;const style=getComputedStyle(n);for(const key of ['fill','stroke','stroke-width','stroke-dashoffset','opacity','fill-opacity','stroke-opacity']) (copy as SVGElement).style.setProperty(key,style.getPropertyValue(key));
 for(const attr of ['x','y','width','height','cx','cy','r','rx','ry','x1','y1','x2','y2','viewBox']){try{const value=(n as unknown as Record<string,{animVal?:{value?:number;x?:number;y?:number;width?:number;height?:number}}>)[attr]?.animVal;if(value?.value!==undefined)copy.setAttribute(attr,String(value.value));else if(attr==='viewBox'&&value?.x!==undefined)copy.setAttribute(attr,`${value.x} ${value.y} ${value.width} ${value.height}`);}catch{/* Filter primitive percentage defaults may have no resolvable SVGLength; retain the original attribute. */}}
 const transform=(n as SVGGraphicsElement).transform?.animVal;if(transform?.numberOfItems){let m=new DOMMatrix();for(let j=0;j<transform.numberOfItems;j++)m=m.multiply(transform.getItem(j).matrix);if(m)copy.setAttribute('transform',`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);}
 });clone.querySelectorAll('animate,animateTransform,set').forEach(n=>n.remove());svg.replaceWith(clone);}}
 async frame(time:number,width:number,height:number){this.media.check();this.clear();
 if(this.p.backgroundSimulation){const host=this.box();this.root.append(host);this.simulation(this.p.backgroundSimulation,this.w,this.h,time,host);}
 if(this.p.backgroundVideo){const host=this.box();this.root.append(host);await this.video(this.p.backgroundVideo,time,host);}
 const at=locateTime(this.p,time),s=this.p.scenes[at.index],transition=sceneTransitionState(s,at.local),previous=s.transition!=='none'&&s.transition!=='fade'&&at.index>0&&transition.progress<1;
 if(s.transition==='through-black'&&transition.progress<1){const black=this.box();black.style.background='#000';black.style.opacity=String(1-Math.abs(transition.progress*2-1));this.root.append(black);}
 if(previous){const out=await this.layer(this.p.scenes[at.index-1],this.p.scenes[at.index-1].duration);out.style.transform=transition.outgoing;out.style.opacity=String(transition.outgoingOpacity);}
 const incoming=await this.layer(s,at.local);incoming.style.transform=transition.incoming;incoming.style.clipPath=transition.clip;incoming.style.opacity=String(transition.opacity);
 this.freezeSvg();
 // html-to-image's toCanvas leaves its decoded SVG Image to garbage collection.
 // Explicitly unload each large, unique frame instead of retaining native image
 // resources until the browser happens to run a GC during a long export.
 const uri=await toSvg(this.root,{skipFonts:true,style:{position:'relative',left:'0px',top:'0px',right:'auto',bottom:'auto',margin:'0',transform:'none',visibility:'visible',contentVisibility:'visible'}});
 const image=new Image(),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 try{
  image.src=uri;await image.decode();this.media.check();canvas.getContext('2d')!.drawImage(image,0,0,width,height);return canvas;
 }catch(error){canvas.width=0;canvas.height=0;throw error;}
 finally{image.removeAttribute('src');this.clear();}
 }
 // Detached canvases can otherwise retain large native pixel buffers until a GC.
 private clear(){for(const canvas of this.root.querySelectorAll('canvas')){canvas.width=0;canvas.height=0;}this.root.replaceChildren();}
 dispose(){this.clear();this.root.remove();}
}
