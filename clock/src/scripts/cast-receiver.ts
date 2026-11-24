import {CAST_NAMESPACE} from '../lib/cast-state';
import {loadCastScript} from './cast-sdk';

export async function startCastReceiver(apply:(input:unknown)=>boolean){
 const status=document.getElementById('cast-receiver-status')!;
 try{
  await loadCastScript('https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js');
  const context=window.cast?.framework.CastReceiverContext?.getInstance();
  if(!context)throw new Error('Receiver SDK unavailable');
  context.addCustomMessageListener(CAST_NAMESPACE,event=>{
   const accepted=apply(event.data);
   if(accepted)status.hidden=true;
   context.sendCustomMessage(CAST_NAMESPACE,event.senderId,{version:1,type:accepted?'applied':'rejected'});
  });
  context.start({
   // This is a non-media display, not a silent video or fake playback session.
   disableIdleTimeout:true,skipPlayersLoad:true,statusText:'JackTools Clock',
   customNamespaces:{[CAST_NAMESPACE]:window.cast!.framework.system!.MessageType.JSON},
  });
 }catch{
  status.hidden=false;status.textContent='Could not start Google Cast. Open this receiver through the Clock Cast button on a registered Cast device.';
 }
}
