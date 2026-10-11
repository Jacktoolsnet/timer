import {demoProject,newElement,newScene,type Project} from './model.ts';
import {defaultMotionPath} from './motion-path.ts';
import {svgDataURL} from './svg.ts';

/** Original simple vector characters; no external assets or generated payloads. */
export function comicProject():Project{
 const project=demoProject();project.title='A little spark';project.description='Two friends discover that ideas grow when shared.';project.hashtags='#Comic, #SceneScript';
 const character=(shirt:string,hair:string)=>svgDataURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 400"><path d="M58 245h124l12 125h-52 l -22 -80 -22 80H46Z" fill="#24354b"/><path d="M65 125h110l36 122 -48 12 -43 -55 -43 55 -48 -12Z" fill="${shirt}"/><circle cx="120" cy="75" r="60" fill="#ffd4a3" stroke="#24354b" stroke-width="5"/><path d="M61 64Q62 5 121 12Q182 14 181 65L162 42 134 48 113 30 80 58Z" fill="${hair}"/><circle cx="98" cy="72" r="6" fill="#24354b"/><circle cx="143" cy="72" r="6" fill="#24354b"/><path d="M101 95Q120 113 140 95" fill="none" stroke="#24354b" stroke-width="5"/><path d="M77 371H43v16h60v -15M144 371v16h60v -16" fill="#24354b"/></svg>`);
 project.assets={nova:{name:'Nova.svg',data:character('#5bbcac','#38394a')},pip:{name:'Pip.svg',data:character('#f1aa56','#8c4b37')}};
 const scene=newScene('comic');scene.name='A little spark';scene.duration=6;scene.background='#e8f0f5';scene.transition='none';
 const nova=newElement('image','nova');Object.assign(nova,{name:'Nova',asset:'nova',x:10,y:32,width:22,height:65.185185,animation:'none',anchors:{mouth:{x:50,y:25}},motionPath:{...defaultMotionPath(),duration:6,to:{x:12,y:0}}});
 const pip=newElement('image','pip');Object.assign(pip,{name:'Pip',asset:'pip',x:68,y:32,width:22,height:65.185185,animation:'none',anchors:{mouth:{x:50,y:25}}});
 const dialog=(id:string,text:string,speaker:string,at:number,until:number,x:number,kind:'speech'|'thought')=>{
  const e=newElement('bubble',id);Object.assign(e,{name:id,text,x,y:4,width:43,height:27,fontSize:44,at,until,animation:'fade',animationDuration:.25,exitAnimation:'fade',exitDuration:.25});
  e.bubble!.kind=kind;e.bubble!.tail={...e.bubble!.tail,mode:'anchor',element:speaker,anchor:'mouth'};
  return e;
 };
 scene.elements=[nova,pip,dialog('idea','What if we build something new?','nova',0,2,5,'speech'),dialog('reply','Start small. Let the idea grow!','pip',2,4,52,'speech'),dialog('thought','A little spark can go a long way.','nova',4,6,12,'thought')];
 project.scenes=[scene];return project;
}
