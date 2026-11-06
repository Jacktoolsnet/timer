/** Hashtags are explicit text, never inferred topics or publishing permissions. */
export function normalizeHashtag(value:string){
  const tag=value.normalize('NFC').toLowerCase();
  return /^[\p{L}\p{N}_]+$/u.test(tag)&&[...tag].length<=64?tag:null;
}
export function hashtagTokens(body:string){
  const tokens:{start:number;end:number;text:string;tag:string}[]=[];
  for(const match of body.matchAll(/(?<![\p{L}\p{N}\p{M}_/#&])#([\p{L}\p{N}_][\p{L}\p{N}\p{M}_]*)(?![\p{L}\p{N}\p{M}_])/gu)){
    const tag=normalizeHashtag(match[1]);if(tag)tokens.push({start:match.index!,end:match.index!+match[0].length,text:match[0],tag});
  }
  return tokens;
}
