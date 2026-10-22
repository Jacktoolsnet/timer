import textureAssets from './inflation-textures.json' with {type:'json'};
/** Fast, illustrative material-area chart. No historical data or executable scene code. */
export const inflationTimelineSeconds=3,inflationDuration=4.3;
const box=(id:string,position:object,size:object,color:string,extra:object={})=>({id,shape:'box',position,size,color,...extra});
// Invented comparison ratios, not historical inflation data.
export function inflationHeight(money:boolean,progress:number){const u=Math.max(0,Math.min(1,progress)),q=u*u*(3-2*u);return 6+(money?1.5:-3)*q;}
function surface(money:boolean){
 const ratio=money?1.25:.5;
 const track=(joint:string,start:number,end:number)=>({joint,easing:'ease-in-out',keys:[{at:0,value:start},{at:.3,value:start},{at:3.3,value:end}]});
 return {name:money?'Gold ingot — rising bar':'Chocolate tablet — shrinking bar',height:3,model:{parts:[
  box('area',{y:2},{x:2.6,y:6,z:1.2},money?'#e6ac29':'#ffffff',{
   finish:'polished',roughness:money?.22:.26,metalness:money?.85:.04,
   ...(!money?{texture:{asset:'chocolateTexture',repeat:{x:1,y:1}}}:{}),
   joints:[{id:'barHeight',motion:'scale',axis:'y',min:.5,max:1.25,value:ratio},{id:'barLift',motion:'translation',axis:'y',min:1.5,max:3.75,value:3*ratio}]
  }),box('base',{y:2.015},{x:2.65,y:.045,z:1.25},money?'#eab846':'#63331c',{finish:'polished',metalness:money?.8:.04,roughness:.22})
 ],animations:{flow:{duration:3.3,tracks:[track('barHeight',1,ratio),track('barLift',3,3*ratio)]}}}};
}
export const inflationPoses=(final=false)=>Object.fromEntries((['chocolate','money'] as const).map(name=>{const ratio=final?(name==='money'?1.25:.5):1;return [name,{barHeight:ratio,barLift:3*ratio}];}));
// Native stroke lettering: a camera-facing common plane, open counters and shallow, non-overlapping extrusion.
// Real geometry; no remote fonts, sprites or raster title.
const glyphs:Record<string,number[][]>={
 C:[[.6,.9,.47,1],[.47,1,.13,1],[.13,1,0,.85],[0,.85,0,.15],[0,.15,.13,0],[.13,0,.47,0],[.47,0,.6,.1]],
 H:[[0,0,0,1],[.6,0,.6,1],[0,.5,.6,.5]],X:[[0,1,.6,0],[0,0,.6,1]],
 P:[[0,0,0,1],[0,1,.45,1],[.45,1,.6,.85],[.6,.85,.6,.65],[.6,.65,.45,.52],[.45,.52,0,.52]],
 W:[[0,1,.12,0],[.12,0,.3,.5],[.3,.5,.48,0],[.48,0,.6,1]],
 I:[[0,1,.6,1],[.3,1,.3,0],[0,0,.6,0]],N:[[0,0,0,1],[0,1,.6,0],[.6,0,.6,1]],
 F:[[0,0,0,1],[0,1,.6,1],[0,.53,.48,.53]],L:[[0,1,0,0],[0,0,.6,0]],
 A:[[0,0,.3,1],[.3,1,.6,0],[.11,.36,.49,.36]],T:[[0,1,.6,1],[.3,1,.3,0]],
 O:[[.13,0,.47,0],[.47,0,.6,.15],[.6,.15,.6,.85],[.6,.85,.47,1],[.47,1,.13,1],[.13,1,0,.85],[0,.85,0,.15],[0,.15,.13,0]],
 R:[[0,0,0,1],[0,1,.45,1],[.45,1,.6,.85],[.6,.85,.6,.65],[.6,.65,.45,.52],[.45,.52,0,.52],[.3,.52,.63,0]],
 D:[[0,0,0,1],[0,1,.4,1],[.4,1,.6,.8],[.6,.8,.6,.2],[.6,.2,.4,0],[.4,0,0,0]],
 U:[[0,1,0,.15],[0,.15,.14,0],[.14,0,.46,0],[.46,0,.6,.15],[.6,.15,.6,1]],
 M:[[0,0,0,1],[0,1,.3,.53],[.3,.53,.6,1],[.6,1,.6,0]],
 E:[[0,0,0,1],[0,1,.6,1],[0,.52,.48,.52],[0,0,.6,0]],
 S:[[.6,.92,.47,1],[.47,1,.13,1],[.13,1,0,.85],[0,.85,0,.65],[0,.65,.6,.35],[.6,.35,.6,.15],[.6,.15,.47,0],[.47,0,.13,0],[.13,0,0,.08]]
};
function letters(prefix:string,value:string,y:number,height:number,color:string){
 for(const letter of value)if(letter!==' '&&!glyphs[letter])throw new Error('Missing title glyph: '+letter);
 const advance=.84*height,total=(value.length*.84-.24)*height;
 return [...value].flatMap((letter,i)=>(glyphs[letter]??[]).flatMap(([x0,y0,x1,y1],j)=>{
  const vertical=prefix==='headline'?1.15:prefix==='titleChocolate'?1.5:1.05;
  const length=Math.hypot(x1-x0,(y1-y0)*vertical)*height+.04,position={x:-total/2+i*advance+(x0+x1)/2*height,y:y+(y0+y1)/2*height*vertical-13},rotation={z:Math.atan2((y1-y0)*vertical,x1-x0)*180/Math.PI},parent='letteringRig';
  return [box(prefix+i+'_'+j,{...position,z:.24},{x:length,y:.13*height,z:.12},color,{parent,rotation,finish:'polished',metalness:.65,roughness:.22}),box(prefix+'Depth'+i+'_'+j,{...position,z:-.02},{x:length,y:.13*height,z:.4},prefix==='titleChocolate'?'#61331e':'#80501c',{parent,rotation,finish:'polished',metalness:.55,roughness:.3})];
 }));
}
const stageParts:any[]=[{id:'letteringRig',shape:'group',position:{y:13},rotation:{y:-10,x:6}},box('plinth',{y:1.48},{x:11.5,y:.88,z:5.1},'#bcefff',{finish:'glass',metalness:0,roughness:.06}),box('baseShadow',{y:.99},{x:11.7,y:.08,z:5.3},'#102a3c',{finish:'polished',metalness:.6,roughness:.18}),box('diagramBackboard',{y:6.65,z:-1.87},{x:10.9,y:9.5,z:.12},'#060708',{roughness:.38,metalness:.08}),...letters('headline','INFLATION',15.6,1.55,'#edb949'),...letters('subtitle','EXPLAINED WITH',14.0,.9,'#edb949'),...letters('titleChocolate','CHOCOLATE',11.8,1.4,'#e4b17b'),box('axisX',{y:1.95,z:2.1},{x:10.7,y:.07,z:.07},'#ffffff',{roughness:.22,metalness:.35}),box('axisY',{x:-5.3,y:6.65,z:-1.79},{x:.07,y:9.5,z:.07},'#ffffff',{roughness:.22,metalness:.35}),...Array.from({length:15},(_,i)=>box('tick'+i,{x:-5+i*10/14,y:1.94,z:2.17},{x:.04,y:.08,z:.22},'#ffffff',{roughness:.22,metalness:.35})),...Array.from({length:7},(_,i)=>box('grid'+i,{y:2+i*1.5,z:-1.79},{x:10.6,y:.035,z:.04},'#ffffff',{roughness:.22,metalness:.35}))];
// Embedded edge lighting and engraved grid give the glass volume a readable silhouette.
stageParts.push(...[1.08,1.91].flatMap((y,i)=>[
 box('frontEdge'+i,{y,z:2.56},{x:11.45,y:.025,z:.025},'#bcf6ff',{finish:'polished',roughness:.12}),
 box('backEdge'+i,{y,z:-2.56},{x:11.45,y:.025,z:.025},'#71c8e1',{finish:'polished',roughness:.12}),
 ...[-5.73,5.73].map((x,j)=>box('sideEdge'+i+j,{x,y},{x:.025,y:.025,z:5.1},'#a9ecff',{finish:'polished',roughness:.12}))
]),...Array.from({length:15},(_,i)=>box('glassGrid'+i,{x:-5.5+i*11/14,y:1.48,z:2.56},{x:.014,y:.82,z:.012},'#588ba3',{opacity:.55})),...Array.from({length:7},(_,i)=>box('glassDepth'+i,{x:5.75,y:1.48,z:-2.4+i*.8},{x:.015,y:.82,z:.015},'#649ab1',{opacity:.55})));
// Real instanced tiles keep the cover's floor motif in perspective without a bitmap overlay.
// Four shared materials avoid one draw call per tile; narrow gaps reveal the grout bed.
const floorTiles=Array.from({length:143},(_,i)=>({x:(i%11-5)*2.6,z:(Math.floor(i/11)-6)*2.6+2.6}));
stageParts.push(box('floorGrout',{y:.79,z:2.6},{x:28.6,y:.12,z:33.8},'#080e15',{roughness:.85}),
 ...['#142330','#182734','#11202b','#1b2b36'].map((color,variant)=>box('floorTile'+variant,{y:.9},{x:2.555,y:.1,z:2.555},color,{finish:'polished',metalness:.32,roughness:.24+variant*.025,instances:floorTiles.filter((_,i)=>(i*7+Math.floor(i/11)*3)%4===variant)})));
