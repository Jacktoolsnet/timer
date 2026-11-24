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
}
