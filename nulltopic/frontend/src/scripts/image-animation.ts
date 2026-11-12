import {t} from '../lib/i18n';
import type {PostImage} from './post-image';
export const safeImageUrl=(url:string)=>/^\/api\/(?:posts\/[0-9a-f-]+\/image|case-images\/[0-9a-f-]+)$/.test(url);
export const posterUrl=(value:PostImage)=>value.url+(value.animated?'?preview=true':'');
/** No animation bytes are requested until an explicit click. Pause returns to the poster. */
export function animationControl(image:HTMLImageElement,value:PostImage){
 const doc=image.ownerDocument,win=doc.defaultView!,button=doc.createElement('button');button.type='button';button.className='admin-icon-button image-animation-control';
 let playing=false,disposed=false,timer:ReturnType<typeof setTimeout>|undefined,observer:MutationObserver|undefined;
 function label(){const text=t(playing?'Pause animation':'Play animation');button.setAttribute('aria-label',text);button.dataset.tooltip=text;button.setAttribute('aria-pressed',String(playing));button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(playing?'M8 5v14M16 5v14':'m8 4 12 8-12 8V4Z')+'"/></svg>';}
 function clear(){if(timer)clearTimeout(timer);timer=undefined;observer?.disconnect();observer=undefined;doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('pagehide',stop);}
 function stop(){const wasPlaying=playing;playing=false;clear();label();if(wasPlaying&&!disposed){if(image.isConnected&&!image.closest('[hidden]'))image.src=posterUrl(value);else image.removeAttribute('src');}}
 function visibility(){if(doc.hidden)stop();}
 button.addEventListener('click',()=>{
  if(playing){stop();return;}
  if(disposed||!safeImageUrl(value.url)||doc.hidden)return;
  playing=true;label();image.src=value.url;
  doc.addEventListener('visibilitychange',visibility);win.addEventListener('pagehide',stop);
  observer=new win.MutationObserver(()=>{if(!image.isConnected||image.closest('[hidden]'))stop();});observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 });
 // Start the one-play reset clock when the animation has actually loaded, not at request time.
 image.addEventListener('load',()=>{if(playing){if(timer)clearTimeout(timer);timer=setTimeout(stop,Math.min(10000,Math.max(100,value.durationMs||10000))+100);}});
 image.addEventListener('error',()=>{playing=false;clear();label();button.disabled=true;});label();
 return {button,stop,dispose(){disposed=true;playing=false;clear();image.removeAttribute('src');}};
}
