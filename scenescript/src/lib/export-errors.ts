/** WebCodecs/storage failures may be DOMExceptions or even non-Error rejections. */
export function exportErrorInfo(error:unknown){
 const value=error!==null&&typeof error==='object'?error as {name?:unknown;message?:unknown;stack?:unknown}:null;
 const name=typeof value?.name==='string'?value.name:'';
 const message=typeof value?.message==='string'&&value.message.trim()?value.message:typeof error==='string'&&error.trim()?error:name||String(error);
 const detail=typeof value?.stack==='string'?value.stack:[name,message].filter(Boolean).join(': ');
 return {name,message,detail};
}
/** Only the user's cancel action or a dismissed save picker is a normal cancellation. */
export function isExportCancellation(error:unknown,userCancelled:boolean,pickingFile:boolean){
 return userCancelled||pickingFile&&exportErrorInfo(error).name==='AbortError';
}
