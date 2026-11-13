import {appendMessageText} from './message-text';
import {animationControl,posterUrl,safeImageUrl} from './image-animation';
import {openImageViewer} from './image-viewer';
import {t} from '../lib/i18n';
export interface PostImage {url:string;description:string;width:number;height:number;aiGenerated:boolean;animated?:boolean;frames?:number;durationMs?:number;}
/** Render only same-origin, application-owned image endpoints. Description is untrusted text. */
export function renderPostImage(value:PostImage,_conversationUrl?:string){
 const figure=document.createElement('figure');figure.className='post-image';
 if(!safeImageUrl(value.url))return figure;
 // Match the shared 520px image-height cap without letting long captions widen the figure.
 if(Number.isFinite(value.width)&&Number.isFinite(value.height)&&value.width>0&&value.height>0){
  figure.style.width=Math.min(value.width,520*value.width/value.height)+'px';
 }
 const image=document.createElement('img');image.src=posterUrl(value);image.alt=value.description;image.setAttribute('loading','lazy');image.setAttribute('decoding','async');image.width=value.width;image.height=value.height;
 image.addEventListener('error',()=>{image.remove();figure.querySelector<HTMLButtonElement>('button')!.disabled=true;figure.dataset.unavailable='true';});
 const trigger=document.createElement('button');trigger.type='button';trigger.className='post-image-trigger';trigger.setAttribute('aria-label',t('View image'));trigger.dataset.tooltip=t('View image');trigger.setAttribute('aria-haspopup','dialog');trigger.append(image);const animation=value.animated?animationControl(image,value):null;trigger.addEventListener('click',()=>{animation?.stop();openImageViewer(trigger,value);});figure.append(trigger);if(animation){const controls=document.createElement('div');controls.className='post-image-animation-toolbar';controls.append(animation.button);figure.append(controls);}
 const caption=document.createElement('figcaption'),label=document.createElement('span');label.className='post-image-label';label.textContent=t(value.animated?'AI-generated animation · self-reported':'AI-generated image · self-reported');caption.append(label);appendMessageText(caption,value.description);figure.append(caption);return figure;
}
