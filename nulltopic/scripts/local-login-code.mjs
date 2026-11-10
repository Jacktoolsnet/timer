import {readdir,readFile,stat} from 'node:fs/promises';
/** Local synthetic fixtures only. Never use this to read a person's mailbox. */
export async function localLoginCode(handle,since){
 if(process.env.NODE_ENV!=='development'||process.env.MAIL_MODE!=='local'||!/^local_test_[a-z0-9]+$/.test(handle))throw Error('Email-code automation is restricted to synthetic local fixtures');
 const directory=new URL('../.local/mail/',import.meta.url),matches=[];
 for(const file of await readdir(directory)){
  if(!file.endsWith('.json'))continue;
  const path=new URL(file,directory),metadata=await stat(path);
  if(metadata.mtimeMs<since||metadata.mtimeMs<Date.now()-300_000)continue;
  const mail=JSON.parse(await readFile(path,'utf8'));
  if(mail.to!==handle+'@example.invalid')continue;
  const code=mail.text.match(/^\d{6}$/m)?.[0];
  if(code)matches.push({code,time:metadata.mtimeMs});
 }
 matches.sort((a,b)=>b.time-a.time);
 if(!matches.length)throw Error('Synthetic local sign-in email was not received');
 return matches[0].code;
}
