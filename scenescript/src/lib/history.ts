function clone<T>(value:T):T{
 if(Array.isArray(value))return value.map(v=>clone(v)) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clone(v)])) as T;
 return value;
}
/** Immutable snapshots. Large data-URL strings are immutable and shared by JS clones. */
export class History<T>{
 private past:T[]=[];private future:T[]=[];private latest:T;private key='';private stamp=0;
 private limit:number;
 constructor(value:T,limit=30){this.limit=limit;this.latest=clone(value);}
 record(value:T,key='',now=Date.now()){
  if(!key||key!==this.key||!key.startsWith('gesture:')&&now-this.stamp>600||this.future.length){this.past.push(this.latest);if(this.past.length>this.limit)this.past.shift();}
  this.latest=clone(value);this.future=[];this.key=key;this.stamp=now;
 }
 reset(value:T){this.past=[];this.future=[];this.latest=clone(value);this.key='';}
 undo():T|undefined{if(!this.past.length)return;const value=this.past.pop()!;this.future.push(this.latest);this.latest=value;this.key='';return clone(value);}
 redo():T|undefined{if(!this.future.length)return;const value=this.future.pop()!;this.past.push(this.latest);this.latest=value;this.key='';return clone(value);}
 get canUndo(){return this.past.length>0;}get canRedo(){return this.future.length>0;}
}
