import nodemailer from 'nodemailer';
import type {CertificateConfig} from './certificate-config.js';
import type {CertificateResult} from './certificate-probe.js';
export type CertificateMail={subject:string;text:string;html:string};
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function certificateMessage(results:CertificateResult[]):CertificateMail{
 const subject='[JackTools] Zertifikatsprüfung: '+results.filter(r=>r.status!=='ok').length+' Warnungen, '+results.filter(r=>r.status==='ok').length+' Entwarnungen';
 const items=results.map(row=>[row.label,row.origin,'Status: '+row.status,'Gültig bis: '+(row.validTo||'—'),'Resttage: '+(row.daysRemaining??'—'),'Prüfzeit: '+row.lastCheckedAt,...(row.error?['TLS: '+row.error]:[])].join('\n'));
 const text='JackTools Zertifikatsprüfung\n\n'+items.join('\n\n');
 const html='<div style="font-family:system-ui,sans-serif;color:#173129;line-height:1.6;max-width:680px"><h1 style="color:#42672d">JackTools Zertifikatsprüfung</h1>'+items.map(item=>'<section style="padding:18px;margin:16px 0;border:1px solid #cad8c7;border-radius:16px;background:#f3f7f0">'+escape(item).replace(/\n/g,'<br>')+'</section>').join('')+'</div>';
 return {subject,text,html};
}
export async function sendCertificateMail(config:CertificateConfig,message:CertificateMail){
 if(!config.mail||!config.recipient)throw new Error('mail_not_configured');
 const {host,port,secure,user,pass,from}=config.mail;
 const transport=nodemailer.createTransport({host,port,secure,requireTLS:!secure,auth:{user,pass},
  connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,dnsTimeout:10000,
  tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},disableFileAccess:true,disableUrlAccess:true});
 try{
  const info=await transport.sendMail({from:{name:'JackTools Support',address:from},to:config.recipient,...message});
  if(!info.accepted?.length||info.rejected?.length)throw new Error('mail_failed');
 }finally{transport.close();}
}
