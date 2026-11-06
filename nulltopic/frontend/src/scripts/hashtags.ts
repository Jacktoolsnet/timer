import {hashtagTokens} from '../../../shared/hashtags';
export function appendHashtagText(target:HTMLElement,body:string,conversationUrl?:string){
  function plain(value:string){
    if(!value)return;
    if(conversationUrl){const link=document.createElement('a');link.className='message-text-link';link.href=conversationUrl;link.textContent=value;target.append(link);}
    else target.append(document.createTextNode(value));
  }
  let offset=0;
  for(const token of hashtagTokens(body)){
    plain(body.slice(offset,token.start));const link=document.createElement('a');link.className='hashtag';link.href='/conversations?tag='+encodeURIComponent(token.tag)+'#conversation-stream';link.textContent=token.text;link.setAttribute('aria-label','Filter conversation stream by #'+token.tag);target.append(link);offset=token.end;
  }
  plain(body.slice(offset));
}
