const words={
 de:{open:'Ressourcenvorschau öffnen',close:'Schließen',zoomIn:'Vergrößern',zoomOut:'Verkleinern',fit:'An Fenster anpassen',hint:'Mit + / − oder dem Mausrad zoomen. Zum Verschieben ziehen.'},
 en:{open:'Open resource preview',close:'Close',zoomIn:'Zoom in',zoomOut:'Zoom out',fit:'Fit to window',hint:'Zoom with + / − or the mouse wheel. Drag to pan.'},
 es:{open:'Abrir vista previa del recurso',close:'Cerrar',zoomIn:'Acercar',zoomOut:'Alejar',fit:'Ajustar a la ventana',hint:'Amplía con + / − o la rueda. Arrastra para desplazar.'},
 fr:{open:'Ouvrir l’aperçu de la ressource',close:'Fermer',zoomIn:'Agrandir',zoomOut:'Réduire',fit:'Adapter à la fenêtre',hint:'Zoomez avec + / − ou la molette. Faites glisser pour déplacer.'}
};
const text=()=>words[document.documentElement.lang as keyof typeof words]??words.en;
type Mount=(host:HTMLElement)=>()=>void;
function icon(label:string,path:string){const b=document.createElement('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';return b;}
export function resourceViewerButton(name:string,mount:Mount){
 const b=icon(text().open,'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 6 6M7 10h6m-3-3v6');b.className='resource-viewer-open';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls','resource-viewer-dialog');b.onclick=()=>openResourceViewer(name,mount,b);return b;
}
/** Render a separate rehearsal. Its camera/zoom/time never alter the project. */
function openResourceViewer(name:string,mount:Mount,opener:HTMLButtonElement){
 if(document.getElementById('resource-viewer-dialog'))return;
 const t=text(),dialog=document.createElement('dialog'),header=document.createElement('header'),title=document.createElement('h2'),toolbar=document.createElement('div'),viewport=document.createElement('div'),surface=document.createElement('div'),host=document.createElement('div'),footer=document.createElement('footer');
 dialog.id='resource-viewer-dialog';dialog.setAttribute('aria-labelledby','resource-viewer-title');title.id='resource-viewer-title';title.textContent=name||opener.closest('dialog')?.querySelector('#stage3d-detail-title')?.textContent||t.open;header.append(title);
 const minus=icon(t.zoomOut,'M5 12h14'),plus=icon(t.zoomIn,'M5 12h14M12 5v14'),fit=icon(t.fit,'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6'),close=icon(t.close,'m6 6 12 12M18 6 6 18'),percent=document.createElement('output');
 minus.id='resource-viewer-minus';plus.id='resource-viewer-plus';fit.id='resource-viewer-fit';close.id='resource-viewer-close';percent.id='resource-viewer-percent';percent.setAttribute('aria-live','polite');toolbar.className='resource-viewer-toolbar';toolbar.append(minus,percent,plus,fit);
 viewport.id='resource-viewer-viewport';viewport.tabIndex=0;viewport.setAttribute('aria-label',t.hint);surface.className='resource-viewer-surface';surface.append(host);viewport.append(surface);footer.append(close);dialog.append(header,toolbar,viewport,footer);document.body.append(dialog);
 let dispose=()=>{},scale=1,fitted=true,drag:{id:number;x:number;y:number;left:number;top:number}|undefined;
 let figure:HTMLElement|null=null;
 const fitScale=()=>Math.max(.1,Math.min((viewport.clientWidth-24)/640,(viewport.clientHeight-24)/480));
 function draw(next:number,center=false){
  if(!figure)return;const x=(viewport.scrollLeft+viewport.clientWidth/2)/Math.max(1,surface.offsetWidth),y=(viewport.scrollTop+viewport.clientHeight/2)/Math.max(1,surface.offsetHeight);
  scale=Math.max(.1,Math.min(8,next));figure.style.width=640*scale+'px';figure.style.height=480*scale+'px';surface.style.width=Math.max(viewport.clientWidth,640*scale+24)+'px';surface.style.height=Math.max(viewport.clientHeight,480*scale+24)+'px';percent.value=Math.round(scale/fitScale()*100)+' %';viewport.scrollLeft=center?(surface.offsetWidth-viewport.clientWidth)/2:x*surface.offsetWidth-viewport.clientWidth/2;viewport.scrollTop=center?(surface.offsetHeight-viewport.clientHeight)/2:y*surface.offsetHeight-viewport.clientHeight/2;
 }
 const zoom=(factor:number)=>{fitted=false;draw(scale*factor);},reset=()=>{fitted=true;draw(fitScale(),true);};
 minus.onclick=()=>zoom(1/1.25);plus.onclick=()=>zoom(1.25);fit.onclick=reset;close.onclick=()=>dialog.close();
 viewport.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.1:1/1.1);},{passive:false});
 viewport.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);});
 viewport.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;viewport.scrollLeft=drag.left+drag.x-e.clientX;viewport.scrollTop=drag.top+drag.y-e.clientY;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,()=>{drag=undefined;});
 viewport.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.25);}else if(e.key==='-'){e.preventDefault();zoom(1/1.25);}else if(e.key==='0'){e.preventDefault();reset();}});
 const resize=new ResizeObserver(()=>{if(dialog.open)fitted?reset():draw(scale);});
 const owner=opener.closest('dialog'),observer=new MutationObserver(()=>{if(dialog.open&&(!opener.isConnected||owner&&!owner.open))dialog.close();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 dialog.addEventListener('close',()=>{resize.disconnect();observer.disconnect();dispose();dialog.remove();if(opener.isConnected)opener.focus();},{once:true});
 dialog.showModal();
 try{dispose=mount(host);figure=host.querySelector('.board-model-canvas');for(const child of Array.from(host.children))if(child!==figure)footer.append(child);resize.observe(viewport);reset();}catch(error){const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=(error as Error).message;footer.append(message);}
 close.focus();
}
