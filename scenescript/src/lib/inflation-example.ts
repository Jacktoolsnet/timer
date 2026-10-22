import textureAssets from './inflation-textures.json' with {type:'json'};
/** Fast, illustrative material-area chart. No historical data or executable scene code. */
export const inflationTimelineSeconds=3,inflationDuration=4.3;
export const inflationColumns=20;
const count=inflationColumns,width=10/count;
const box=(id:string,position:object,size:object,color:string,extra:object={})=>({id,shape:'box',position,size,color,...extra});
const joint=(id:string,motion:string,min:number,max:number,value=0)=>({id,motion,axis:'y',min,max,value});
// Unequal growth rates / pauses, but no backwards price or quantity jumps.
export function inflationHeight(money:boolean,x:number,progress:number){
 const u=Math.max(0,Math.min(1,progress));
 const travel=u*u*(3-2*u),wave=Math.max(0,Math.min(1,travel*1.18-x*.18));
 const irregular=.55*x+.45*x*x+.045*Math.sin(x*Math.PI*4);
 return money?.35+wave*(.6+6.7*irregular):7.8-wave*(1.2+5.8*irregular);
}
function surface(money:boolean){
 const parts:any[]=[],tracks:any[]=[];
 for(let i=0;i<count;i++){
  const x=i/(count-1),h=inflationHeight(money,x,0),id='c'+i;
  parts.push({id,shape:'group',position:{x:-5+(i+.5)*width,y:2+h/2,z:money?1.05:-1.05},joints:[joint(id+'Lift','translation',-5,5)]});
  parts.push(box(id+'Body',{}, {x:width+.002,y:1,z:.92},'#ffffff',{parent:id,texture:{asset:money?'moneyTexture':'chocolateTexture',repeat:{x:money?1/3:.25,y:money?3:2},offset:{x:(i%4)*.25,y:0}},finish:'polished',roughness:money?.16:.23,metalness:money?.82:.04,joints:[joint(id+'Height','scale',0,10,h)]}));
  // A moving cap adds chocolate-tablet squares / embossed coin faces to the filled surface.
  parts.push({id:id+'Cap',shape:'group',parent:id,position:{y:h/2},joints:[joint(id+'Top','translation',-5,5)]});
  if(money){
   parts.push(box(id+'Rim',{}, {x:width-.008,y:.07,z:.94},'#ffe490',{parent:id+'Cap',finish:'polished',metalness:.8,roughness:.15}));
   parts.push({id:id+'Stamp',shape:'cylinder',parent:id+'Cap',position:{y:-.28,z:.48},rotation:{x:90},size:{x:.39,y:.035,z:.39},color:'#ffdd72',finish:'polished',metalness:.85,roughness:.15});
   parts.push({id:id+'Inset',shape:'cylinder',parent:id+'Cap',position:{y:-.28,z:.505},rotation:{x:90},size:{x:.25,y:.012,z:.25},color:'#c68b22',finish:'polished',metalness:.7,roughness:.2});
  }else{
   parts.push(box(id+'Tile',{y:.06},{x:width-.045,y:.15,z:.25},i%4<2?'#6c3520':'#7d4028',{parent:id+'Cap',finish:'polished',roughness:.2,instances:[{z:-.31},{z:0},{z:.31}]}));
  }
  const keys=[{at:0,value:h},...Array.from({length:33},(_,k)=>({at:.3+k*3/32,value:inflationHeight(money,x,k/32)}))];
  tracks.push({joint:id+'Height',keys},...['Lift','Top'].map(suffix=>({joint:id+suffix,keys:keys.map(k=>({at:k.at,value:(k.value-h)/2}))})));
 }
 return {name:money?'Money area — embossed gold':'Chocolate area — tablet surface',height:3,model:{parts,animations:{flow:{duration:3.3,tracks}}}};
}
export const inflationPoses=(final=false)=>Object.fromEntries(['chocolate','money'].map(name=>[name,Object.fromEntries(Array.from({length:count},(_,i)=>{const h=inflationHeight(name==='money',i/(count-1),0),end=inflationHeight(name==='money',i/(count-1),final?1:0);return [['c'+i+'Height',end],['c'+i+'Lift',(end-h)/2],['c'+i+'Top',(end-h)/2]];}).flat())]));
// Native extruded stroke lettering: real geometry, no remote fonts, sprites or raster title.
const glyphs:Record<string,number[][]>={
 I:[[0,1,.6,1],[.3,1,.3,0],[0,0,.6,0]],N:[[0,0,0,1],[0,1,.6,0],[.6,0,.6,1]],
 F:[[0,0,0,1],[0,1,.6,1],[0,.53,.48,.53]],L:[[0,1,0,0],[0,0,.6,0]],
 A:[[0,0,.3,1],[.3,1,.6,0],[.14,.43,.46,.43]],T:[[0,1,.6,1],[.3,1,.3,0]],
 O:[[.13,0,.47,0],[.47,0,.6,.15],[.6,.15,.6,.85],[.6,.85,.47,1],[.47,1,.13,1],[.13,1,0,.85],[0,.85,0,.15],[0,.15,.13,0]],
 R:[[0,0,0,1],[0,1,.45,1],[.45,1,.6,.85],[.6,.85,.6,.65],[.6,.65,.45,.52],[.45,.52,0,.52],[.3,.52,.63,0]],
 D:[[0,0,0,1],[0,1,.4,1],[.4,1,.6,.8],[.6,.8,.6,.2],[.6,.2,.4,0],[.4,0,0,0]],
 U:[[0,1,0,.15],[0,.15,.14,0],[.14,0,.46,0],[.46,0,.6,.15],[.6,.15,.6,1]],
 M:[[0,0,0,1],[0,1,.3,.53],[.3,.53,.6,1],[.6,1,.6,0]],
 E:[[0,0,0,1],[0,1,.6,1],[0,.52,.48,.52],[0,0,.6,0]],
 S:[[.6,.92,.47,1],[.47,1,.13,1],[.13,1,0,.85],[0,.85,0,.65],[0,.65,.6,.35],[.6,.35,.6,.15],[.6,.15,.47,0],[.47,0,.13,0],[.13,0,0,.08]]
};
function letters(prefix:string,value:string,y:number,height:number,color:string){
 const advance=.84*height,total=(value.length*.84-.24)*height;return [...value].flatMap((letter,i)=>(glyphs[letter]??[]).map(([x0,y0,x1,y1],j)=>box(prefix+i+'_'+j,{x:-total/2+i*advance+(x0+x1)/2*height,y:y+(y0+y1)/2*height,z:.2},{x:Math.hypot(x1-x0,y1-y0)*height+.04,y:.145*height,z:.28},color,{rotation:{z:Math.atan2(y1-y0,x1-x0)*180/Math.PI},finish:'polished',metalness:.72,roughness:.19})));
}
const stageParts:any[]=[box('plinth',{y:1.48},{x:11.5,y:.88,z:5.1},'#bcefff',{finish:'glass',metalness:0,roughness:.06}),box('baseShadow',{y:.99},{x:11.7,y:.08,z:5.3},'#102a3c',{finish:'polished',metalness:.6,roughness:.18}),...letters('headline','INFLATION',13.2,1.35,'#edb949'),...letters('subtitle','FOR DUMMIES',11.7,1,'#e4b17b'),box('axisX',{y:1.95,z:2.1},{x:10.7,y:.07,z:.07},'#a8e2ee',{metalness:.6}),box('axisY',{x:-5.3,y:6,z:-1.65},{x:.07,y:8,z:.07},'#a8e2ee'),...Array.from({length:15},(_,i)=>box('tick'+i,{x:-5+i*10/14,y:1.94,z:2.17},{x:.04,y:.08,z:.22},'#77a4b9')),...Array.from({length:6},(_,i)=>box('grid'+i,{y:2+i*1.5,z:-1.65},{x:10.6,y:.025,z:.025},'#315a6c'))];
// Embedded edge lighting and engraved grid give the glass volume a readable silhouette.
stageParts.push(...[1.08,1.91].flatMap((y,i)=>[
 box('frontEdge'+i,{y,z:2.56},{x:11.45,y:.025,z:.025},'#bcf6ff',{finish:'polished',roughness:.12}),
 box('backEdge'+i,{y,z:-2.56},{x:11.45,y:.025,z:.025},'#71c8e1',{finish:'polished',roughness:.12}),
 ...[-5.73,5.73].map((x,j)=>box('sideEdge'+i+j,{x,y},{x:.025,y:.025,z:5.1},'#a9ecff',{finish:'polished',roughness:.12}))
]),...Array.from({length:15},(_,i)=>box('glassGrid'+i,{x:-5.5+i*11/14,y:1.48,z:2.56},{x:.014,y:.82,z:.012},'#588ba3',{opacity:.55})),...Array.from({length:7},(_,i)=>box('glassDepth'+i,{x:5.75,y:1.48,z:-2.4+i*.8},{x:.015,y:.82,z:.015},'#649ab1',{opacity:.55})));
const camera={fov:44,keys:[{at:0,position:{x:10,y:15,z:32},target:{x:0,y:5.7,z:0}},{at:3.3,position:{x:8,y:14,z:31},target:{x:0,y:5.7,z:0}}]};
const shot={stage:'chart',camera,actors:['chocolate','money'].map(name=>({id:name,character:name,joints:inflationPoses(true)[name],motions:[{animation:'flow',at:0,duration:3.3,blend:0}]}))};
const svg=(name:string,value:string)=>({name,data:'data:image/svg+xml;base64,'+btoa(value)});
const background=svg('Atmosphere.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><defs><radialGradient id="g"><stop stop-color="#28647b"/><stop offset="1" stop-color="#060d1b"/></radialGradient></defs><path fill="url(#g)" d="M0 0H1080V1920H0Z"/></svg>');
// Deterministic, original broadband sweep; no music, speech or external sound dependency.
function whoosh(){
 const rate=22050,n=rate*3,bytes=new Uint8Array(44+n*2),v=new DataView(bytes.buffer);const str=(at:number,s:string)=>{for(let i=0;i<s.length;i++)bytes[at+i]=s.charCodeAt(i);};
 str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
 let seed=84721,low=0,phase=0;for(let i=0;i<n;i++){const p=i/(n-1);seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;low+=(noise-low)*(.025+.4*Math.sin(Math.PI*p)**2);phase+=2*Math.PI*(90+250*(1-p))/rate;const envelope=Math.sin(Math.PI*p)**1.3;const sample=(low*.95+Math.sin(phase)*.08)*envelope;v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,sample))*26000),true);}
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:audio/wav;base64,'+btoa(binary);
}
export const inflationExample={version:'1.0',format:'portrait',title:'Inflation for Dummies 🍫💰',description:'Chocolate down. Money up. A three-second visual rush.\n\nAn illustrative material-area chart, not historical inflation data. The chocolate area represents getting less; the gold money area represents paying more. Inflation and shrinkflation simplified into one visual metaphor.\n\n#Inflation #Shrinkflation #Shorts',firstComment:'An illustrative visual metaphor, not historical price data.',hashtags:'#Inflation #Shrinkflation #Shorts',assets:{...textureAssets,background,cover:svg('Inflation-for-Dummies.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920"><path fill="#071320" d="M0 0H1080V1920H0Z"/><text x="540" y="670" text-anchor="middle" fill="#ffd15b" font-family="sans-serif" font-size="110" font-weight="bold">INFLATION</text><text x="540" y="810" text-anchor="middle" fill="#f5f3e9" font-family="sans-serif" font-size="90" font-weight="bold">FOR DUMMIES</text></svg>')},audios:{whoosh:{name:'Inflation-Whoosh.wav',data:whoosh(),duration:3}},videos:{},music:null,characters:{chocolate:surface(false),money:surface(true)},stages:{chart:{name:'Dimensional area chart',transparentBackground:true,skyColor:'#071320',groundColor:'#071320',model:{parts:stageParts}}},scenes:[{id:'cover',name:'Inflation for Dummies',duration:1,background:'#071320',backgroundAsset:'cover',transition:'none',elements:[]},{id:'timeline',name:'Three-second material flow',duration:3.3,background:'#071320',backgroundAsset:'background',transition:'crossfade',transitionDuration:.3,stage3d:shot,narration:{asset:'whoosh',at:.3,fadeIn:.03,fadeOut:.12,volume:.9},elements:[]}]};
