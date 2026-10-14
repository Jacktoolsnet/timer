export type TimedAudioPacket={timestamp:number;duration:number};

/** Keep decoder history and the packet spanning two adjacent output blocks. */
export class AudioPacketStream<T extends TimedAudioPacket>{
 private iterator?:AsyncIterator<T>;private current?:T;private end?:number;
 private load:(start:number)=>AsyncIterable<T>;
 constructor(load:(start:number)=>AsyncIterable<T>){this.load=load;}
 async *range(start:number,end:number){
  // Seeks/loops need a new decoder; adjacent output chunks must not reset it.
  if(this.end!==undefined&&Math.abs(start-this.end)>1e-8)await this.dispose();
  // Warm up overlapped codecs such as AAC before a trim or seek position.
  this.iterator??=this.load(Math.max(0,start-.25))[Symbol.asyncIterator]();
  while(true){
   if(!this.current){const item=await this.iterator.next();if(item.done)break;this.current=item.value;}
   const packet=this.current;
   if(packet.timestamp>=end-1e-9)break;
   if(packet.timestamp+packet.duration>start+1e-9)yield packet;
   if(packet.timestamp+packet.duration>=end-1e-9)break;
   this.current=undefined;
  }
  this.end=end;
 }
 async dispose(){const iterator=this.iterator;this.iterator=undefined;this.current=undefined;this.end=undefined;await iterator?.return?.();}
}