const camera={fov:38,keys:[{at:0,position:{x:-6,y:11,z:34},target:{x:0,y:8,z:0}},{at:3.3,position:{x:-5.5,y:10.8,z:34},target:{x:0,y:8,z:0}}]};
const shot={stage:'chart',camera,actors:(['chocolate','money'] as const).map(name=>({id:name,character:name,x:name==='money'?2.4:-2.4,joints:inflationPoses(true)[name],motions:[{animation:'flow',at:0,duration:3.3,blend:0}]}))};
const svg=(name:string,value:string)=>({name,data:'data:image/svg+xml;base64,'+btoa(value)});
const background=svg('Atmosphere.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><defs><radialGradient id="g"><stop stop-color="#28647b"/><stop offset="1" stop-color="#060d1b"/></radialGradient></defs><path fill="url(#g)" d="M0 0H1080V1920H0Z"/></svg>');
// Deterministic, original broadband sweep; no music, speech or external sound dependency.
function whoosh(){
 const rate=22050,n=rate*3,bytes=new Uint8Array(44+n*2),v=new DataView(bytes.buffer);const str=(at:number,s:string)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i);};
 str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
 let seed=84721,low=0,phase=0;for(let i=0;i<n;i++){const p=i/(n-1);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;low+=(noise-low)*(.025+.4*Math.sin(Math.PI*p)**2);phase+=2*Math.PI*(90+250*(1-p))/rate;const envelope=Math.sin(Math.PI*p)**1.3;const sample=(low*.95+Math.sin(phase)*.08)*envelope;v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,sample))*26000),true);}
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:audio/wav;base64,'+btoa(binary);
}
export const inflationExample={version:'1.0',format:'portrait',title:'Inflation Explained with Chocolate',description:'Chocolate down. Money up. A three-second visual rush.\n\nAn illustrative material-area chart, not historical inflation data. The chocolate area represents getting less; the gold money area represents paying more. Inflation and shrinkflation simplified into one visual metaphor.\n\n#Inflation #Shrinkflation #Shorts',firstComment:'An illustrative visual metaphor, not historical price data.',hashtags:'#Inflation #Shrinkflation #Shorts',assets:{...textureAssets,background,cover:svg('Inflation-Explained-with-Chocolate.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><path fill="#071320" d="M0 0H1080V1920H0Z"/><text x="540" y="670" text-anchor="middle" fill="#ffd15b" font-family="sans-serif" font-size="110" font-weight="bold">INFLATION</text><text x="540" y="810" text-anchor="middle" fill="#f5f3e9" font-family="sans-serif" font-size="66" font-weight="bold">EXPLAINED WITH</text><text x="540" y="950" text-anchor="middle" fill="#e4b17b" font-family="sans-serif" font-size="90" font-weight="bold">CHOCOLATE</text></svg>')},audios:{whoosh:{name:'Inflation-Whoosh.wav',data:whoosh(),duration:3}},videos:{},music:null,characters:{chocolate:surface(false),money:surface(true)},stages:{chart:{name:'Dimensional area chart',transparentBackground:true,skyColor:'#071320',groundColor:'#071320',model:{parts:stageParts}}},scenes:[{id:'cover',name:'Inflation Explained with Chocolate',duration:1,background:'#071320',backgroundAsset:'cover',transition:'none',elements:[]},{id:'timeline',name:'Three-second material flow',duration:3.3,background:'#071320',backgroundAsset:'background',transition:'morph',transitionDuration:.3,morph:{points:[{from:{x:50,y:13},to:{x:50,y:13}},{from:{x:50,y:22},to:{x:50,y:22}},{from:{x:50,y:29},to:{x:50,y:29}},{from:{x:50,y:45},to:{x:50,y:45}},{from:{x:50,y:60},to:{x:50,y:60}},{from:{x:17,y:76},to:{x:17,y:81}},{from:{x:85,y:73},to:{x:85,y:79}}]},stage3d:shot,narration:{asset:'whoosh',at:.3,fadeIn:.03,fadeOut:.12,volume:.9},elements:[]}]};
