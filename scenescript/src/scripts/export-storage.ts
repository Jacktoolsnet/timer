import {MEMORY_EXPORT_LIMIT} from '../lib/export-plan.ts';
export type VideoChunk={type:'write';position:number;data:Uint8Array<ArrayBuffer>};
export type VideoWritable={write(chunk:VideoChunk):Promise<void>;close():Promise<void>;abort(reason?:unknown):Promise<void>};
export type VideoFileHandle={createWritable():Promise<VideoWritable>};
type Picker=(options:{suggestedName:string;types:{description:string;accept:Record<string,string[]>}[]})=>Promise<VideoFileHandle>;
export type VideoDestination={stream:WritableStream<VideoChunk>;readonly bytes:number;finish():Promise<Blob|null>;abort():Promise<void>};
const TEMP_DIRECTORY='scenescript-video-exports',TEMP_TTL=24*60*60*1000;
export function canPickVideoFile(){return typeof (window as unknown as {showSaveFilePicker?:Picker}).showSaveFilePicker==='function';}
/** Must be called directly from the click handler, before dynamic imports/encoder checks. */
export function pickVideoFile(name:string,format:'mp4'|'webm'){
 const picker=(window as unknown as {showSaveFilePicker?:Picker}).showSaveFilePicker;
 if(!picker)throw new Error('exportDiskUnavailable');
 return picker.call(window,{suggestedName:name,types:[{description:format.toUpperCase(),accept:{[format==='mp4'?'video/mp4':'video/webm']:['.'+format]}}]});
}
function validChunk(chunk:VideoChunk){if(!Number.isSafeInteger(chunk.position)||chunk.position<0||!Number.isSafeInteger(chunk.position+chunk.data.byteLength))throw new Error('Invalid video write position');}
/** StreamTarget closes on cancellation too; only finish() may commit the actual file. */
export function fileVideoDestination(writable:VideoWritable,signal:AbortSignal,result:()=>Promise<Blob|null>=async()=>null,remove:()=>Promise<void>=async()=>{}):VideoDestination{
 let bytes=0,finished=false,closed=false,aborted=false;
 const stream=new WritableStream<VideoChunk>({
  async write(chunk){signal.throwIfAborted();if(aborted)throw new DOMException('Aborted','AbortError');validChunk(chunk);await writable.write(chunk);bytes=Math.max(bytes,chunk.position+chunk.data.byteLength);},
  // Do not close the disk transaction here: Output.cancel() also calls this.
  close(){},
 });
 return {stream,get bytes(){return bytes;},async finish(){signal.throwIfAborted();if(aborted)throw new DOMException('Aborted','AbortError');await writable.close();closed=true;const blob=await result();finished=true;return blob;},async abort(){if(finished||aborted)return;aborted=true;if(!closed)await writable.abort().catch(()=>{});await remove().catch(()=>{});}};
}
/** Short-export compatibility fallback. Blob slices preserve positional header rewrites. */
export function memoryVideoDestination(mime:string,signal:AbortSignal,limit=MEMORY_EXPORT_LIMIT):VideoDestination{
 let blob=new Blob([],{type:mime}),finished=false;
 const stream=new WritableStream<VideoChunk>({write(chunk){signal.throwIfAborted();validChunk(chunk);const end=chunk.position+chunk.data.byteLength;if(Math.max(end,blob.size)>limit)throw new Error('exportMemoryLimit');if(chunk.position>blob.size)throw new Error('Non-contiguous video write');blob=new Blob([blob.slice(0,chunk.position),chunk.data,blob.slice(end)],{type:mime});}});
 return {stream,get bytes(){return blob.size;},async finish(){signal.throwIfAborted();finished=true;return blob;},async abort(){if(!finished)blob=new Blob([],{type:mime});}};
}
async function removeCompletedExports(directory:FileSystemDirectoryHandle,before:number){
 for await(const [name,entry] of directory.entries())if(entry.kind==='file'&&name.startsWith('video-')&&name.endsWith('.tmp')){
  const file=await (entry as FileSystemFileHandle).getFile();
  // Each job creates a NEW empty file. createWritable() stages writes until close,
  // so a nonempty source file means the transaction has committed successfully.
  if(!file.size||file.lastModified>before)continue;
  await directory.removeEntry(name);
 }
}
async function cleanupOldExports(directory:FileSystemDirectoryHandle){
 try{await removeCompletedExports(directory,Date.now()-TEMP_TTL);}catch{/* Cleanup must not prevent a new export. */}
}
export async function createVideoDestination(mime:string,estimate:number,signal:AbortSignal,handle?:VideoFileHandle):Promise<VideoDestination>{
 signal.throwIfAborted();
 if(handle){const writable=await handle.createWritable();if(signal.aborted){await writable.abort().catch(()=>{});signal.throwIfAborted();}return fileVideoDestination(writable,signal);}
 if(typeof navigator!=='undefined'&&typeof navigator.storage?.getDirectory==='function'){
  let directory:FileSystemDirectoryHandle|undefined,name='';
  try{
   directory=await (await navigator.storage.getDirectory()).getDirectoryHandle(TEMP_DIRECTORY,{create:true});await cleanupOldExports(directory);signal.throwIfAborted();
   const storage=await navigator.storage.estimate().catch(()=>({} as StorageEstimate));
   if(storage.quota!==undefined&&storage.usage!==undefined&&storage.quota-storage.usage<estimate+32*1024*1024)throw new Error('exportDiskSpace');
   name=`video-${Date.now()}-${crypto.randomUUID()}.tmp`;const file=await directory.getFileHandle(name,{create:true});
   if(typeof file.createWritable!=='function')throw new DOMException('Disk writer unavailable','NotSupportedError');
   const writable=await file.createWritable(),dir=directory;
   if(signal.aborted){await writable.abort().catch(()=>{});await dir.removeEntry(name).catch(()=>{});signal.throwIfAborted();}
   return fileVideoDestination(writable,signal,async()=>{
    const result=await file.getFile();
    // Keep the disk-backed File alive for download; no giant arrayBuffer()/Blob copy.
    return result.slice(0,result.size,mime);
   },async()=>{await dir.removeEntry(name).catch(()=>{});});
  }catch(error){
   if(directory&&name)await directory.removeEntry(name).catch(()=>{});
   signal.throwIfAborted();
   if(error instanceof Error&&error.message==='exportDiskSpace')throw error;
   if(error instanceof DOMException&&error.name==='QuotaExceededError')throw new Error('exportDiskSpace');
   // Missing/blocked OPFS is allowed only for a small, explicitly bounded export.
   if(!(error instanceof DOMException&&['SecurityError','NotAllowedError','NotSupportedError'].includes(error.name)))throw error;
  }
 }
 if(estimate>MEMORY_EXPORT_LIMIT/2)throw new Error('exportDiskUnavailable');
 return memoryVideoDestination(mime,signal);
}

/** Explicit cleanup skips unfinished exports, including those running in another tab. */
export async function clearCompletedVideoExports(){
 if(typeof navigator.storage?.getDirectory!=='function')return;
 let directory:FileSystemDirectoryHandle;
 try{directory=await (await navigator.storage.getDirectory()).getDirectoryHandle(TEMP_DIRECTORY);}catch(error){if((error as DOMException).name==='NotFoundError')return;throw error;}
 await removeCompletedExports(directory,Infinity);
}
