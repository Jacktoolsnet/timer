import type {TvSnapshot} from './tv';

export const receiverDisplayKey='jacktools.clock.receiver-display.v1';
const choices={
 view:['analog','digital','flip','binary','combined','analogFlip','binaryDigital','binaryFlip','orbit','sundial'],
 analogReadout:['off','digital','flip'],binaryReadout:['off','digital','flip'],orbitReadout:['off','digital','flip'],sundialReadout:['off','digital','flip'],
 analogDesign:['standard','roman','minimal','railway','square-standard','square-roman','square-minimal','square-railway'],
 background:['none','landscape','mountains','sea','city','sky','pattern','forest','stars','dunes','aurora','lake','gradient','seasonal'],
 hemisphere:['north','south'],date:['off','short','medium','long'],dateView:['textDate','calendarDate','elegantDate','flipDate'],format:['short','medium','long'],hourCycle:['auto','12','24']
};
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
/** A strict display-only allowlist. Never retain coordinates, sender labels or credentials. */
export function receiverDisplay(input:unknown):TvSnapshot|undefined{
 if(!record(input)||input.version!==1||!record(input.settings)||!record(input.appearance))return;
 const settings:TvSnapshot['settings']={};
 for(const [key,values] of Object.entries(choices)){
  const value=input.settings[key];if(typeof value!=='string'||!values.includes(value))return;
  settings[key]=value;
 }
 for(const key of ['animateBackground','seconds','numbers','smooth']){
  const value=input.settings[key];if(typeof value!=='boolean')return;settings[key]=value;
 }
 const transparency=input.settings.transparency,zone=input.settings.zone;
 if(typeof transparency!=='number'||!Number.isInteger(transparency)||transparency<0||transparency>100||typeof zone!=='string'||zone.length>80||zone==='local')return;
 try{new Intl.DateTimeFormat('en',{timeZone:zone});}catch{return;}
 settings.transparency=transparency;settings.zone=zone;
 const appearance:TvSnapshot['appearance']={palette:'green',style:'technical',theme:'light',fontSize:'0'};
 for(const [key,values] of Object.entries({palette:['terracotta','blue','green','orange','red','violet','teal','rose'],style:['warm','minimal','technical','soft'],theme:['light','dark'],fontSize:['0','1','2','3']})){
  const value=input.appearance[key];if(typeof value!=='string'||!values.includes(value))return;
  appearance[key as keyof typeof appearance]=value;
 }
 if(typeof input.language!=='string'||!['de','en','es','fr'].includes(input.language))return;
 const displayScale=input.displayScale===undefined?100:input.displayScale;
 if(typeof displayScale!=='number'||!Number.isInteger(displayScale)||displayScale<60||displayScale>100)return;
 return {version:1,language:input.language,settings,appearance,displayScale};
}
export function clearReceiverDisplay(){try{localStorage.removeItem(receiverDisplayKey);}catch{/* Storage may be blocked. */}}
export function saveReceiverDisplay(snapshot:TvSnapshot){
 try{const safe=receiverDisplay(snapshot);if(safe)localStorage.setItem(receiverDisplayKey,JSON.stringify(safe));}catch{/* Streaming works even if the browser cannot remember its display. */}
}
export function loadReceiverDisplay(){
 try{
  const raw=localStorage.getItem(receiverDisplayKey);if(!raw)return;
  const safe=raw.length<=10000?receiverDisplay(JSON.parse(raw)):undefined;
  if(!safe)clearReceiverDisplay();return safe;
 }catch{clearReceiverDisplay();return undefined;}
}
