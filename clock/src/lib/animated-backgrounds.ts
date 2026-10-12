/** Build-time transforms of our own authored SVG assets, never user-provided markup. */
export function animatedBackground(source: string, id: string): string {
  let svg=source.replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g,'');
  svg=svg.replace(/<svg[^>]*>/,`<svg id="animated-background-${id}" class="animated-background-scene" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-active="false" data-paused="false">`);
  const append=(markup:string)=>{svg=svg.replace('</svg>',markup+'</svg>');};
  const fog='<g class="bg-fog" fill="#dbe3d7" opacity=".13"><path d="M-150 695Q280 635 650 700T1750 670V730Q1200 800 650 740T-150 755Z"/><path d="M-150 805Q420 745 820 810T1750 790V835Q1050 885 500 845T-150 860Z" opacity=".6"/></g>';
  const clouds='<g class="bg-cloud" fill="#f0efdf" opacity=".18"><path d="M-180 240Q-40 170 130 220Q240 130 350 210Q510 160 710 250Q250 295-180 275Z"/><path d="M1000 370Q1160 275 1300 345Q1450 270 1720 370V400Q1340 440 1000 405Z"/></g>';
  if(id==='landscape'){
    svg=svg.replace('<path d="M0 620',clouds+'<path d="M0 620');append(fog);
  }else if(id==='mountains'){
    svg=svg.replace('<path d="M0 825',fog+'<path d="M0 825');append(fog.replace('bg-fog','bg-fog bg-fog-slow').replace('opacity=".13"','opacity=".08"'));
  }else if(id==='sea'){
    svg=svg.replace('<g fill="none" stroke="#d5e2dc"','<g class="bg-waves" fill="none" stroke="#d5e2dc"');
    svg=svg.replace('<path d="M0 889','<path class="bg-shore" d="M0 889');
    append('<g class="bg-reflections" fill="none" stroke="#f1ead5" stroke-width="3" opacity=".25"><path d="M1080 540h230m-195 24h160m-180 27h220m-185 32h140"/></g>');
  }else if(id==='city'){
    let index=0;svg=svg.replace(/<rect[^>]*fill="#e2c397"[^>]*\/>/g,rect=>rect.replace('<rect',`<rect class="bg-window" style="animation-delay:-${index++%23}s"`));
  }else if(id==='sky'){
    let index=0;svg=svg.replace(/<path[^>]*\/>/g,path=>path.replace('<path',`<path class="bg-cloud" style="animation-delay:-${index++*9}s"`));
  }else if(id==='pattern'){
    svg=svg.replace('<rect width="1600" height="1000" fill="url(#arches)"','<rect class="bg-pattern" x="-180" y="-180" width="1960" height="1360" fill="url(#arches)"');
  }else if(id==='forest'){
    let index=0;svg=svg.replace(/<path[^>]*fill="#(?:3c625b|829b91)"[^>]*\/>/g,path=>path.replace('<path',`<path class="bg-tree" style="animation-delay:-${index++%15}s"`));append(fog);
  }else if(id==='stars'){
    let index=0;svg=svg.replace(/<circle[^>]*\/>/g,circle=>circle.replace('<circle',`<circle class="bg-star" style="animation-delay:-${index++%19}s"`));
    svg=svg.replace('</defs>','<linearGradient id="meteor"><stop stop-color="#dce7e4" stop-opacity="0"/><stop offset="1" stop-color="#dce7e4" stop-opacity=".55"/></linearGradient></defs>');
    append('<g class="bg-meteor"><path d="M1100 190l-80-45" fill="none" stroke="url(#meteor)" stroke-width="2"/><circle cx="1100" cy="190" r="1.5" fill="#e2e8e5"/></g>');
  }else if(id==='dunes'){
    append('<g class="bg-sand" fill="none" stroke="#efd6b3" stroke-width="3" opacity=".18"><path d="M-150 845Q350 765 830 885T1750 820M-150 868Q340 795 840 908T1750 850"/><path d="M-150 950Q400 880 820 975T1750 945" opacity=".5"/></g>');
  }else if(id==='lake'){
    svg=svg.replace('<g fill="none" stroke="#d5dfcf"','<g class="bg-waves" fill="none" stroke="#d5dfcf"');
    svg=svg.replace('<path d="M0 600Q290 540 540 608T1140 594T1600 580V790','<path class="bg-lake-reflection" d="M0 600Q290 540 540 608T1140 594T1600 580V790');
  }else if(id==='gradient'){
    for(const color of ['warm','sage','lavender'])svg=svg.replace(`<rect width="1600" height="1000" fill="url(#${color})"`, `<rect class="bg-color bg-color-${color}" x="-160" y="-120" width="1920" height="1240" fill="url(#${color})"`);
  }
  // Every instance has its own gradient/pattern IDs, including inactive scenes.
  svg=svg.replace(/id="(?!animated-background-)([^"]+)"/g,(_,name)=>`id="motion-${id}-${name}"`)
    .replace(/url\(#([^)]+)\)/g,(_,name)=>`url(#motion-${id}-${name})`);
  return svg;
}
