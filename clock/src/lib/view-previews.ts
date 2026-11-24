/** Small static examples, not a second live clock. Local SVGs need no network assets. */
export const clockViews=['analog','orbit','sundial','binary','binaryDigital','binaryFlip','digital','combined','flip','analogFlip'] as const;
export const clockTypes=['analog','orbit','sundial','binary','digital','flip'] as const;
export type ClockView=typeof clockViews[number];
export function viewPreview(view:ClockView) {
 const dial='<circle cx="0" cy="0" r="22" fill="#f6f9f1" stroke="#567d3e" stroke-width="1.5"/><g stroke="#567d3e">'+Array.from({length:12},(_,i)=>`<path d="M0 -19v2" transform="rotate(${i*30})"/>`).join('')+'</g>';
 const analog=`${dial}<path d="M-11 -7 0 0 10 -12" fill="none" stroke="#243b40" stroke-width="2.5" stroke-linecap="round"/><circle r="2" fill="#567d3e"/>`;
 const orbit=`${dial}<g fill="none" stroke="#567d3e" stroke-opacity=".4"><circle r="16"/><circle r="11"/><circle r="6"/></g><g fill="#567d3e"><circle cx="-14" cy="-8" r="2"/><circle cx="9" cy="6" r="2.5"/><circle cx="-4" cy="-4" r="2.5"/><circle r="2"/></g>`;
 const digital=(y:number)=>`<text x="48" y="${y}" text-anchor="middle" fill="#243b40" font-family="monospace" font-weight="bold" font-size="14">14:25</text>`;
 const flip=(y:number,small=false)=>{
  const w=small?9:14,h=small?13:22,gap=small?2:3,start=48-(4*w+3*gap)/2;
  return '1425'.split('').map((n,i)=>`<g transform="translate(${start+i*(w+gap)} ${y})"><rect width="${w}" height="${h}" rx="2" fill="#d9e5ca"/><text x="${w/2}" y="${h*.76}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="${h*.78}" fill="#243b40">${n}</text><path d="M0 ${h/2}H${w}" stroke="#567d3e" stroke-opacity=".4" stroke-width=".7"/></g>`).join('');
 };
 const binary=(compact:boolean)=>{
  const digits=[1,4,2,5,3,6],step=compact?8:10,left=48-step*2.5,top=compact?9:13,rows=compact?7:9;
  return digits.map((digit,col)=>[8,4,2,1].map((bit,row)=>`<circle cx="${left+col*step}" cy="${top+row*rows}" r="${compact?2:2.7}" fill="${digit&bit?'#567d3e':'#dce4d6'}"/>`).join('')).join('');
 };
 let content='';
 if(view==='analog')content=`<g transform="translate(48 30)">${analog}</g>`;
 if(view==='orbit')content=`<g transform="translate(48 30)">${orbit}</g>`;
 if(view==='sundial')content='<defs><radialGradient id="day"><stop stop-color="#f5e5ad"/><stop offset="1" stop-color="#91b4a2"/></radialGradient></defs><circle cx="48" cy="30" r="23" fill="url(#day)" stroke="#567d3e"/><path d="m48 30-12-9" stroke="#243b40" stroke-opacity=".5" stroke-width="4" stroke-linecap="round"/><circle cx="48" cy="30" r="2" fill="#567d3e"/><circle cx="66" cy="43" r="3" fill="#f7e29e" stroke="#567d3e"/><text x="48" y="45" text-anchor="middle" font-family="monospace" font-size="7" fill="#243b40">14:25</text>';
 if(view==='digital')content=digital(36);
 if(view==='flip')content=flip(19);
 if(view==='combined'||view==='analogFlip')content=`<g transform="translate(48 22) scale(.7)">${analog}</g>`+(view==='combined'?digital(56):flip(43,true));
 if(view==='binary')content=binary(false);
 if(view==='binaryDigital'||view==='binaryFlip')content=binary(true)+(view==='binaryDigital'?digital(55):flip(43,true));
 return 'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="60" viewBox="0 0 96 60"><rect x=".5" y=".5" width="95" height="59" rx="6" fill="#f2f5ef" stroke="#bdcbb3"/>${content}</svg>`);
}
