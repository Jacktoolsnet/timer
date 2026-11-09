import {t} from '../lib/i18n';
import type {PostImage} from './post-image';
export function openImageViewer(trigger:HTMLElement,value:PostImage){
 const doc=trigger.ownerDocument,win=doc.defaultView!;
 const existing=doc.querySelector<HTMLDialogElement>('#image-viewer');if(existing){existing.querySelector<HTMLButtonElement>('[data-image-close]')?.focus();return;}
 const dialog=doc.createElement('dialog');dialog.id='image-viewer';dialog.className='report-dialog image-viewer';dialog.setAttribute('aria-labelledby','image-viewer-title');
 const header=doc.createElement('header'),heading=doc.createElement('h2');heading.id='image-viewer-title';heading.textContent=t('Image preview');const kind=doc.createElement('span');kind.className='image-viewer-kind';kind.textContent=t('AI-generated image · self-reported');header.append(heading,kind);
 const viewport=doc.createElement('div');viewport.className='image-viewer-viewport';viewport.tabIndex=0;viewport.setAttribute('aria-label',t('Image area. Use arrow keys to pan when zoomed.'));
 const canvas=doc.createElement('div');canvas.className='image-viewer-canvas';const image=doc.createElement('img');image.className='image-viewer-image';image.alt=value.description;image.draggable=false;image.src=value.url;canvas.append(image);viewport.append(canvas);
 const description=doc.createElement('p');description.className='image-viewer-description';description.textContent=value.description;
 const feedback=doc.createElement('p');feedback.className='image-viewer-status';feedback.setAttribute('role','status');feedback.textContent=t('Loading image…');
 const footer=doc.createElement('footer'),percent=doc.createElement('output');percent.className='image-viewer-zoom';percent.setAttribute('aria-label',t('Zoom level'));percent.setAttribute('aria-live','polite');
 let zoom=1,ready=false,disposed=false,width=1,height=1,left=0,top=0,drag:{id:number;x:number;y:number;scrollX:number;scrollY:number}|null=null;
 function button(label:string,path:string,action:()=>void){const b=doc.createElement('button');b.type='button';b.className='admin-icon-button';b.setAttribute('aria-label',t(label));b.dataset.tooltip=t(label);b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';b.addEventListener('click',action);return b;}
 const postId=trigger.closest<HTMLElement>('article[id]')?.id;
 const close=()=>{if(dialog.open)dialog.close();};
 const exit=button('Close image','m6 6 12 12M18 6 6 18',close);exit.dataset.imageClose='';exit.autofocus=true;
 const minus=button('Zoom out','M5 12h14',()=>setZoom(zoom-.5)),plus=button('Zoom in','M5 12h14M12 5v14',()=>setZoom(zoom+.5)),reset=button('Fit image','M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',()=>setZoom(1));
 footer.append(exit,minus,percent,plus,reset);dialog.append(header,viewport,feedback,description,footer);
 function layout(center=true){
  const vw=viewport.clientWidth||640,vh=viewport.clientHeight||400;
  const x=(viewport.scrollLeft+vw/2-left)/width,y=(viewport.scrollTop+vh/2-top)/height;
  const fit=Math.min(1,Math.max(1,vw-32)/value.width,Math.max(1,vh-32)/value.height);
  width=Math.max(1,Math.round(value.width*fit*zoom));height=Math.max(1,Math.round(value.height*fit*zoom));
  const cw=Math.max(vw,width+32),ch=Math.max(vh,height+32);left=(cw-width)/2;top=(ch-height)/2;
  canvas.style.width=cw+'px';canvas.style.height=ch+'px';image.style.width=width+'px';image.style.height=height+'px';image.style.left=left+'px';image.style.top=top+'px';
  viewport.scrollLeft=center?left+width/2-vw/2:left+width*x-vw/2;viewport.scrollTop=center?top+height/2-vh/2:top+height*y-vh/2;
  viewport.dataset.zoomed=String(zoom>1);percent.textContent=Math.round(zoom*100)+'%';minus.disabled=!ready||zoom<=1;plus.disabled=!ready||zoom>=4;reset.disabled=!ready||zoom===1;
 }
 function setZoom(value:number){if(!ready||disposed)return;const next=Math.min(4,Math.max(1,value));if(next===zoom)return;zoom=next;layout(next===1);}
 image.addEventListener('load',()=>{if(disposed)return;ready=true;feedback.textContent='';layout();});
 image.addEventListener('error',()=>{if(disposed)return;ready=false;image.hidden=true;feedback.textContent=t('This image is no longer available.');layout();});
 viewport.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey)return;if(event.key==='+'||event.key==='='){event.preventDefault();setZoom(zoom+.5);}else if(event.key==='-'){event.preventDefault();setZoom(zoom-.5);}else if(event.key==='0'){event.preventDefault();setZoom(1);}});
 viewport.addEventListener('pointerdown',event=>{if(zoom<=1||event.button!==0||event.pointerType==='touch')return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,scrollX:viewport.scrollLeft,scrollY:viewport.scrollTop};viewport.setPointerCapture?.(event.pointerId);viewport.dataset.dragging='true';viewport.focus({preventScroll:true});event.preventDefault();});
 viewport.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;viewport.scrollLeft=drag.scrollX+drag.x-event.clientX;viewport.scrollTop=drag.scrollY+drag.y-event.clientY;});
 const endDrag=()=>{drag=null;delete viewport.dataset.dragging;};viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);viewport.addEventListener('lostpointercapture',endDrag);
 const resize=()=>layout();win.addEventListener('resize',resize);win.addEventListener('pagehide',close);
 // Private evidence must not survive workspace clearing or session departure.
 const observer=new win.MutationObserver(()=>{
  if(value.url.startsWith('/api/case-images/')){if(!trigger.isConnected||trigger.closest('[hidden]'))close();}
  else if(postId){const current=doc.getElementById(postId);if(!current||!Array.from(current.querySelectorAll<HTMLImageElement>('.post-image img')).some(img=>img.getAttribute('src')===value.url))close();}
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))close();});
 dialog.addEventListener('close',()=>{disposed=true;observer?.disconnect();win.removeEventListener('resize',resize);win.removeEventListener('pagehide',close);dialog.remove();doc.documentElement.style.overflow=previousOverflow;const back=trigger.isConnected?trigger:postId?doc.getElementById(postId)?.querySelector<HTMLElement>('.post-image-trigger'):null;if(back&&!back.closest('[hidden]'))back.focus({preventScroll:true});},{once:true});
 const previousOverflow=doc.documentElement.style.overflow;
 doc.body.append(dialog);dialog.showModal();doc.documentElement.style.overflow='hidden';observer?.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});layout();exit.focus();
}
