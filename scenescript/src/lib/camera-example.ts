import {panelProject} from './panel-example.ts';
import {newElement} from './model.ts';
export function cameraProject(){
 const p=panelProject();p.title='The missing briefcase — camera shots';p.description='Original office comic with scene-local camera moves and a final two-panel scene.';
 const shot=p.scenes[0];shot.name='Full view → manager → briefcase';shot.duration=12;shot.camera={stations:[{at:0,x:0,y:0,width:100,hold:1,easing:'linear'},{at:4,x:5,y:5,width:40,hold:2,easing:'ease-in-out'},{at:10,x:36,y:55,width:28,hold:2,easing:'ease-in-out'}]};
 const caption=newElement('bubble','manager-speech');Object.assign(caption,{name:'Manager speech',text:'Where is the briefcase?',x:7,y:6,width:34,height:10,fontSize:20,at:4,until:6,animation:'fade',animationDuration:.3,exitAnimation:'fade',exitDuration:.3});caption.bubble!.padding=8;caption.bubble!.tail.target={x:41,y:268};caption.bubble!.tail.width=16;shot.elements.push(caption);
 p.scenes=[shot,p.scenes[2]];p.scenes[1].transition='crossfade';p.scenes[1].transitionDuration=.7;return p;
}
