/** Small ZIP32 writer (stored UTF-8 files) for portable, dependency-free speech exports. */
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(data:Uint8Array){let c=0xffffffff;for(const b of data)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function textZip(files:{name:string;text:string}[]){
 if(!files.length||files.length>1000)throw new Error('ZIP: expected 1–1000 files');
 const encoder=new TextEncoder(),names=new Set<string>();
 const entries=files.map(f=>{if(!f.name||/[\\/\x00-\x1f]/.test(f.name)||names.has(f.name.toLowerCase()))throw new Error('ZIP: invalid or duplicate filename');names.add(f.name.toLowerCase());const name=encoder.encode(f.name),data=encoder.encode(f.text);if(name.length>65535||data.length>16*1024*1024)throw new Error('ZIP: file too large');return {name,data,crc:crc32(data)};});
 const localSize=entries.reduce((n,e)=>n+30+e.name.length+e.data.length,0),centralSize=entries.reduce((n,e)=>n+46+e.name.length,0);
 if(localSize+centralSize>32*1024*1024)throw new Error('ZIP: maximum 32 MiB');
 const bytes=new Uint8Array(localSize+centralSize+22),v=new DataView(bytes.buffer);let local=0,central=localSize;
 for(const e of entries){
  v.setUint32(local,0x04034b50,true);v.setUint16(local+4,20,true);v.setUint16(local+6,0x800,true);v.setUint16(local+12,33,true);v.setUint32(local+14,e.crc,true);v.setUint32(local+18,e.data.length,true);v.setUint32(local+22,e.data.length,true);v.setUint16(local+26,e.name.length,true);bytes.set(e.name,local+30);bytes.set(e.data,local+30+e.name.length);
  v.setUint32(central,0x02014b50,true);v.setUint16(central+4,20,true);v.setUint16(central+6,20,true);v.setUint16(central+8,0x800,true);v.setUint16(central+14,33,true);v.setUint32(central+16,e.crc,true);v.setUint32(central+20,e.data.length,true);v.setUint32(central+24,e.data.length,true);v.setUint16(central+28,e.name.length,true);v.setUint32(central+42,local,true);bytes.set(e.name,central+46);
  local+=30+e.name.length+e.data.length;central+=46+e.name.length;
 }
 v.setUint32(central,0x06054b50,true);v.setUint16(central+8,entries.length,true);v.setUint16(central+10,entries.length,true);v.setUint32(central+12,centralSize,true);v.setUint32(central+16,localSize,true);return bytes;
}
