// Run with Node >=24.17.0 after installing company dependencies and Playwright Chromium.
// No network, external fonts, browser preferences or live application state required.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { socialProjects, socialArtwork } from '../shared/social.ts';
const require = createRequire(new URL('../company/package.json',import.meta.url));
const { chromium } = require('@playwright/test');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const text=(x,y,label,size=24,weight=400,color='#293b35')=>`<text x="${x}" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(label)}</text>`;
const browser=await chromium.launch({headless:true});
try {
for(const project of socialProjects.filter(p=>!process.argv[2]||process.argv.slice(2).includes(p))) {
 const {name,tagline,accent}=socialArtwork[project];
 const label=(x,y,t,size=24,weight=400)=>text(x,y,t,size,weight,accent);
 let art='';
 const ring=`<circle cx="890" cy="280" r="148" fill="#fffdf8" stroke="${accent}" stroke-opacity=".15" stroke-width="10"/>`;
 if(project==='timer') art=ring+`<path d="M890 132a148 148 0 1 1-140 196" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>`+label(795,300,'25:00',68)+label(860,230,'FOCUS',15,700)+label(795,480,'Your time. Your rhythm.',18);
 if(project==='clock') art=ring+`<g stroke="${accent}" stroke-width="3">${Array.from({length:12},(_,i)=>`<path d="M890 145v12" transform="rotate(${i*30} 890 280)"/>`).join('')}</g><path d="M890 280 837 247M890 280 941 191" stroke="${accent}" stroke-width="8" stroke-linecap="round"/><circle cx="890" cy="280" r="7" fill="${accent}"/>`+label(792,485,'10:10:00',46);
 if(project==='stopwatch') art=ring+label(780,295,'00:42.8',57)+label(810,365,'LAP 03',18,700)+`<path d="M890 95v30M870 95h40" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>`+label(765,488,'01   00:14.2     02   00:13.8',19);
 if(project==='calculator') art=`<rect x="756" y="100" width="268" height="420" rx="24" fill="#fffdf8" stroke="${accent}" stroke-width="2"/><rect x="778" y="122" width="224" height="78" rx="12" fill="${accent}" fill-opacity=".1"/>`+label(868,174,'144',44)+Array.from({length:12},(_,i)=>{const x=778+i%3*77,y=225+Math.floor(i/3)*68;return `<rect x="${x}" y="${y}" width="68" height="54" rx="10" fill="${accent}" fill-opacity=".09"/>`+label(x+25,y+36,['7','8','9','4','5','6','1','2','3','+','0','='][i],25)}).join('');
 if(project==='breathe') art=[170,135,100,65].map((r,i)=>`<circle cx="890" cy="290" r="${r}" fill="${accent}" fill-opacity="${.04+i*.025}" stroke="${accent}" stroke-opacity=".15" stroke-width="2"/>`).join('')+label(839,300,'Breathe',26,600)+label(800,500,'A moment for yourself.',18);
 if(project==='relax') art=`<circle cx="988" cy="170" r="48" fill="${accent}" fill-opacity=".2"/>`+[0,1,2,3].map(i=>`<path d="M710 ${280+i*48}q60-70 120 0t120 0t120 0" fill="none" stroke="${accent}" stroke-opacity="${.8-i*.16}" stroke-width="8" stroke-linecap="round"/>`).join('')+label(785,505,'Find a little calm.',22);
 if(project==='lava') art=`<rect x="770" y="110" width="240" height="380" rx="100" fill="${accent}" fill-opacity=".07" stroke="${accent}" stroke-opacity=".3" stroke-width="2"/><path d="M830 180c-54 0-47 58-18 92s-37 79-9 121 88 7 73-38-15-61-1-96 8-79-45-79" fill="${accent}" fill-opacity=".8"/><ellipse cx="945" cy="376" rx="35" ry="53" fill="${accent}" fill-opacity=".4"/><circle cx="944" cy="204" r="25" fill="${accent}" fill-opacity=".3"/><path d="M815 510h150" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>`;
 if(project==='scenescript') art=[0,1,2].map(i=>`<rect x="${699+i*128}" y="${155+i%2*18}" width="116" height="160" rx="12" fill="#fffdf8" stroke="${accent}" stroke-width="2"/><path d="m${735+i*128} ${201+i%2*18} 44 25-44 25Z" fill="${accent}" fill-opacity=".5"/>`+label(717+i*128,290+i%2*18,'0'+(i+1),17,600)).join('')+`<path d="M700 400h380" stroke="${accent}" stroke-opacity=".3" stroke-width="6"/>`+[0,1,2].map(i=>`<rect x="${700+i*130}" y="425" width="115" height="36" rx="8" fill="${accent}" fill-opacity="${.2+i*.15}"/>`).join('')+label(758,510,'Ideas → Scenes → Stories',18);
 if(project==='company') art=socialProjects.filter(p=>p!=='company').map((p,i)=>{const x=694+i%2*208,y=124+Math.floor(i/2)*98;return `<rect x="${x}" y="${y}" width="192" height="80" rx="14" fill="#fffdf8" stroke="#dbe3d8"/>`+text(x+18,y+47,socialArtwork[p].name,21,600,socialArtwork[p].accent)}).join('');
 const iconPath=project==='company'?'jacktools-icon.svg':'favicon.svg';
 let icon=await readFile(new URL(`../${project}/public/${iconPath}`,import.meta.url),'utf8');
 icon=icon.replaceAll('#ad5239',accent);
 const domain=project==='company'?'jacktools.net':`${project}.jacktools.net`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0v48" fill="none" stroke="${accent}" stroke-opacity=".06"/></pattern></defs><rect width="1200" height="630" fill="#f3f5ef"/><rect width="1200" height="630" fill="url(#grid)"/><image x="64" y="65" width="56" height="56" href="data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}"/>${text(136,103,'jacktools.net',30,700)}${text(64,260,name,project==='scenescript'?66:76,700)}<path d="M64 298h74" stroke="${accent}" stroke-width="4"/>${text(64,357,tagline,25,400,accent)}${text(64,551,domain,23,600,accent)}<rect x="664" y="64" width="468" height="502" rx="28" fill="${accent}" fill-opacity=".04" stroke="${accent}" stroke-opacity=".15"/>${art}</svg>`;
 const dir=new URL(`../${project}/public/social/`,import.meta.url);await mkdir(dir,{recursive:true});
 await writeFile(new URL(project+'.svg',dir),svg);
 const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
 await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
 await page.screenshot({path:fileURLToPath(new URL(project+'.png',dir)),type:'png'});await page.close();
 console.log(project+': SVG and 1200×630 PNG generated');
}
} finally { await browser.close(); }
