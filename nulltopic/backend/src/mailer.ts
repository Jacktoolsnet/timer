import nodemailer from 'nodemailer';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
export interface Mail {to:string;subject:string;text:string;}
export interface Mailer {available:boolean;send:(message:Mail)=>Promise<void>;}
/** Configuration is backend-only; no SMTP traffic occurs until an explicit account request. */
export function createMailer(localDirectory=new URL('../../.local/mail/',import.meta.url)):Mailer {
 const mode=process.env.MAIL_MODE || 'disabled';
 if(mode==='disabled')return{available:false,send:async()=>{throw Error('Mail unavailable');}};
 if(mode==='local'){
  const origin=new URL(process.env.PUBLIC_ORIGIN || 'http://localhost:4321');
  if(process.env.NODE_ENV!=='development'||!['localhost','127.0.0.1','[::1]'].includes(origin.hostname))throw Error('Local mail requires development and a loopback PUBLIC_ORIGIN');
  return{available:true,send:async message=>{const dir=localDirectory;await mkdir(dir,{recursive:true,mode:0o700});await writeFile(new URL(randomUUID()+'.json',dir),JSON.stringify(message),{mode:0o600,flag:'wx'});}};
 }
 if(mode!=='smtp')throw Error('MAIL_MODE must be disabled, local or smtp');
 const host=process.env.MAIL_SERVER_SMTP,port=Number(process.env.MAIL_PORT_SMTP),user=process.env.MAIL_USER,pass=process.env.MAIL_PASSWORD,from=process.env.MAIL_ADDRESS;
 if(!host||!Number.isInteger(port)||port<1||port>65535||!user||!pass||!z.email().max(254).safeParse(from).success)throw Error('Complete MAIL_SERVER_SMTP, MAIL_PORT_SMTP, MAIL_USER, MAIL_PASSWORD and MAIL_ADDRESS');
 const transport=nodemailer.createTransport({host,port,secure:port===465,requireTLS:true,auth:{user,pass},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
 return{available:true,send:async message=>{const result=await transport.sendMail({from,...message});if(!result.accepted?.length)throw Error('Mail not accepted');}};
}
