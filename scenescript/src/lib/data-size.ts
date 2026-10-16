/** Validate Base64 without repeated regex groups (which overflow on large media). */
export function base64ByteLength(payload:string):number {
 if(!payload.length||payload.length%4)return -1;
 const padding=payload.endsWith('==')?2:payload.endsWith('=')?1:0;
 if(/[^A-Za-z0-9+/]/.test(payload.slice(0,payload.length-padding)))return -1;
 return payload.length/4*3-padding;
}
/** UTF-8 size without allocating another copy of a potentially 160 MiB input. */
export function utf8ByteLength(value:string):number {
 let bytes=value.length;
 for(let i=0;i<value.length;i++){
  const c=value.charCodeAt(i);
  if(c<0x80)continue;
  if(c<0x800){bytes++;continue;}
  if(c>=0xd800&&c<=0xdbff&&i+1<value.length){const next=value.charCodeAt(i+1);if(next>=0xdc00&&next<=0xdfff){bytes+=2;i++;continue;}}
  bytes+=2;
 }
 return bytes;
}
