import {ApiError,object} from './http.js';
const enums={
 view:['analog','digital','flip','binary','combined','analogFlip','binaryDigital','binaryFlip','orbit','sundial'],
 analogReadout:['off','digital','flip'],binaryReadout:['off','digital','flip'],orbitReadout:['off','digital','flip'],sundialReadout:['off','digital','flip'],
 analogDesign:['standard','roman','minimal','railway','square-standard','square-roman','square-minimal','square-railway'],
 background:['none','landscape','mountains','sea','city','sky','pattern','forest','stars','dunes','aurora','lake','gradient','seasonal'],
 hemisphere:['north','south'],date:['off','short','medium','long'],dateView:['textDate','calendarDate','elegantDate','flipDate'],format:['short','medium','long'],hourCycle:['auto','12','24']
};
const booleans=['animateBackground','seconds','numbers','smooth'];
const keys=[...Object.keys(enums),...booleans,'transparency','zone'];
export function validateSnapshot(input:unknown){
 const body=object(input,['version','settings','appearance','language','senderName','coordinates']);if(body.version!==1)throw new ApiError(400,'invalid_snapshot');
 const settings=object(body.settings,keys);
 for(const [key,values] of Object.entries(enums))if(!values.includes(settings[key] as string))throw new ApiError(400,'invalid_snapshot');
 for(const key of booleans)if(typeof settings[key]!=='boolean')throw new ApiError(400,'invalid_snapshot');
 if(!Number.isInteger(settings.transparency)||Number(settings.transparency)<0||Number(settings.transparency)>100)throw new ApiError(400,'invalid_snapshot');
 const zone=settings.zone;if(typeof zone!=='string'||zone.length>80||zone==='local')throw new ApiError(400,'invalid_snapshot');
 try{new Intl.DateTimeFormat('en',{timeZone:zone});}catch{throw new ApiError(400,'invalid_snapshot');}
 const appearance=object(body.appearance,['palette','style','theme','fontSize']);
 if(!['terracotta','blue','green','orange','red','violet','teal','rose'].includes(appearance.palette as string)||!['warm','minimal','technical','soft'].includes(appearance.style as string)||!['light','dark'].includes(appearance.theme as string)||!['0','1','2','3'].includes(appearance.fontSize as string)||!['de','en','es','fr'].includes(body.language as string))throw new ApiError(400,'invalid_snapshot');
 if(body.senderName!==undefined&&(typeof body.senderName!=='string'||body.senderName.trim().length===0||body.senderName.length>80||/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(body.senderName)))throw new ApiError(400,'invalid_snapshot');
 let coordinates:{latitude:number;longitude:number}|undefined;
 if(body.coordinates!==undefined){
  const value=object(body.coordinates,['latitude','longitude']);
  if(typeof value.latitude!=='number'||!Number.isFinite(value.latitude)||Math.abs(value.latitude)>90||typeof value.longitude!=='number'||!Number.isFinite(value.longitude)||Math.abs(value.longitude)>180)throw new ApiError(400,'invalid_snapshot');
  coordinates={latitude:Math.round(value.latitude*1000)/1000,longitude:Math.round(value.longitude*1000)/1000};
 }
 return {version:1,settings,appearance,language:body.language,...(coordinates?{coordinates}:{}),...(body.senderName===undefined?{}:{senderName:body.senderName})};
}
