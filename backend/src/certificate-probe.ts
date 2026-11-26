import tls from 'node:tls';
import {Resolver} from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import type {CertificateConfig,CertificateTarget} from './certificate-config.js';
export type CertificateStatus='ok'|'warning'|'critical'|'expired'|'error'|'unchecked';
export type CertificateResult=CertificateTarget&{status:CertificateStatus;error:string|null;subject:string|null;issuer:string|null;subjectAltName:string|null;fingerprint:string|null;validFrom:string|null;validTo:string|null;daysRemaining:number|null;lastCheckedAt:string|null};
export const certificateRank:Record<CertificateStatus,number>={error:0,expired:1,critical:2,warning:3,unchecked:4,ok:5};
export function publicAddress(address:string){
 try{
  const parsed=ipaddr.parse(address);
  return parsed.range()==='unicast'&&(parsed.kind()==='ipv4'||parsed.match(ipaddr.parse('2000::'),3));
 }catch{return false;}
}
export function classifyCertificate(validFrom:number,validTo:number,error:string|null,now:number,warningDays:number,criticalDays:number):CertificateStatus{
 if(!Number.isFinite(validTo)||!Number.isFinite(validFrom))return 'error';
 if(validTo<=now)return 'expired';
 if(validFrom>now||error)return 'error';
 const remaining=(validTo-now)/86400000;
 return remaining<=criticalDays?'critical':remaining<=warningDays?'warning':'ok';
}
export function emptyCertificate(target:CertificateTarget):CertificateResult{
 return {...target,status:'unchecked',error:null,subject:null,issuer:null,subjectAltName:null,fingerprint:null,validFrom:null,validTo:null,daysRemaining:null,lastCheckedAt:null};
}
async function resolveHost(host:string,signal:AbortSignal){
 const resolver=new Resolver();
 const abort=()=>resolver.cancel();signal.addEventListener('abort',abort,{once:true});
 try{
  const results=await Promise.allSettled([resolver.resolve4(host),resolver.resolve6(host)]);
  return results.flatMap(result=>result.status==='fulfilled'?result.value:[]);
 }finally{signal.removeEventListener('abort',abort);}
}
function name(value:Record<string,unknown>|undefined){
 return value?Object.entries(value).map(([key,v])=>key+'='+String(v).slice(0,300)).join(', ').slice(0,2000):null;
}
export async function inspectCertificate(target:CertificateTarget,options:Pick<CertificateConfig,'timeoutMs'|'warningDays'|'criticalDays'>&{signal?:AbortSignal},dependencies:{resolve?:typeof resolveHost;connect?:(options:tls.ConnectionOptions)=>tls.TLSSocket}={}):Promise<CertificateResult>{
 const result=emptyCertificate(target);result.lastCheckedAt=new Date().toISOString();
 const controller=new AbortController();
 return new Promise(resolve=>{
  let socket:tls.TLSSocket|undefined,settled=false;
  const finish=(error?:string)=>{
   if(settled)return;settled=true;clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);controller.abort();socket?.destroy();
   if(error){result.status='error';result.error=error;}
   resolve(result);
  };
  // Covers both DNS and the entire TLS handshake, not just idle socket time.
  const cancel=()=>finish('CHECK_CANCELLED');
  const timer=setTimeout(()=>finish('TLS_TIMEOUT'),options.timeoutMs);
  options.signal?.addEventListener('abort',cancel,{once:true});
  if(options.signal?.aborted){cancel();return;}
  void (async()=>{
   const addresses=await (dependencies.resolve||resolveHost)(target.host,controller.signal);
   if(settled)return;
   if(!addresses.length){finish('DNS_FAILED');return;}
   // Reject mixed public/private answers and pin the chosen address against DNS rebinding.
   if(addresses.some(address=>!publicAddress(address))){finish('PRIVATE_ADDRESS_BLOCKED');return;}
   socket=(dependencies.connect||tls.connect)({host:addresses[0],port:target.port,servername:target.host,minVersion:'TLSv1.2',rejectUnauthorized:false});
   socket.once('secureConnect',()=>{
    try{
     const cert=socket!.getPeerCertificate();
     if(!cert||!Object.keys(cert).length){finish('NO_CERTIFICATE');return;}
     const now=Date.now(),from=Date.parse(cert.valid_from),to=Date.parse(cert.valid_to);
     const identity=tls.checkServerIdentity(target.host,cert);
     const authorization=socket!.authorizationError;
     result.error=(identity as NodeJS.ErrnoException|undefined)?.code||(authorization?String(typeof authorization==='string'?authorization:(authorization as NodeJS.ErrnoException).code||'TLS_UNTRUSTED').slice(0,100):null);
     result.validFrom=Number.isFinite(from)?new Date(from).toISOString():null;result.validTo=Number.isFinite(to)?new Date(to).toISOString():null;
     result.daysRemaining=Number.isFinite(to)?Math.ceil((to-now)/86400000):null;
     result.subject=name(cert.subject);result.issuer=name(cert.issuer);result.subjectAltName=cert.subjectaltname?.slice(0,4000)||null;result.fingerprint=cert.fingerprint256||null;
     result.status=classifyCertificate(from,to,result.error,now,options.warningDays,options.criticalDays);
     finish();
    }catch{finish('TLS_INSPECTION_FAILED');}
   });
   socket.once('error',()=>finish('TLS_CONNECTION_FAILED'));
  })().catch(()=>finish('TLS_CONNECTION_FAILED'));
 });
}
