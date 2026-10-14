import {backgroundImages} from './backgrounds.ts';
export const animatedScenes=backgroundImages.filter(scene=>scene!=='none');
export function animateScene(svg:string,scene:string){
 const prefix='relax-scene-'+scene+'-';
 svg=svg.replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g,'').replace(/\srole="img"|\saria-labelledby="[^"]*"/g,'');
 svg=svg.replace(/id="([^"]+)"/g,(_,id)=>`id="${prefix}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix}${id})`);
 // Move individual leaves, petals and water marks, not the entire illustration.
 svg=svg.replace(/<(ellipse|circle|path)\b[^>]*>/g,tag=>{
  let cls='';
  if(scene==='forest'&&/^<path/.test(tag)&&/fill="#(?:3c625b|829b91)"/.test(tag))cls='scene-leaves';
  if(scene==='stars'&&/^<circle/.test(tag)&&!tag.includes('r="73"'))cls='scene-star';
  if(scene==='lake'&&tag.includes('url(#'+prefix+'reflection)'))cls='scene-water';
  if(scene==='dunes'&&tag.includes('stroke="#e6c3a0"'))cls='scene-sand';

  if((scene==='summer-garden'||scene==='forest-clearing')&&/^<ellipse/.test(tag)&&!tag.includes('url('))cls='scene-leaves';
  if(scene==='summer-garden'&&/^<circle/.test(tag)&&!tag.includes('cx="1120"'))cls='scene-flower';
  if(scene==='evening-terrace'&&tag.includes('fill="#ffe3a6"'))cls='scene-lamp';
  if(scene==='quiet-coast'&&tag.includes('stroke="#bfd3c9"'))cls='scene-water';
  if(scene==='quiet-coast'&&tag.includes('stroke="#e8e4d0"'))cls='scene-surf';
  if(scene==='lakeside-camp'&&['#b69c78','#867964','#7e9290','#566e75'].some(c=>tag.includes(`fill="${c}"`)))cls='scene-tent';
  if(!cls)return tag;
  return tag.replace(/\/>$/,` class="${cls}"/>`);
 });
 if(scene==='landscape'||scene==='mountains'||scene==='forest'){
  const fog='<g class="scene-fog" fill="#e1e7dc" opacity=".13"><path d="M-150 695Q280 635 650 700T1750 670V730Q1200 800 650 740T-150 755Z"/><path d="M-150 805Q420 745 820 810T1750 790V835Q1050 885 500 845T-150 860Z" opacity=".6"/></g>';
  svg=svg.replace('</svg>',fog+'</svg>');
  if(scene==='landscape')svg=svg.replace('<path d="M0 620','<g class="scene-cloud" fill="#f8f3e7" opacity=".22"><path d="M140 250q80-75 165-35 65-65 130-10 70-15 120 65-200 35-415-20Z"/></g><path d="M0 620');
 }
 if(scene==='dunes')svg=svg.replace('</svg>','<g class="scene-sand" fill="none" stroke="#efd6b3" stroke-width="3" opacity=".18"><path d="M-150 845Q350 765 830 885T1750 820M-150 868Q340 795 840 908T1750 850"/></g></svg>');
 if(scene==='focus-room'){
  svg=svg.replace('class="cat-breath"','class="cat-breath scene-cat"');
  svg=svg.replace('</svg>','<rect class="scene-window-light" x="250" y="115" width="1100" height="540" fill="#fff4c9" opacity="0" pointer-events="none"/></svg>');
 }
 if(scene==='lakeside-camp')svg=svg.replace('<g stroke="#b0b8ae"','<g class="scene-water" stroke="#b0b8ae"');
 if(scene==='quiet-coast')svg=svg.replace('<g stroke="#647f68"','<g class="scene-grass" stroke="#647f68"');
 svg=svg.replace('<svg ',`<svg class="relax-animated-scene" data-scene="${scene}" aria-hidden="true" focusable="false" `);
 return svg;
}
