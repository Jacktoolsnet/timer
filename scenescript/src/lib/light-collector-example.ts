import {lightCollectorMusic,lightCollectorSounds2D} from './light-collector-audio.ts';
import {lightCollectorStoryboard} from './light-collector-storyboard.ts';
import {demoProject,newScene,newElement,type Project} from './model.ts';
import {defaultStage2D,defaultAction2D} from './stage2d.ts';
import {lightCollectorGarden2D,LIGHT_COLLECTOR_DURATION} from './light-collector-garden.ts';
/** The shipped default is an ordinary editable, serializable SceneScript project. */
export function lightCollectorProject():Project{
 const project=demoProject(),scene=newScene('light-collector'),closing=newScene('night-garden'),resources=lightCollectorGarden2D();
 const ending=resources.shot.ending!,split=17;
 for(const [id,sounds]of Object.entries(lightCollectorSounds2D()))resources.objects2d[id].sounds=sounds;
 resources.shot.actors.filter(actor=>actor.object==='flower').forEach((actor,i)=>actor.sound={muted:false,volume:1,pitch:[0,3,8][i]});
 scene.name='Der Lichtsammler – Waldweg';scene.duration=split;scene.transition='none';scene.background='#123c37';scene.stage2d=resources.shot;
 // Scene changes belong to the project timeline, not to a hidden backdrop/text cue.
 scene.stage2d.transition=null;scene.stage2d.ending=null;
 scene.stage2d.camera=scene.stage2d.camera.map(key=>({...key,at:Math.min(key.at,split)}));
 closing.name='Ein kleiner Funke – Nachtgarten';closing.duration=LIGHT_COLLECTOR_DURATION-split;closing.transition='crossfade';closing.transitionDuration=1.8;closing.background='#102c38';
 closing.stage2d=defaultStage2D('night-garden');closing.stage2d.camera=[{at:0,x:-35,y:0,zoom:1}];
 closing.stage2d.actors=scene.stage2d.actors.filter(actor=>actor.object==='flower'||actor.object==='butterfly').map(actor=>{
  const copy=structuredClone(actor);
  // The second scene starts with the insects already perched. Do not replay births or flights.
  const attach=copy.actions.find(action=>action.type==='attach');
  copy.actions=attach?[{...defaultAction2D('attach'),target:attach.target,at:0,duration:.01,burst:false}]:[];
  if(attach){const flower=scene.stage2d!.actors.find(actor=>actor.id===attach.target)!;copy.x=flower.x;copy.y=flower.y-106*flower.scale;}
  return copy;
 });
 const text=(id:string,name:string,value:string,y:number,size:number,color:string)=>{
  const element=newElement('text',id);
  Object.assign(element,{name,text:value,x:94/9.6,y,width:70,height:10,font:'Georgia',fontSize:size,align:'left',color,at:ending.at-split,animationDuration:ending.duration});
  return element;
 };
 const title=text('closing-title','Schlusstitel',ending.title,27,78,'#e7eed9');
 const subtitle=text('closing-subtitle','Schlussbotschaft',ending.subtitle,36.8,90,'#ffd6a5');
 const caption=text('closing-caption','Kleine Schlusszeile','jacktools.net',52.5,24,'#91b7ac');caption.font='Arial';caption.x=98/9.6;caption.height=5;
 const rule=newElement('shape','closing-rule');Object.assign(rule,{name:'Feine Abschlusslinie',x:10,y:48.5,width:27.2,height:.37,fillColor:'#f7b89a',color:'#f7b89a',borderWidth:0,at:ending.at-split,animationDuration:ending.duration});
 closing.elements=[title,subtitle,rule,caption];
 return {...project,music:lightCollectorMusic(),objects2d:resources.objects2d,stages2d:resources.stages2d,storyboard:lightCollectorStoryboard(),title:'Der kleine Lichtsammler',description:'Ein kleiner Roboter entdeckt einen Funken. Beim Berühren des Sterns entstehen drei Schmetterlinge. Sie fliegen zu Blumen, deren Blüten sanft nachfedern. Zwei bearbeitbare Szenen führen vom Waldweg in einen leuchtenden Nachtgarten.',scenes:[scene,closing]};
}
