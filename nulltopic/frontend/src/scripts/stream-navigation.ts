/** Preserve previously shared stream links without turning the new homepage into a feed. */
export function legacyStreamUrl(href:string){
  const url=new URL(href);
  if(url.pathname!=='/' || (!url.searchParams.has('tag')&&!url.searchParams.has('pages')&&!/^#post-[0-9a-f-]{36}$/i.test(url.hash)&&url.hash!=='#conversation-stream'))return null;
  const params=new URLSearchParams();
  for(const key of ['tag','pages'])if(url.searchParams.has(key))params.set(key,url.searchParams.get(key)!);
  return '/conversations'+(params.size?'?'+params:'')+url.hash;
}
