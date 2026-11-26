import type {tvText} from '../lib/tv-text';

/** Accept our pairing capability only; scanning must never navigate to arbitrary URLs. */
export function pairTokenFromQr(value:string,origin:string){
 try{
  const url=new URL(value);
  if(url.origin!==origin||url.username||url.password||url.search||!/^\/(de|en|es|fr)\/pair\/?$/.test(url.pathname))return;
  const params=new URLSearchParams(url.hash.slice(1)),token=params.get('tv');
  if([...params.keys()].length===1&&token&&/^[a-f0-9]{64}$/.test(token))return token;
 }catch{/* Unrelated QR code. */}
}

export function createTvScanner(t:typeof tvText.en,found:(secret:string)=>void){
 const dialog=document.getElementById('tv-scanner-dialog') as HTMLDialogElement;
 const video=document.getElementById('tv-scanner-video') as HTMLVideoElement;
 const status=document.getElementById('tv-scanner-status')!;
 const retry=document.getElementById('tv-scanner-retry') as HTMLButtonElement;
 let stream:MediaStream|undefined,timer:number|undefined,request=0;
 function stop(){request++;window.clearTimeout(timer);stream?.getTracks().forEach(track=>track.stop());stream=undefined;video.pause();video.srcObject=null;}
 function close(){stop();if(dialog.open)dialog.close();}
 async function start(){
  stop();const current=request;retry.hidden=true;status.textContent=t.cameraStarting;
  if(!dialog.open)dialog.showModal();
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){status.textContent=t.cameraUnavailable;retry.hidden=false;return;}
  try{
   const incoming=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   if(current!==request||!dialog.open){incoming.getTracks().forEach(track=>track.stop());return;}
   stream=incoming;video.srcObject=stream;
   incoming.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>{if(current===request){stop();status.textContent=t.cameraUnavailable;retry.hidden=false;}}));
   await video.play();
   const {default:decode}=await import('jsqr');
   if(current!==request||!dialog.open)return;
   const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
   if(!context)throw new Error('canvas_unavailable');status.textContent=t.scanHint;
   function scan(){
    if(current!==request||!dialog.open)return;
    try{
     if(video.readyState>=2&&video.videoWidth&&video.videoHeight){
      const scale=Math.min(1,640/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
      context!.drawImage(video,0,0,canvas.width,canvas.height);const frame=context!.getImageData(0,0,canvas.width,canvas.height);
      const result=decode(frame.data,frame.width,frame.height,{inversionAttempts:'dontInvert'});
      if(result){const secret=pairTokenFromQr(result.data,location.origin);if(secret){close();found(secret);return;}status.textContent=t.scanInvalid;}
     }
     timer=window.setTimeout(scan,180);
    }catch{stop();status.textContent=t.cameraUnavailable;retry.hidden=false;}
   }
   scan();
  }catch(error){
   if(current!==request||!dialog.open)return;
   stop();status.textContent=error instanceof DOMException&&['NotAllowedError','PermissionDeniedError'].includes(error.name)?t.cameraDenied:t.cameraUnavailable;retry.hidden=false;
  }
 }
 document.getElementById('tv-scan')!.addEventListener('click',()=>void start());
 document.getElementById('tv-scanner-close')!.addEventListener('click',close);
 retry.addEventListener('click',()=>void start());dialog.addEventListener('cancel',stop);dialog.addEventListener('close',()=>{if(!dialog.open)stop();});
 document.getElementById('tv-dialog')!.addEventListener('close',close);
 window.addEventListener('pagehide',close);document.addEventListener('visibilitychange',()=>{if(document.hidden)close();});
 return {close};
}
