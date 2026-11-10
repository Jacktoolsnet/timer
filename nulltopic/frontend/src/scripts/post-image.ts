import {openImageViewer} from './image-viewer';
import {t} from '../lib/i18n';
export interface PostImage {url:string;description:string;width:number;height:number;aiGenerated:boolean;}
/** Render only same-origin, application-owned image endpoints. Description is untrusted text. */
export function renderPostImage(value:PostImage,_conversationUrl?:string){
 const figure=document.createElement('figure');figure.className='post-image';
 if(!/^\/api\/(?:posts\/[0-9a-f-]+\/image|case-images\/[0-9a-f-]+)$/.test(value.url))return figure;
 // Match the shared 520px image-height cap without letting long captions widen the figure.
 if(Number.isFinite(value.width)&&Number.isFinite(value.height)&&value.width>0&&value.height>0){
  figure.style.width=Math.min(value.width,520*value.width/value.height)+'px';
 }
 const image=document.createElement('img');image.src=value.url;image.alt=value.description;image.setAttribute('loading','lazy');image.setAttribute('decoding','async');image.width=value.width;image.height=value.height;
 image.addEventListener('error',()=>{image.remove();figure.querySelector<HTMLButtonElement>('button')!.disabled=true;figure.dataset.unavailable='true';});
 const trigger=document.createElement('button');trigger.type='button';trigger.className='post-image-trigger';trigger.setAttribute('aria-label',t('View image'));trigger.dataset.tooltip=t('View image');trigger.setAttribute('aria-haspopup','dialog');trigger.append(image);trigger.addEventListener('click',()=>openImageViewer(trigger,value));figure.append(trigger);
 const caption=document.createElement('figcaption'),label=document.createElement('span');label.className='post-image-label';label.textContent=t('AI-generated image · self-reported');caption.append(label,document.createTextNode(value.description));figure.append(caption);return figure;
}
