const words={
 de:{open:'Bild vergrößern',title:'Bildansicht',in:'Vergrößern',out:'Verkleinern',fit:'An Fenster anpassen',actual:'Originalgröße (100 %)',close:'Schließen',hint:'Mit + / − oder dem Mausrad zoomen. Zum Verschieben ziehen. 0 passt das Bild ein.',error:'Das Bild konnte nicht geladen werden.'},
 en:{open:'Enlarge image',title:'Image viewer',in:'Zoom in',out:'Zoom out',fit:'Fit to window',actual:'Actual size (100%)',close:'Close',hint:'Zoom with + / − or the mouse wheel. Drag to pan. Press 0 to fit.',error:'The image could not be loaded.'},
 es:{open:'Ampliar imagen',title:'Visor de imágenes',in:'Acercar',out:'Alejar',fit:'Ajustar a la ventana',actual:'Tamaño original (100 %)',close:'Cerrar',hint:'Amplía con + / − o la rueda del ratón. Arrastra para desplazar. 0 ajusta la imagen.',error:'No se pudo cargar la imagen.'},
 fr:{open:'Agrandir l’image',title:'Visionneuse',in:'Agrandir',out:'Réduire',fit:'Adapter à la fenêtre',actual:'Taille réelle (100 %)',close:'Fermer',hint:'Zoomez avec + / − ou la molette. Faites glisser pour déplacer. 0 adapte l’image.',error:'Impossible de charger l’image.'}
};
const text=()=>words[document.documentElement.lang as keyof typeof words]??words.en;
function button(label:string,path:string){
 const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),p=document.createElementNS(svg.namespaceURI,'path');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');p.setAttribute('d',path);svg.append(p);b.append(svg);return b;
}
export function imageViewerButton(source:()=>{data:string;name:string}){
 const b=button(text().open,'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6M7 10h6m-3-3v6');
 b.className='image-viewer-open';b.addEventListener('click',()=>{const image=source();openImageViewer(image.data,image.name);});return b;
}
export function openImageViewer(data:string,name:string){
 if(document.getElementById('image-viewer-dialog'))return;
 const t=text(),focused=document.activeElement as HTMLElement|null,dialog=document.createElement('dialog');
 dialog.id='image-viewer-dialog';dialog.setAttribute('aria-labelledby','image-viewer-title');
 const heading=document.createElement('header'),title=document.createElement('h2');title.id='image-viewer-title';title.textContent=name||t.title;heading.append(title);
 const toolbar=document.createElement('div');toolbar.className='image-viewer-toolbar';
 const minus=button(t.out,'M5 12h14'),plus=button(t.in,'M5 12h14M12 5v14'),fit=button(t.fit,'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6'),actual=button(t.actual,'M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4M9 9h6v6H9Z'),close=button(t.close,'m6 6 12 12M18 6 6 18');
 minus.id='image-viewer-minus';plus.id='image-viewer-plus';fit.id='image-viewer-fit';actual.id='image-viewer-actual';close.id='image-viewer-close';
 const percent=document.createElement('output');percent.id='image-viewer-percent';percent.setAttribute('aria-live','polite');
 toolbar.append(minus,percent,plus,fit,actual);
 const viewport=document.createElement('div');viewport.id='image-viewer-viewport';viewport.tabIndex=0;viewport.setAttribute('aria-label',t.hint);
 const surface=document.createElement('div');surface.className='image-viewer-surface';
 const img=new Image();img.alt=name;img.draggable=false;surface.append(img);viewport.append(surface);
 const footer=document.createElement('footer'),hint=document.createElement('p');hint.textContent=t.hint;footer.append(close,hint);
 dialog.append(heading,toolbar,viewport,footer);document.body.append(dialog);
 let scale=1,ready=false,fitted=true,drag:{id:number;x:number;y:number;left:number;top:number}|undefined;
 const fitScale=()=>Math.min(Math.max(1,viewport.clientWidth-24)/img.naturalWidth,Math.max(1,viewport.clientHeight-24)/img.naturalHeight);
 function render(next:number,center=true){
  if(!ready)return;
  const oldW=surface.offsetWidth,oldH=surface.offsetHeight,cx=(viewport.scrollLeft+viewport.clientWidth/2)/Math.max(1,oldW),cy=(viewport.scrollTop+viewport.clientHeight/2)/Math.max(1,oldH);
  scale=Math.max(.01,Math.min(Math.max(16,fitScale()),next));
  const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
  img.style.width=w+'px';img.style.height=h+'px';surface.style.width=Math.max(viewport.clientWidth,w+24)+'px';surface.style.height=Math.max(viewport.clientHeight,h+24)+'px';
  percent.value=Math.round(scale*100)+' %';
  viewport.scrollLeft=center?(surface.offsetWidth-viewport.clientWidth)/2:cx*surface.offsetWidth-viewport.clientWidth/2;
  viewport.scrollTop=center?(surface.offsetHeight-viewport.clientHeight)/2:cy*surface.offsetHeight-viewport.clientHeight/2;
 }
 const zoom=(factor:number)=>{fitted=false;render(scale*factor,false);};
 const fitImage=()=>{fitted=true;render(fitScale());};
 minus.addEventListener('click',()=>zoom(1/1.25));plus.addEventListener('click',()=>zoom(1.25));fit.addEventListener('click',fitImage);actual.addEventListener('click',()=>{fitted=false;render(1);});
 viewport.addEventListener('wheel',e=>{e.preventDefault();if(e.deltaY)zoom(e.deltaY<0?1.1:1/1.1);},{passive:false});
 viewport.addEventListener('pointerdown',e=>{if(!ready||e.button!==0||!e.isPrimary)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging');});
 viewport.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY;});
 const endDrag=()=>{drag=undefined;viewport.classList.remove('dragging');};viewport.addEventListener('lostpointercapture',endDrag);viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
 dialog.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.25);}else if(e.key==='-'){e.preventDefault();zoom(1/1.25);}else if(e.key==='0'){e.preventDefault();fitImage();}});
 const resize=new ResizeObserver(()=>{if(ready){if(fitted)fitImage();else render(scale,false);}});resize.observe(viewport);
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{resize.disconnect();img.removeAttribute('src');dialog.remove();if(focused?.isConnected)focused.focus();},{once:true});
 for(const b of [minus,plus,fit,actual])b.disabled=true;
 dialog.showModal();close.focus();img.src=data;
 void img.decode().then(()=>{if(!dialog.open)return;ready=true;for(const b of [minus,plus,fit,actual])b.disabled=false;fitImage();}).catch(()=>{if(dialog.open){hint.textContent=t.error;hint.setAttribute('role','alert');}});
}
