// Original, deterministic vector diagrams; deliberately not UI screenshots.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const copy=JSON.parse(await readFile(new URL('../src/lib/binary-blog.json',import.meta.url),'utf8'));
const dir=new URL('../public/images/blog/binary/',import.meta.url);await mkdir(dir,{recursive:true});
const xml=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const digits=[1,4,2,5,3,6],weights=[8,4,2,1];
const dot=(x,y,r,on)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${on?'#567d3e':'#e4e9e0'}" stroke="${on?'#365625':'#bdcbb3'}" stroke-width="2"/>${on?`<circle cx="${x}" cy="${y}" r="${r*.2}" fill="#fff" opacity=".8"/>`:''}`;
const text=(x,y,size,value)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="#243b40" font-family="system-ui,sans-serif" font-size="${size}">${xml(String(value))}</text>`;
const wrap=(w,h,title,desc,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${xml(title)}</title><desc id="desc">${xml(desc)}</desc><rect width="${w}" height="${h}" rx="24" fill="#f2f5ef"/>${body}</svg>\n`;
for(const [lang,c] of Object.entries(copy)){
 let cover='';
 c.diagramLabels.forEach((label,i)=>cover+=text(270+i*230,85,28,label));
 weights.forEach((weight,row)=>cover+=text(100,180+row*80,28,weight));
 digits.forEach((value,col)=>{
  const x=230+Math.floor(col/2)*230+(col%2)*80;
  weights.forEach((bit,row)=>cover+=dot(x,170+row*80,22,Boolean(value&bit)));
  cover+=text(x,475,32,value);
 });
 cover+=text(500,565,48,'14 : 25 : 36');
 await writeFile(new URL(`read-${lang}.svg`,dir),wrap(1000,620,c.title,c.coverCaption,cover));
 let variants='';
 c.modeLabels.forEach((label,index)=>{
  const left=20+index*330;
  variants+=`<rect x="${left}" y="25" width="300" height="390" rx="18" fill="#fbfcf9" stroke="#bdcbb3"/>`+text(left+150,70,21,label);
  digits.forEach((value,col)=>weights.forEach((bit,row)=>variants+=dot(left+55+col*38,125+row*37,9,Boolean(value&bit))));
  if(index===1)variants+=text(left+150,335,30,'14:25:36');
  if(index===2)'142536'.split('').forEach((n,col)=>{
   const x=left+41+col*38;
   variants+=`<rect x="${x}" y="290" width="30" height="48" rx="4" fill="#d9e5ca"/>`+text(x+15,326,30,n)+`<path d="M${x} 314h30" stroke="#567d3e" stroke-opacity=".5"/>`;
  });
 });
 await writeFile(new URL(`views-${lang}.svg`,dir),wrap(1000,440,c.title,c.variantsCaption,variants));
}
