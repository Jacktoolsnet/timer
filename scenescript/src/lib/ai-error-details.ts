/** Untrusted provider diagnostics: bounded plain text, allowlisted fields, no raw payload dump. */
export function providerErrorDetails(provider:'openai'|'elevenlabs',key:string,payload:unknown,httpStatus?:number,requestId?:string|null){
 const clean=(value:unknown,max=2000)=>{
  if(typeof value!=='string')return '';
  let result=value.split(key||'\0').join('[REDACTED]');
  result=result.replace(/\bsk-[a-zA-Z0-9_.*-]{6,}/g,'[REDACTED]')
   .replace(/\bBearer\s+[^\s"'<>]+/gi,'Bearer [REDACTED]')
   .replace(/((?:authorization|xi-api-key|api[_ -]?key)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,'$1[REDACTED]')
   .replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,'');
  return result.length>max?result.slice(0,max)+'…':result;
 };
 const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const root=object(payload),error=root.error??root.detail,fields=object(error);
 const message=clean(typeof error==='string'?error:fields.message),lines:string[]=[];
 if(httpStatus)lines.push((provider==='openai'?'OpenAI':'ElevenLabs')+' · HTTP '+httpStatus);
 if(message)lines.push(message);
 for(const name of ['type','code','param','status']){const value=clean(fields[name],200);if(value)lines.push(name+': '+value);}
 const reason=clean(object(root.incomplete_details).reason,300);if(reason)lines.push('reason: '+reason);
 const request=clean(requestId,200);if(request)lines.push('request_id: '+request);
 return lines.join('\n');
}
