type Media=HTMLCanvasElement|HTMLVideoElement;
/** Share immutable pixel snapshots across visual copies; cloneNode loses media buffers. */
export function copyMediaPixels(source:HTMLElement,copy:HTMLElement,snapshots=new Map<Media,string>()){
 const originals=source.querySelectorAll<Media>('canvas,video');
 copy.querySelectorAll<Media>('canvas,video').forEach((n,index)=>{
  const src=originals[index],video=src instanceof HTMLVideoElement;
  const width=video?src.videoWidth:src.width,height=video?src.videoHeight:src.height;
  let data=snapshots.get(src);
  if(!data){
   if(!video&&width&&height)data=src.toDataURL();
   else{const canvas=document.createElement('canvas');canvas.width=Math.max(1,width);canvas.height=Math.max(1,height);if(width&&height&&(!video||src.readyState>=2))canvas.getContext('2d')!.drawImage(src,0,0);data=canvas.toDataURL();canvas.width=0;canvas.height=0;}
   snapshots.set(src,data);
  }
  const image=document.createElement('img');image.width=width;image.height=height;image.style.cssText=n.style.cssText;if(n.id)image.id=n.id;image.decoding='sync';image.src=data;n.replaceWith(image);
 });
}
