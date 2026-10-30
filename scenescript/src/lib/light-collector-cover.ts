import {newScene,newElement,type Project,type Element} from './model.ts';
import {defaultStage2D,defaultActor2D,defaultAction2D} from './stage2d.ts';
/** A separate poster composition from the actual reusable artwork; never changes the film. */
export function lightCollectorCoverProject(source:Project):Project{
 const project=structuredClone(source),scene=newScene('light-collector-cover');
 project.scenes=[scene];project.music=null;project.narration=null;project.storyboard=null;project.thumbnail=null;delete project.publishing;
 scene.name='Cover – Der kleine Lichtsammler';scene.duration=3;scene.transition='none';scene.background='#123c37';scene.stage2d=defaultStage2D('forest');
 const add=(object:string,id:string,x:number,y:number,scale:number,color:string|null=null)=>{const actor=defaultActor2D(object,id);Object.assign(actor,{x,y,scale,color,sound:{muted:true,volume:1,pitch:0}});scene.stage2d!.actors.push(actor);return actor;};
 for(const [i,color]of ['#efa5bd','#f2cb79','#b9a4df'].entries())add('flower','cover-flower-'+i,815+i*58,505-i*4,[.75,.85,.7][i],color);
 const robot=add('collector','cover-collector',700,455,1.55);robot.actions=[{...defaultAction2D('wave'),duration:2.3}];
 add('spark','cover-spark',810,165,2);
 for(const [i,color]of ['#8dd9df','#f4cf82','#f0a8cc'].entries())add('butterfly','cover-butterfly-'+i,[590,885,880][i],[150,265,80][i],[1.2,1.2,1][i],color);
 const shade=newElement('shape','cover-shade');Object.assign(shade,{name:'Lesefläche',x:0,y:0,width:100,height:100,borderWidth:0,animation:'none',fillGradient:{type:'linear',angle:90,x:50,y:50,stops:[{color:'#102f32',position:0,opacity:.96},{color:'#102f32',position:45,opacity:.87},{color:'#102f32',position:67,opacity:0},{color:'#102f32',position:100,opacity:0}]}});scene.elements.push(shade);
 const text=(id:string,value:string,y:number,height:number,size:number,color:string,font:Element['font']='Arial')=>{const e=newElement('text',id);Object.assign(e,{name:id,text:value,x:6,y,width:55,height,font,fontSize:size,color,align:'left',animation:'none'});scene.elements.push(e);return e;};
 const eyebrow=text('cover-eyebrow','2D-ANIMATIONS-KURZFILM',15,5,28,'#add1bc');eyebrow.bold=true;
 text('cover-title','Der kleine\nLichtsammler',27,30,128,'#fff1ce','Georgia');
 text('cover-message','Manchmal genügt ein kleiner Funke.',65,7,34,'#ffd6a5');
 text('cover-brand','jacktools.net',85,5,30,'#b8d5c3');
 return project;
}

/** Artwork arranged for the narrow centre of a portrait poster, not a crop of the wide cover. */
export function lightCollectorPortraitArtwork(source:Project):Project{
 const project=lightCollectorCoverProject(source),scene=project.scenes[0];scene.elements=[];
 const positions:Record<string,[number,number]>={'cover-collector':[480,475],'cover-spark':[590,145],'cover-butterfly-0':[330,190],'cover-butterfly-1':[650,290],'cover-butterfly-2':[430,95],'cover-flower-0':[390,515],'cover-flower-1':[510,505],'cover-flower-2':[620,520]};
 for(const actor of scene.stage2d!.actors){const [x,y]=positions[actor.id];actor.x=x;actor.y=y;}
 return project;
}
/** Native artwork plus typography, composed at full portrait resolution. */
export function composeLightCollectorPortrait(artwork:HTMLCanvasElement):HTMLCanvasElement{
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
 const ctx=canvas.getContext('2d')!;
 const bg=ctx.createLinearGradient(0,0,0,1920);bg.addColorStop(0,'#102f32');bg.addColorStop(.27,'#123c37');bg.addColorStop(.83,'#123c37');bg.addColorStop(1,'#102f32');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1920);
 // The 1920×1080 native composition deliberately places every subject in the centre.
 ctx.drawImage(artwork,-420,520,1920,1080);
 for(const [from,to,a,b]of [[520,740,1,0],[1430,1600,0,1]]){const g=ctx.createLinearGradient(0,from,0,to);g.addColorStop(0,`rgba(18,60,55,${a})`);g.addColorStop(1,`rgba(18,60,55,${b})`);ctx.fillStyle=g;ctx.fillRect(0,from,1080,to-from);}
 ctx.textAlign='center';ctx.fillStyle='#add1bc';ctx.font='bold 27px Arial';ctx.fillText('EIN MAGISCHER 2D-KURZFILM',540,160);
 ctx.fillStyle='#fff1ce';ctx.font='138px Georgia';ctx.fillText('Der kleine',540,325);ctx.fillText('Lichtsammler',540,485);
 ctx.fillStyle='#ffd6a5';ctx.font='42px Georgia';ctx.fillText('Manchmal genügt',540,1650);ctx.fillText('ein kleiner Funke.',540,1710);
 ctx.fillStyle='#b8d5c3';ctx.font='30px Arial';ctx.fillText('jacktools.net',540,1810);
 return canvas;
}
