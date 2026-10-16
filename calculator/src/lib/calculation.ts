// Exact rational arithmetic: no binary floating-point rounding in calculation chains.
export const operations = ['set','add','subtract','multiply','divide','increase','taxIn','discount','taxOut','subtotal','note'] as const;
export type Operation = typeof operations[number];
export interface Step { id: string; name: string; operation: Operation; value: string; enabled: boolean }
export interface Document { version: 1; title: string; decimals: number; roundEach: boolean; steps: Step[] }
export type Rational = { n: bigint; d: bigint };
function gcd(a: bigint,b: bigint): bigint { a=a<0n?-a:a; while(b){[a,b]=[b,a%b];} return a||1n; }
function rational(n: bigint,d=1n): Rational { if(!d)throw Error('zero'); if(d<0n){n=-n;d=-d;} const g=gcd(n,d); n/=g;d/=g; if(n.toString().length>250||d.toString().length>250)throw Error('limit'); return {n,d}; }
export function parse(value:string): Rational { const v=value.trim().replace(',','.'); if(!/^[+-]?(?:\d{1,24}(?:\.\d{0,12})?|\.\d{1,12})$/.test(v))throw Error('invalid'); const sign=v.startsWith('-')?-1n:1n;const [a,b='']=v.replace(/^[+-]/,'').split('.');return rational(sign*BigInt((a||'0')+b),10n**BigInt(b.length)); }
function add(a:Rational,b:Rational){return rational(a.n*b.d+b.n*a.d,a.d*b.d);}
function mul(a:Rational,b:Rational){return rational(a.n*b.n,a.d*b.d);}
export function fixed(a:Rational,decimals:number): string { const p=10n**BigInt(decimals);const n=a.n<0n?-a.n:a.n; let scaled=n*p/a.d; if((n*p%a.d)*2n>=a.d)scaled++;const s=scaled.toString().padStart(decimals+1,'0');return (a.n<0n&&scaled?'-':'')+(decimals?s.slice(0,-decimals)+'.'+s.slice(-decimals):s); }
export function calculate(doc:Document): {result:Rational|null; rows:{before:Rational|null; result:Rational|null; error:string|null}[]} {
 let result:Rational|null=rational(0n);const rows=[];
 for(const step of doc.steps){const before=result;let error:string|null=null;
  if(step.enabled && step.operation!=='note' && step.operation!=='subtotal'){
   try { if(!result)throw Error('blocked'); const v=parse(step.value);
    switch(step.operation){
     case 'set': result=v;break;
     case 'add':result=add(result,v);break;
     case 'subtract':result=add(result,{n:-v.n,d:v.d});break;
     case 'multiply':result=mul(result,v);break;
     case 'divide':result=mul(result,rational(v.d,v.n));break;
     case 'taxIn':
     case 'increase':result=mul(result,add(rational(1n),mul(v,rational(1n,100n))));break;
     case 'discount':result=mul(result,add(rational(1n),mul(v,rational(-1n,100n))));break;
     case 'taxOut':{const factor=add(rational(1n),mul(v,rational(1n,100n)));result=mul(result,rational(factor.d,factor.n));break;}
    }
    if(doc.roundEach){const text=fixed(result,doc.decimals);result=rational(BigInt(text.replace('.','')),10n**BigInt(doc.decimals));}
   } catch(e){ error=e instanceof Error?e.message:'invalid';result=null; }
  } else if(!result && step.enabled)error='blocked';
  rows.push({before,result,error});
 }
 return {result,rows};
}
export function emptyDocument():Document {return {version:1,title:'',decimals:2,roundEach:false,steps:[]};}
export function validateDocument(data:unknown):Document {
 const d=data as Document;if(!d||d.version!==1||typeof d.title!=='string'||d.title.length>120||!Number.isInteger(d.decimals)||d.decimals<0||d.decimals>8||typeof d.roundEach!=='boolean'||!Array.isArray(d.steps)||d.steps.length>500)throw Error('invalid');
 const ids=new Set<string>();for(const s of d.steps){if(!s||typeof s.id!=='string'||! /^[A-Za-z0-9_-]{1,80}$/.test(s.id)||ids.has(s.id)||typeof s.name!=='string'||s.name.length>120||!operations.includes(s.operation)||typeof s.enabled!=='boolean'||typeof s.value!=='string'||s.value.length>40)throw Error('invalid');ids.add(s.id);if(!['note','subtotal'].includes(s.operation))parse(s.value);}
 return structuredClone(d);
}
