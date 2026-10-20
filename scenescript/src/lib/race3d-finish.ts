/** Reusable data-only start/finish tower and race marshal, no special renderer behavior. */
const box=(id:string,position:object,size:object,color:string,extra:object={})=>({id,shape:'box',position,size,color,...extra});
export const raceTowerParts3D=[
 ...[-1,1].flatMap(x=>[-1,1].map(z=>box(`towerLeg${x}_${z}`,{x:-19+x*2.65,y:1.4,z:-21.6+z*2.1},{x:.25,y:2.8,z:.25},'#566b7c'))),
 box('towerDeck',{x:-19,y:2.9,z:-21.6},{x:5.8,y:.2,z:4.8},'#dce3e9'),
 box('towerCabin',{x:-19,y:4.15,z:-22.2},{x:5.4,y:2.3,z:2.8},'#eef1e9'),
 box('towerWindow',{x:-19,y:4.4,z:-20.78},{x:4.8,y:1.15,z:.045},'#49889b',{metalness:.3}),
 box('towerSideWindows',{x:-19,y:4.4,z:-22.2},{x:.04,y:1.15,z:2.1},'#49889b',{instances:[{x:-2.72,y:0,z:0},{x:2.72,y:0,z:0}]}),
 box('towerRoof',{x:-19,y:5.42,z:-22.2},{x:6.1,y:.2,z:3.5},'#d75e48'),
 box('towerFrontRail',{x:-19,y:3.47,z:-19.18},{x:5.8,y:.09,z:.09},'#e5ba48'),
 box('towerRailPosts',{x:-19,y:3.2,z:-19.18},{x:.09,y:.6,z:.09},'#566b7c',{instances:[-2.7,-1.5,1.5,2.7].map(x=>({x,y:0,z:0}))}),
 box('towerStairs',{x:-22.45,y:.23,z:-20},{x:1.2,y:.46,z:.6},'#b5c2c8',{instances:Array.from({length:6},(_,i)=>({x:0,y:i*.46,z:-i*.6+0}))}),
 box('towerSign',{x:-19,y:6.08,z:-22.2},{x:4.2,y:1.1,z:.15},'#263c51'),
 ...Array.from({length:8},(_,i)=>box('towerCheck'+i,{x:(i<4?-1.75:1.75)+(i%2-.5)*.2,y:Math.floor(i%4/2)*.2-.1,z:.09},{x:.2,y:.2,z:.03},(i%2+Math.floor(i%4/2))%2?'#ffffff':'#1e2936',{parent:'towerSign'})),
 // Code-native block strokes spell ZIEL without fonts, textures or extra assets.
 ...[[-1.05,.24,.48,.085,0],[-1.05,-.24,.48,.085,0],[-1.05,0,.085,.66,-45],[-.38,0,.085,.56,0],
 [.08,0,.085,.56,0],[.28,.24,.48,.085,0],[.28,0,.4,.085,0],[.28,-.24,.48,.085,0],[.84,0,.085,.56,0],[1.04,-.24,.48,.085,0]]
 .map(([x,y,w,h,z],i)=>box('towerLetter'+i,{x,y,z:.09},{x:w,y:h,z:.03},'#fff3c7',{parent:'towerSign',rotation:{z}}))
];
const skin='#efc59d',uniform='#ed8541';
const animations:Record<string,{duration:number;tracks:{joint:string;easing?:string;keys:{at:number;value:number}[]}[]}>= {finishWave:{duration:1.2,tracks:[{joint:'flagWave',keys:[115,145,115,85,115].map((value,i)=>({at:i*.3,value}))}]}};
export const raceMarshal3D={name:'Rennleitung mit Zielflagge',height:3,expression:'happy',model:{parts:[
 box('torso',{y:1.5},{x:.9,y:1,z:.52},uniform),
 box('vestStripe',{y:1.5,z:.275},{x:.9,y:.14,z:.04},'#fff2a9'),
 box('head',{y:2.35},{x:.66,y:.67,z:.6},skin),
 box('cap',{y:2.72,z:.12},{x:.76,y:.13,z:.85},'#26475d'),
 box('eyes',{y:2.42,z:.31},{x:.065,y:.075,z:.025},'#243341',{instances:[{x:-.15,y:0,z:0},{x:.15,y:0,z:0}]}),
 box('smile',{y:2.19,z:.31},{x:.24,y:.055,z:.03},'#8a3e40'),
 ...[-1,1].flatMap(side=>[box('leg'+side,{x:side*.24,y:.55},{x:.3,y:1,z:.35},'#334d62'),box('shoe'+side,{x:side*.24,y:.09,z:.12},{x:.39,y:.18,z:.62},'#253442')]),
 box('leftArm',{x:-.62,y:1.48},{x:.24,y:.9,z:.3},skin),
 {id:'flagArm',shape:'group',position:{x:.6,y:1.97},joints:[{id:'flagWave',axis:'z',min:80,max:150,value:115}]},
 box('rightArm',{y:-.4},{x:.24,y:.85,z:.3},skin,{parent:'flagArm'}),
 box('flagPole',{y:-1.5},{x:.075,y:1.5,z:.075},'#d8e1e6',{parent:'flagArm'}),
 ...Array.from({length:24},(_,i)=>box('flagTile'+i,{x:.13+(i%8)*.19,y:-2.14+Math.floor(i/8)*.19},{x:.19,y:.19,z:.045},(i%8+Math.floor(i/8))%2?'#ffffff':'#152532',{parent:'flagArm'}))
],animations}};
/** Scene-local clips sample one global wave clock, so arm and attached flag never jump at cuts. */
export function raceMarshalActor3D(start:number,duration:number){
 const name='wave'+String(start).replace('.','_'),keys=[];
 for(let i=0;i<=Math.ceil(duration*10);i++){const at=Math.min(duration,i/10),time=start+at;keys.push({at,value:time<43||time>61?115:115+30*Math.sin((time-43)/1.2*Math.PI*2)});}
 animations[name]={duration,tracks:[{joint:'flagWave',keys}]};
 return {id:'marshal',character:'marshal',x:-19,y:3,z:-19.6,rotation:0,motions:[{animation:name,duration,blend:0}]};
}
