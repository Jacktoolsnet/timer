// Original schematic diagrams: no screenshots, live ephemeris or implied scale.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const copy=JSON.parse(await readFile(new URL('../src/lib/clock-blog.json',import.meta.url),'utf8'));
const dir=new URL('../public/images/blog/clock/',import.meta.url);await mkdir(dir,{recursive:true});
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const text=(x,y,size,value,color='#243b40')=>`<text x="${x}" y="${y}" text-anchor="middle" fill="${color}" font-family="system-ui,sans-serif" font-size="${size}">${xml(value)}</text>`;
const wrap=(title,caption,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620" role="img" aria-labelledby="title desc"><title id="title">${xml(title)}</title><desc id="desc">${xml(caption)}</desc><rect width="1000" height="620" rx="24" fill="#f2f5ef"/>${body}</svg>\n`;
for(const [lang,c] of Object.entries(copy)){
 const [sun,shadow,pin]=c.sunDiagramLabels;
 let sundial=`<defs><radialGradient id="paper"><stop stop-color="#f5e8b8"/><stop offset="1" stop-color="#a9c2ad"/></radialGradient><linearGradient id="shade" gradientUnits="userSpaceOnUse" x1="500" y1="320" x2="405" y2="391"><stop stop-color="#243b40" stop-opacity=".8"/><stop offset="1" stop-color="#243b40" stop-opacity=".05"/></linearGradient></defs><circle cx="500" cy="320" r="225" fill="url(#paper)" stroke="#7e9b6c" stroke-width="2"/><path d="M500 110v420M290 320h420" stroke="#567d3e" stroke-dasharray="3 10" stroke-opacity=".25"/>`;
 for(let i=0;i<24;i++)sundial+=`<path d="M500 103v${i%2===0?10:5}" transform="rotate(${i*15} 500 320)" stroke="#567d3e" stroke-width="2"/>`;
 sundial+=`<path d="M500 320 405 391" stroke="url(#shade)" stroke-width="16" stroke-linecap="round"/><circle cx="500" cy="320" r="12" fill="#567d3e" stroke="#f2f5ef" stroke-width="3"/><circle cx="680" cy="185" r="32" fill="#f5df9a" opacity=".4"/><circle cx="680" cy="185" r="18" fill="#f5df9a" stroke="#7e9b6c" stroke-width="2"/>`;
 sundial+=`<g fill="none" stroke="#7e9b6c" stroke-width="2"><path d="M750 150 707 174M300 427l92-33M500 575V341"/></g>`+text(790,140,28,sun)+text(245,442,28,shadow)+text(500,605,25,pin)+text(500,65,24,'N');
 await writeFile(new URL(`sundial-${lang}.svg`,dir),wrap(c.title,c.coverCaption,sundial));
 let orbit='<defs><radialGradient id="glow"><stop stop-color="#8762b1" stop-opacity=".5"/><stop offset="1" stop-color="#8762b1" stop-opacity="0"/></radialGradient></defs><circle cx="440" cy="310" r="240" fill="#fbfafc" stroke="#c3b0d4" stroke-width="2"/>';
 for(let i=0;i<12;i++)orbit+=`<path d="M440 80v9" transform="rotate(${i*30} 440 310)" stroke="#8762b1" stroke-width="2"/>`;
 for(const radius of [205,145,85])orbit+=`<circle cx="440" cy="310" r="${radius}" fill="none" stroke="#c3b0d4" stroke-width="2"/>`;
 // A deliberate illustrative arrangement; labels identify rings rather than a time.
 orbit+='<circle cx="440" cy="310" r="48" fill="url(#glow)"/><circle cx="440" cy="310" r="14" fill="#aa85cb" stroke="#8762b1" stroke-width="2"/>';
 const bodies=[[85,-140,10],[145,130,9],[205,45,7]];
 bodies.forEach(([radius,angle,size],index)=>{
  const a=angle*Math.PI/180,x=440+radius*Math.sin(a),y=310-radius*Math.cos(a);
  orbit+=`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${size}" fill="${index===0?'#243b40':index===1?'#658369':'#8762b1'}" stroke="#fff" stroke-width="3"/>`;
 });
 c.orbitDiagramLabels.forEach((label,index)=>{
  const radius=[85,145,205][index],y=[380,310,240][index];
  orbit+=`<path d="M${440+radius} 310L725 ${y}h20" fill="none" stroke="#c3b0d4" stroke-width="2"/>`+text(835,y+8,25,label);
 });
 await writeFile(new URL(`orbit-${lang}.svg`,dir),wrap(c.title,c.orbitCaption,orbit));
}
