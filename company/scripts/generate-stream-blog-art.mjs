// Original schematic vector art, not a UI capture or a functional pairing code.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const copy=JSON.parse(await readFile(new URL('../src/lib/stream-blog.json',import.meta.url),'utf8'));
const dir=new URL('../public/images/blog/stream/',import.meta.url);
await mkdir(dir,{recursive:true});
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const text=(x,y,size,value,fill='#243b40')=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" fill="'+fill+'" font-family="system-ui,sans-serif" font-size="'+size+'">'+xml(value)+'</text>';
const dial=(x,y,r)=>{
 const ticks=Array.from({length:12},(_,i)=>'<path d="M0 '+(-r+9)+'v8" transform="rotate('+i*30+')" stroke="#567d3e" stroke-width="2" stroke-linecap="round"/>').join('');
 return '<g transform="translate('+x+' '+y+')"><circle r="'+r+'" fill="#f7f9f0" stroke="#cad7be" stroke-width="2"/>'+ticks+'<path d="M0 0 '+(-r*.31)+' '+(-r*.28)+'M0 0 '+(r*.43)+' '+(r*.59)+'" fill="none" stroke="#243b40" stroke-width="5" stroke-linecap="round"/><circle r="5" fill="#567d3e"/></g>';
};
for(const [lang,c] of Object.entries(copy)){
 const art='<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#c2d9dc"/><stop offset="1" stop-color="#e6edd5"/></linearGradient><linearGradient id="case"><stop stop-color="#365747"/><stop offset="1" stop-color="#1e343b"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#243b40" flood-opacity=".16"/></filter><clipPath id="screen"><rect x="365" y="133" width="556" height="314" rx="10"/></clipPath></defs>'+
 '<rect width="1000" height="620" rx="24" fill="#f2f5ef"/><circle cx="850" cy="150" r="170" fill="#e3ead7"/>'+
 text(181,80,26,c.labels[0])+text(643,80,26,c.labels[1])+
 '<g filter="url(#shadow)"><rect x="89" y="126" width="184" height="330" rx="30" fill="url(#case)"/><rect x="99" y="137" width="164" height="307" rx="23" fill="#e5edda"/><rect x="152" y="143" width="58" height="8" rx="4" fill="#365747"/>'+
 dial(181,259,66)+text(181,370,22,'10:24')+'<circle cx="181" cy="411" r="11" fill="none" stroke="#567d3e" stroke-width="2"/>'+
 '<rect x="352" y="120" width="582" height="340" rx="22" fill="url(#case)"/><g clip-path="url(#screen)"><rect x="365" y="133" width="556" height="314" fill="url(#sky)"/><circle cx="863" cy="174" r="24" fill="#f6e6b8"/><path d="M365 380Q470 280 610 370T921 330V447H365Z" fill="#9eb88a"/><path d="M365 410Q550 345 690 414T921 380V447H365Z" fill="#6f9274"/></g>'+
 dial(560,285,108)+
 '<rect x="712" y="224" width="112" height="126" rx="12" fill="#f7f9f0"/><path d="M724 224h88a12 12 0 0 1 12 12v20H712v-20a12 12 0 0 1 12-12" fill="#789a61"/>'+
 text(768,315,48,'23')+'<path d="M617 460h52l9 31h-70Z" fill="#365747"/><rect x="567" y="490" width="152" height="10" rx="5" fill="#365747"/></g>'+
 '<path d="M286 292h46m-10-9 10 9-10 9" fill="none" stroke="#567d3e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+
 text(500,548,25,c.labels[2],'#567d3e')+text(500,588,26,c.labels[3]);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620" role="img" aria-labelledby="title desc"><title id="title">'+xml(c.title)+'</title><desc id="desc">'+xml(c.coverCaption)+'</desc>'+art+'</svg>\n';
 await writeFile(new URL('screen-'+lang+'.svg',dir),svg);
}
