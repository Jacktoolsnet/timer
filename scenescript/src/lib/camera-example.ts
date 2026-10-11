import {panelProject} from './panel-example.ts';
import {newElement} from './model.ts';
export function cameraProject(){
 const p=panelProject();p.title='The missing briefcase — camera shots';p.description='Original office comic with scene-local camera moves and a final two-panel scene.';
 const shot=p.scenes[0];shot.name='Full view → manager → briefcase';shot.duration=12;shot.camera={stations:[{at:0,x:0,y:0,width:100,hold:1,easing:'linear'},{at:4,x:5,y:5,width:40,hold:2,easing:'ease-in-out'},{at:10,x:36,y:55,width:28,hold:2,easing:'ease-in-out'}]};
 const image=shot.elements[1];image.anchors={managerMouth:{x:18.75,y:31.5}};
 const caption=newElement('bubble','manager-speech');Object.assign(caption,{space:'screen',name:'Screen-fixed manager speech',text:'Where is the briefcase?',x:8,y:3,width:68,height:18,fontSize:72,at:1,until:6,animation:'fade',animationDuration:.3,exitAnimation:'fade',exitDuration:.3});caption.bubble!.padding=12;caption.bubble!.tail={...caption.bubble!.tail,mode:'anchor',element:image.id,anchor:'managerMouth',width:24};shot.elements.push(caption);
 const narrator=newElement('text','narrator');Object.assign(narrator,{space:'screen',name:'Screen-fixed narrator',text:'One room. Two suspects. One missing briefcase.',x:4,y:86,width:92,height:10,fontSize:48,animation:'none',color:'#ffffff'});const plate=newElement('shape','narrator-plate');Object.assign(plate,{space:'screen',name:'Narrator background',x:3,y:85,width:94,height:12,fillColor:'#263b42',animation:'none',opacity:.92});shot.elements.push(plate,narrator);
 p.scenes=[shot,p.scenes[2]];p.scenes[1].transition='crossfade';p.scenes[1].transitionDuration=.7;return p;
}
