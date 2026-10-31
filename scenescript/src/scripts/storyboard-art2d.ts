import type {Project} from '../lib/model';
import {resourceSubject} from '../lib/storyboard-resources';
import type {BoardReviewTarget} from '../lib/storyboard';
import {artworkSource2D,seedArtwork2D,artwork2DWords} from '../lib/storyboard-art2d';
import {formatFrame2D} from '../lib/stage2d-frame';
import {validateImage} from '../lib/image-assets';
/** Avoid inflating compressed sketches into multi-megabyte PNGs after cropping. Originals stay intact. */
function encodeArtwork2D(canvas:HTMLCanvasElement){const png=canvas.toDataURL('image/png');if(png.length<=512*1024)return png;const webp=canvas.toDataURL('image/webp',1);return webp.startsWith('data:image/webp;')&&webp.length<png.length?webp:png;}
/** Decode locally; inspect real alpha, never infer transparency from MIME or a checkerboard. */
export async function inspectArtwork2D(data:string,signal:AbortSignal){
 signal.throwIfAborted();const image=new Image();image.src=validateImage(data);await image.decode();signal.throwIfAborted();
 const width=image.naturalWidth,height=image.naturalHeight;if(!width||!height||width*height>40000000)throw Error('2D artwork: maximum 40 megapixels');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);const rgba=ctx.getImageData(0,0,width,height).data;
 let clear=0,visible=0,border=0,borderClear=0,left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=rgba[(y*width+x)*4+3];if(a<16)clear++;if(a>16){visible++;left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}if(!x||!y||x===width-1||y===height-1){border++;if(a<16)borderClear++;}}
 const cutout=clear>width*height*.01&&visible>width*height*.01&&borderClear/border>.8;
 return {image,width,height,cutout,coverage:visible/(width*height),bounds:{left,top,right,bottom}};
}
/** Crop only transparent padding, resize only when required by GPU limits; never color-key artwork. */
export async function fitArtwork2D(data:string,setting:boolean,signal:AbortSignal,frame?:{width:number;height:number}){
 const art=await inspectArtwork2D(data,signal);if(art.coverage<.01)throw Error('2D artwork: empty illustration');if(!setting&&!art.cutout)throw Error(artwork2DWords(document.documentElement.lang).invalid);
 const b=art.bounds,margin=setting?0:Math.ceil(Math.max(b.right-b.left+1,b.bottom-b.top+1)*.02),x=setting?0:Math.max(0,b.left-margin),y=setting?0:Math.max(0,b.top-margin),w=setting?art.width:Math.min(art.width,b.right+margin+1)-x,h=setting?art.height:Math.min(art.height,b.bottom+margin+1)-y;
 let cropX=x,cropY=y,cropW=w,cropH=h;
 if(setting&&frame){const ratio=frame.width/frame.height;if(w/h>ratio){cropW=h*ratio;cropX=(w-cropW)/2;}else{cropH=w/ratio;cropY=(h-cropH)/2;}}
 const scale=Math.min(1,2048/Math.max(cropW,cropH)),width=Math.max(1,Math.round(cropW*scale)),height=Math.max(1,Math.round(cropH*scale));
 if(cropX===0&&cropY===0&&cropW===art.width&&cropH===art.height&&scale===1&&!data.startsWith('data:image/svg'))return {data,width,height};
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d')!.drawImage(art.image,cropX,cropY,cropW,cropH,0,0,width,height);signal.throwIfAborted();
 const result=encodeArtwork2D(canvas);canvas.width=canvas.height=0;
 return {data:result,width,height};
}
export async function prepareArtwork2D(project:Project,target:BoardReviewTarget,signal:AbortSignal,cutout:(image:string)=>Promise<string>){
 const source=artworkSource2D(project,target);if(!source)return {project,seeded:false};
 let data=source.image.data!;
 if(!source.setting&&!(await inspectArtwork2D(data,signal)).cutout){data=await cutout(data);signal.throwIfAborted();}
 const fitted=await fitArtwork2D(data,source.setting,signal,formatFrame2D(project.storyboard!.format));signal.throwIfAborted();
 return {project:seedArtwork2D(project,target,{name:(source.image.name.slice(0,185)+' · 2D'),data:fitted.data},fitted),seeded:true};
}

/** After semantic cleanup, retain the seed's canvas aspect/coordinates so authored effects stay aligned. */
export async function replaceSeedArtwork2D(project:Project,target:BoardReviewTarget,data:string,signal:AbortSignal){
 const subject=resourceSubject(project.storyboard!,target),model=subject.model2d!,original=model.images!.reference,base=await inspectArtwork2D(original.data!,signal),fitted=await fitArtwork2D(data,false,signal),image=new Image();image.src=fitted.data;await image.decode();signal.throwIfAborted();
 const canvas=document.createElement('canvas');canvas.width=base.width;canvas.height=base.height;const scale=Math.min(base.width/fitted.width,base.height/fitted.height),w=fitted.width*scale,h=fitted.height*scale;canvas.getContext('2d')!.drawImage(image,(base.width-w)/2,(base.height-h)/2,w,h);const result=encodeArtwork2D(canvas);canvas.width=canvas.height=0;
 return {...project,storyboard:{...project.storyboard!,[target.kind]:project.storyboard![target.kind].map(s=>s.id===target.id?{...s,model2d:{...model,images:{...model.images,reference:{...original,data:result}}}}:s)}} as Project;
}
