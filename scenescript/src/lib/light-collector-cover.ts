import {newScene,newElement,type Project,type Element} from './model.ts';
import {defaultStage2D,defaultActor2D,defaultAction2D} from './stage2d.ts';
/** A separate poster composition from the actual reusable artwork; never changes the film. */
export function lightCollectorCoverProject(source:Project):Project{
 const project=structuredClone(source),scene=newScene('light-collector-cover');
 project.scenes=[scene];project.music=null;project.narration=null;project.storyboard=null;project.thumbnail=null;
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
