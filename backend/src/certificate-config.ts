import {readFileSync,statSync} from 'node:fs';
import {isIP} from 'node:net';
import cron from 'node-cron';
import type {Env} from './config.js';

export type CertificateTarget={targetKey:string;host:string;port:number;origin:string;label:string;source:string};
const invalid=(name:string):never=>{throw new Error('Invalid configuration: '+name);};
function integer(env:Env,key:string,fallback:number,min:number,max:number){
 const value=env[key]===undefined||env[key]===''?fallback:Number(env[key]);
 return Number.isSafeInteger(value)&&value>=min&&value<=max?value:invalid(key);
}
function bool(env:Env,key:string,fallback:boolean){
 if(env[key]===undefined||env[key]==='')return fallback;
 if(!['true','false'].includes(env[key]!))return invalid(key);
 return env[key]==='true';
}
function mailbox(value:string,key:string){
 if(value.length>254||! /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value))return invalid(key);
 return value;
}
export function parseCertificateTarget(raw:string,source='CERT_MONITOR_DOMAINS'):CertificateTarget{
 if(raw.length>1000||/[\r\n\x00-\x1f\x7f]/.test(raw))return invalid(source);
 const separator=raw.includes('|')?raw.indexOf('|'):raw.indexOf('=');
 const label=separator<0?'':raw.slice(0,separator).trim();
 const address=(separator<0?raw:raw.slice(separator+1)).trim();
 let url:URL;try{url=new URL(address.includes('://')?address:'https://'+address);}catch{return invalid(source);}
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||isIP(host.replace(/^\[|\]$/g,''))||host.length>253||!host.includes('.')||host.endsWith('.localhost')||!host.split('.').every(part=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part))||label.length>120)return invalid(source);
 const port=url.port?Number(url.port):443;
 if(!Number.isInteger(port)||port<1||port>65535)return invalid(source);
 return {targetKey:host+':'+port,host,port,origin:'https://'+host+(port===443?'':':'+port),label:label||host,source};
}
export function certificateConfig(env:Env,automatic:string[]=[]){
 const targets=new Map<string,CertificateTarget>();
 function add(value:string,source:string){
  for(const entry of value.split(/[\n,;]/).map(v=>v.trim()).filter(Boolean)){
   const target=parseCertificateTarget(entry,source),old=targets.get(target.targetKey);
   targets.set(target.targetKey,old?{...target,label:old.label===target.label?old.label:old.label+', '+target.label,source:old.source+', '+source}:target);
  }
 }
 for(const value of automatic)if(value.startsWith('https://'))add(value,'JackTools');
 for(const key of Object.keys(env).filter(k=>k==='CERT_MONITOR_DOMAINS'||/^CERT_MONITOR_DOMAINS_[A-Z0-9_]+$/i.test(k)&&k!=='CERT_MONITOR_DOMAINS_FILE').sort())add(env[key]||'',key);
 if(env.CERT_MONITOR_DOMAINS_FILE){
  try{if(statSync(env.CERT_MONITOR_DOMAINS_FILE).size>65536)return invalid('CERT_MONITOR_DOMAINS_FILE');add(readFileSync(env.CERT_MONITOR_DOMAINS_FILE,'utf8'),'CERT_MONITOR_DOMAINS_FILE');}
  catch{return invalid('CERT_MONITOR_DOMAINS_FILE');}
 }
 if(targets.size>50)return invalid('CERT_MONITOR_DOMAINS (maximum 50 targets)');
 const schedule=env.CERT_MONITOR_CRON||'40 0 * * *',timezone=env.CERT_MONITOR_TIMEZONE||'Europe/Berlin';
 if(schedule.length>100||!cron.validate(schedule))return invalid('CERT_MONITOR_CRON');
 try{new Intl.DateTimeFormat('en',{timeZone:timezone});}catch{return invalid('CERT_MONITOR_TIMEZONE');}
 const warningDays=integer(env,'CERT_MONITOR_WARNING_DAYS',30,1,365);
 const criticalDays=integer(env,'CERT_MONITOR_CRITICAL_DAYS',14,1,365);
 if(criticalDays>warningDays)return invalid('CERT_MONITOR_CRITICAL_DAYS');
 const host=env.MAIL_SERVER_SMTP||env.MAIL_SERVER_OUT||env.MAIL_HOST||'';
 const user=env.MAIL_USER||'',pass=env.MAIL_PASSWORD||'';
 const recipient=env.CERT_MONITOR_NOTIFY_EMAIL||env.ROOT_EMAIL||'';
 if(recipient)mailbox(recipient,'CERT_MONITOR_NOTIFY_EMAIL');
 const from=env.MAIL_FROM||env.MAIL_ADDRESS||user;
 let mail:{host:string;port:number;secure:boolean;user:string;pass:string;from:string}|undefined;
 if(host||user||pass){
  if(!host||!user||!pass||/[\s/\x00-\x1f]/.test(host))return invalid('MAIL_SERVER_SMTP / MAIL_USER / MAIL_PASSWORD');
  const port=integer(env,'MAIL_PORT_SMTP',Number(env.MAIL_PORT||587),1,65535);
  if(env.MAIL_TLS_IGNORE_INVALID==='true')return invalid('MAIL_TLS_IGNORE_INVALID (not supported)');
  mail={host,port,secure:bool(env,'MAIL_SECURE',port===465),user,pass,from:mailbox(from,'MAIL_FROM')};
 }
 return {enabled:bool(env,'CERT_MONITOR_ENABLED',false),schedule,timezone,warningDays,criticalDays,
  timeoutMs:integer(env,'CERT_MONITOR_TIMEOUT_MS',8000,1000,30000),checkOnStart:bool(env,'CERT_MONITOR_CHECK_ON_START',true),
  scheduler:bool(env,'CERT_MONITOR_SCHEDULER_ENABLED',true),notifyRecovery:bool(env,'CERT_MONITOR_NOTIFY_RECOVERY',true),
  recipient,mail,targets:[...targets.values()].sort((a,b)=>a.origin.localeCompare(b.origin))};
}
export type CertificateConfig=ReturnType<typeof certificateConfig>;
