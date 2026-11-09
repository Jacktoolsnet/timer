import {t} from '../lib/i18n';
export interface PostImage {url:string;description:string;width:number;height:number;aiGenerated:boolean;}
/** Render only same-origin, application-owned image endpoints. Description is untrusted text. */
export function renderPostImage(value:PostImage,conversationUrl?:string){
 const figure=document.createElement('figure');figure.className='post-image';
 if(!/^\/api\/(?:posts\/[0-9a-f-]+\/image|case-images\/[0-9a-f-]+)$/.test(value.url))return figure;
 const image=document.createElement('img');image.src=value.url;image.alt=value.description;image.setAttribute('loading','lazy');image.setAttribute('decoding','async');image.width=value.width;image.height=value.height;
 image.addEventListener('error',()=>{image.remove();figure.dataset.unavailable='true';});
 if(conversationUrl){const link=document.createElement('a');link.href=conversationUrl;link.append(image);figure.append(link);}else figure.append(image);
 const caption=document.createElement('figcaption'),label=document.createElement('span');label.className='post-image-label';label.textContent=t('AI-generated image · self-reported');caption.append(label,document.createTextNode(value.description));figure.append(caption);return figure;
}
