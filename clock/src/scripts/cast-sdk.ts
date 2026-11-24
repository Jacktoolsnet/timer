/** Minimal boundary types for the remotely loaded Google Cast SDKs (no SDK dependency). */
export interface CastSession {
 sendMessage(namespace:string,data:unknown):Promise<void>;
 addMessageListener(namespace:string,listener:(namespace:string,message:string)=>void):void;
 removeMessageListener(namespace:string,listener:(namespace:string,message:string)=>void):void;
}
export interface CastContext {
 setOptions(options:{receiverApplicationId:string;autoJoinPolicy:string;resumeSavedSession:boolean}):void;
 addEventListener(type:string,listener:()=>void):void;
 requestSession():Promise<void>;
 getCurrentSession():CastSession|null;
 endCurrentSession(stop:boolean):void;
}
export interface ReceiverContext {
 addCustomMessageListener(namespace:string,listener:(event:{data:unknown;senderId:string})=>void):void;
 sendCustomMessage(namespace:string,senderId:string,data:unknown):void;
 start(options:Record<string,unknown>):void;
}
declare global {
 interface Window {
  __onGCastApiAvailable?:(available:boolean)=>void;
  cast?:{framework:{CastContext?:{getInstance():CastContext};CastContextEventType?:{SESSION_STATE_CHANGED:string};CastReceiverContext?:{getInstance():ReceiverContext};system?:{MessageType:{JSON:string}}}};
 }
}
export function loadCastScript(src:string):Promise<void>{
 return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=src;script.async=true;
  script.onload=()=>resolve();script.onerror=()=>{script.remove();reject(new Error('Cast SDK could not be loaded'));};
  document.head.append(script);
 });
}
