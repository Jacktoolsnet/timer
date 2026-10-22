/** Original heavy sans-serif contours, proportioned to the illustrated cover; no font download. */
type Ring=number[][];type Glyph={width:number;contour:Ring;holes?:Ring[]};
const rounded=(left:number,bottom:number,right:number,top:number,rx:number,ry:number):Ring=>{
 const points:Ring=[];for(const [x,y,start]of [[right-rx,top-ry,0],[left+rx,top-ry,90],[left+rx,bottom+ry,180],[right-rx,bottom+ry,270]])for(let i=0;i<=4;i++){const angle=(start+i*90/4)*Math.PI/180;points.push([x+rx*Math.cos(angle),y+ry*Math.sin(angle)]);}return points;
};
const glyphs:Record<string,Glyph>={
 I:{width:.42,contour:[[0,0],[.42,0],[.42,1],[0,1]]},
 N:{width:.74,contour:[[0,0],[.2,0],[.2,.64],[.54,0],[.74,0],[.74,1],[.54,1],[.54,.36],[.2,1],[0,1]]},
 F:{width:.62,contour:[[0,0],[.21,0],[.21,.4],[.54,.4],[.54,.59],[.21,.59],[.21,.8],[.62,.8],[.62,1],[0,1]]},
 L:{width:.59,contour:[[0,0],[.59,0],[.59,.2],[.21,.2],[.21,1],[0,1]]},
 A:{width:.8,contour:[[0,0],[.22,0],[.28,.25],[.52,.25],[.58,0],[.8,0],[.52,1],[.28,1]],holes:[[[.4,.79],[.304,.44],[.496,.44]]]},
 T:{width:.72,contour:[[0,1],[.72,1],[.72,.8],[.46,.8],[.46,0],[.26,0],[.26,.8],[0,.8]]},
 O:{width:.76,contour:rounded(0,0,.76,1,.22,.23),holes:[rounded(.21,.2,.55,.8,.1,.12)]},
 E:{width:.64,contour:[[0,0],[.64,0],[.64,.2],[.21,.2],[.21,.41],[.55,.41],[.55,.6],[.21,.6],[.21,.8],[.64,.8],[.64,1],[0,1]]},
 X:{width:.76,contour:[[0,0],[.24,0],[.38,.31],[.52,0],[.76,0],[.51,.51],[.75,1],[.51,1],[.38,.71],[.25,1],[.01,1],[.25,.51]]},
 P:{width:.7,contour:[[0,0],[.21,0],[.21,.38],[.53,.38],[.7,.53],[.7,.84],[.54,1],[0,1]],holes:[[[.21,.59],[.44,.59],[.49,.64],[.49,.75],[.44,.8],[.21,.8]]]},
 D:{width:.74,contour:[[0,0],[.5,0],[.74,.22],[.74,.78],[.5,1],[0,1]],holes:[[[.21,.2],[.41,.2],[.53,.32],[.53,.68],[.41,.8],[.21,.8]]]},
 W:{width:1.04,contour:[[0,1],[.2,1],[.32,.32],[.43,1],[.61,1],[.72,.32],[.84,1],[1.04,1],[.84,0],[.63,0],[.52,.58],[.41,0],[.2,0]]},
 H:{width:.74,contour:[[0,0],[.21,0],[.21,.4],[.53,.4],[.53,0],[.74,0],[.74,1],[.53,1],[.53,.61],[.21,.61],[.21,1],[0,1]]},
 C:{width:.74,contour:[[.74,.7],...rounded(0,0,.74,1,.2,.2),[.74,.3],[.53,.3],...rounded(.21,.2,.53,.8,.08,.09).reverse().slice(1,-1),[.53,.7]]}
};
export function inflationLetters(prefix:string,text:string,baseline:number,height:number,width:number,color:string,sideColor:string){
 const spacing=.075,advance=[...text].map(c=>c===' '?.32:(glyphs[c]?.width??0)+spacing),total=advance.reduce((a,b)=>a+b,0)-spacing,scale=width/total;let cursor=-width/2;
 return [...text].flatMap((letter,index)=>{if(letter===' '){cursor+=.32*scale;return [];}const glyph=glyphs[letter];if(!glyph)throw new Error('Missing title glyph: '+letter);
  const x=cursor+glyph.width*scale/2;cursor+=(glyph.width+spacing)*scale;
  const normalized=(ring:Ring)=>ring.map(([x,y])=>({x:x/glyph.width,y}));
  return [{id:prefix+index,parent:'letteringRig',shape:'extrusion',position:{x,y:baseline+height/2-13,z:0},size:{x:glyph.width*scale,y:height,z:1},color,finish:'polished',metalness:prefix==='titleChocolate'?.48:.65,roughness:.27,extrusion:{contour:normalized(glyph.contour),holes:(glyph.holes??[]).map(normalized),bevel:.022,sideColor}}];
 });
}
