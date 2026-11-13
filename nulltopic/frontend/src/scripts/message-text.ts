import {appendHashtagText} from './hashtags';
import {t} from '../lib/i18n';
export interface ExternalLinkToken {start:number;end:number;url:string;host:string;}
/** Recognize explicit HTTP(S) text only. Never parse HTML, fetch previews or trust supplied markup. */
export function externalLinkTokens(text:string):ExternalLinkToken[]{
 const tokens:ExternalLinkToken[]=[];
 for(const match of text.matchAll(/https?:\/\/[^\s<>"'`]+/giu)){
  let raw=match[0];
  while(/[.,;!:]$/.test(raw))raw=raw.slice(0,-1);
  for(const [open,close] of [['(',')'],['[',']'],['{','}']]){
   while(raw.endsWith(close)&&raw.split(close).length>raw.split(open).length)raw=raw.slice(0,-1);
  }
  if(/[\\\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(raw))continue;
  try{
   const url=new URL(raw);
   if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password)continue;
   tokens.push({start:match.index!,end:match.index!+raw.length,url:url.href,host:url.host});
  }catch{/* Invalid URLs remain literal text. */}
 }
 return tokens;
}
export function appendMessageText(target:HTMLElement,text:string,conversationUrl?:string){
 let offset=0;
 for(const token of externalLinkTokens(text)){
  appendHashtagText(target,text.slice(offset,token.start),conversationUrl);
  const link=document.createElement('a');link.className='external-link-chip';link.href=token.url;
  link.target='_blank';link.rel='noopener noreferrer ugc nofollow';link.referrerPolicy='no-referrer';
  link.title=token.url;link.setAttribute('aria-label',t('Open external website: {url}',{url:token.url}));
  const label=document.createElement('span');label.textContent=token.host;link.append(label);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M14 3h7v7m0-7L10 14M10 3H4v17h17v-6');svg.append(path);link.append(svg);
  link.addEventListener('click',event=>event.stopPropagation());target.append(link);offset=token.end;
 }
 appendHashtagText(target,text.slice(offset),conversationUrl);
}
