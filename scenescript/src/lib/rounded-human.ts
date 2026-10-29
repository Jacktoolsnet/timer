import {parseModel3D,type Model3D} from './model3d.ts';
/** A freely editable reference, not a required template. Units: feet at y=0, height ~3, front +Z. */
export function roundedHumanModel():Model3D{
 const parts:Record<string,unknown>[]=[],skin='#d99a76',hair='#493027',cloth='#dcaa38',trousers='#314d65';
 const joint=(id:string,axis:string,min:number,max:number,control='none',motion='rotation',value=0)=>({id,axis,min,max,control,motion,value,target:control==='blink'?min:max});
 const add=(id:string,parent:string,color:string,x:number,y:number,z:number,w:number,h:number,d:number,extra:Record<string,unknown>={})=>parts.push({id,parent,shape:'sphere',color,roughness:.65,position:{x,y,z},size:{x:w,y:h,z:d},...extra});
 const group=(id:string,parent:string,x:number,y:number,z:number,joints:unknown[]=[])=>parts.push({id,parent,shape:'group',position:{x,y,z},joints});
 group('body','',0,0,0,[joint('breath','y',0,.04,'bob','translation')]);
 add('hips','body',trousers,0,1.22,0,.65,.4,.4);
 add('jacket','body',cloth,0,1.77,0,.76,.9,.43);
 add('shirt','body','#f5ead9',0,1.99,.202,.2,.43,.045);
 for(let i=0;i<4;i++)add('button'+i,'body','#72512e',.08,1.88-i*.12,.222,.035,.035,.02);
 for(const x of [-.19,.19])add('collar'+(x<0?'L':'R'),'body',cloth,x*.65,2.12,.2,.19,.17,.07,{rotation:{z:x<0?25:-25}});
 add('neck','body',skin,0,2.25,0,.24,.27,.24);
 group('head','body',0,2.62,0,[joint('nod','x',-25,25),joint('look','y',-45,45)]);
 add('skull','head',skin,0,0,0,.64,.74,.56);
 add('chin','head',skin,0,-.23,.08,.42,.24,.38);
 add('hairCap','head',hair,0,.24,-.025,.67,.38,.57);
 for(let i=0;i<7;i++)add('hairLock'+i,'head',hair,-.27+i*.085,.24+Math.sin(i)*.018,.215,.15,.23,.12,{rotation:{z:-22}});
 for(const [side,x]of [['L',-.32],['R',.32]] as const){
  add('ear'+side,'head',skin,x,-.025,0,.13,.23,.15);add('earInner'+side,'head','#b9795d',x,-.025,.065,.065,.13,.035);
  add('cheek'+side,'head',skin,x*.62,-.12,.19,.22,.2,.14);
  const ex=x*.44;
  add('eyeWhite'+side,'head','#fff7ed',ex,.035,.258,.18,.145,.07,{joints:[joint('blink'+side,'y',.03,1,'blink','scale',1)]});
  add('iris'+side,'head','#466b5c',ex,.035,.295,.08,.09,.025,{joints:[joint('irisBlink'+side,'y',.03,1,'blink','scale',1)]});
  add('pupil'+side,'head','#162329',ex,.035,.311,.037,.06,.015,{joints:[joint('pupilBlink'+side,'y',.03,1,'blink','scale',1)]});
  add('eyeLight'+side,'head','#ffffff',ex-.015,.06,.323,.02,.02,.01,{joints:[joint('lightBlink'+side,'y',.03,1,'blink','scale',1)]});
  add('brow'+side,'head',hair,ex,.158,.263,.19,.045,.045,{rotation:{z:x<0?7:-7},joints:[joint('browLift'+side,'y',0,.06,'surprised','translation')]});
 }
 add('noseBridge','head',skin,0,-.025,.267,.085,.2,.09);add('noseTip','head',skin,0,-.1,.315,.13,.1,.13);
 add('mouth','head','#713c36',0,-.205,.272,.21,.045,.035,{joints:[joint('mouthOpen','y',1,3,'speech','scale',1)]});
 add('lowerLip','head','#bd705d',0,-.235,.273,.2,.035,.035);
 for(const [side,sign]of [['L',-1],['R',1]] as const){
  const arm=side==='L'?'leftArm':'rightArm',leg=side==='L'?'leftLeg':'rightLeg';
  group(arm,'body',sign*.43,2.06,0,[joint(arm,'x',-160,100,arm),joint('raise'+side,'z',-150,150)]);
  add('sleeve'+side,arm,cloth,0,-.23,0,.27,.53,.29);
  group('elbow'+side,arm,0,-.46,0,[joint('elbowBend'+side,'x',-130,10)]);
  add('forearm'+side,'elbow'+side,cloth,0,-.19,0,.23,.43,.25);
  add('cuff'+side,'elbow'+side,'#bd8b2d',0,-.37,0,.24,.09,.26);
  add('hand'+side,'elbow'+side,skin,0,-.49,0,.21,.24,.15);
  add('thumb'+side,'elbow'+side,skin,-sign*.1,-.46,.03,.085,.15,.1);
  for(let f=0;f<4;f++)add('finger'+side+f,'elbow'+side,skin,-.072+f*.048,-.61,0,.044,.13,.11);
  group(leg,'body',sign*.19,1.19,0,[joint(leg,'x',-80,80,leg)]);
  add('thigh'+side,leg,trousers,0,-.24,0,.29,.55,.32);
  group('knee'+side,leg,0,-.49,0,[joint('kneeBend'+side,'x',0,110)]);
  add('shin'+side,'knee'+side,trousers,0,-.24,0,.24,.52,.27);
  add('shoe'+side,'knee'+side,'#443a35',0,-.59,.07,.29,.2,.48);
  add('sole'+side,'knee'+side,'#c4b5a1',0,-.67,.07,.3,.06,.49);
 }
 const track=(joint:string,values:number[],duration:number)=>({joint,easing:'ease-in-out',keys:values.map((value,i)=>({at:i*duration/(values.length-1),value}))});
 return parseModel3D({parts,animations:{
  walk:{duration:1.2,tracks:[track('leftLeg',[0,-25,0,25,0],1.2),track('rightLeg',[0,25,0,-25,0],1.2),track('leftArm',[0,20,0,-20,0],1.2),track('rightArm',[0,-20,0,20,0],1.2),track('kneeBendL',[0,28,0,5,0],1.2),track('kneeBendR',[0,5,0,28,0],1.2),track('elbowBendL',[-12,-25,-12,-15,-12],1.2),track('elbowBendR',[-12,-15,-12,-25,-12],1.2)]},
  wave:{duration:3,tracks:[track('raiseR',[0,-120,-120,-120,0],3),track('elbowBendR',[0,-25,-65,-25,0],3),track('look',[0,12,8,12,0],3)]},
  face:{duration:3,tracks:[track('blinkL',[1,.03,1,1,1],3),track('blinkR',[1,.03,1,1,1],3),track('irisBlinkL',[1,.03,1,1,1],3),track('irisBlinkR',[1,.03,1,1,1],3),track('pupilBlinkL',[1,.03,1,1,1],3),track('pupilBlinkR',[1,.03,1,1,1],3),track('lightBlinkL',[1,.03,1,1,1],3),track('lightBlinkR',[1,.03,1,1,1],3),track('mouthOpen',[1,1,2.5,1.5,1],3),track('nod',[0,8,-5,4,0],3)]}
 }})!;
}
