import type {Project} from '../lib/model';
import type {BoardSubject,Storyboard} from '../lib/storyboard';
import {boardResourceDefinition} from '../lib/storyboard-resources';
import {resource3DPreview} from '../lib/stage3d-resource-preview';
import {createStage3DView} from './stage3d-preview';
import {storyboardDesignWords} from '../lib/storyboard-design-i18n';
/** Independent canvas lifecycle: closing or changing selection releases its buffer and RAF. */
export function storyboardModelView(host:HTMLElement,subject:BoardSubject,setting:boolean,board:Storyboard,controls=true,width=640,height=480,resource:Parameters<typeof resource3DPreview>[2]=boardResourceDefinition(subject,setting),resourceKind:Parameters<typeof resource3DPreview>[0]=setting?'stage':'character',characters:Project['characters']={}){
 const t=storyboardDesignWords(document.documentElement.lang),figure=document.createElement('div'),tools=document.createElement('div'),message=document.createElement('p');figure.className='board-model-canvas';tools.className='board-model-controls';message.setAttribute('role','status');
 const clip=document.createElement('select');clip.setAttribute('aria-label',t.model);clip.add(new Option(t.still,''));for(const name of Object.keys(subject.model3d?.animations??{}))clip.add(new Option(name,name));
 const play=document.createElement('button');play.type='button';play.textContent='▶';play.title=t.play;play.setAttribute('aria-label',t.play);play.setAttribute('aria-pressed','false');
 const range=(label:string,min:number,max:number,value:number,step:string)=>{const wrap=document.createElement('label'),input=document.createElement('input');wrap.textContent=label;input.type='range';input.min=String(min);input.max=String(max);input.step=step;input.value=String(value);input.setAttribute('aria-label',label);wrap.append(input);tools.append(wrap);return input;};
 tools.append(clip,play);const time=range(t.time,0,4,0,'.01'),yaw=range(t.yaw,-180,180,18,'1'),pitch=range(t.pitch,5,80,12,'1'),zoom=range(t.zoom,5,40,6,'.1');host.append(figure);if(controls)host.append(tools);host.append(message);
 let frame=0,playing=false,disposed=false,previous=0,view:ReturnType<typeof createStage3DView>|undefined,sample:ReturnType<typeof resource3DPreview>;
 const draw=()=>{if(!sample||disposed)return;sample.shot.camera.yaw=yaw.valueAsNumber;sample.shot.camera.pitch=pitch.valueAsNumber;sample.shot.camera.distance=zoom.valueAsNumber;view?.draw(time.valueAsNumber);};
 function reset(){view?.dispose();figure.replaceChildren();message.textContent='';try{
  sample=resource3DPreview(resourceKind,subject.id,resource,clip.value,characters,board.images as Record<string,{name:string;data:string}>);
  time.max=String(clip.value?subject.model3d!.animations[clip.value].duration:resourceKind==='group'?12:4);time.value='0';
  if(!view)zoom.value=String(sample.shot.camera.distance);
  view=createStage3DView(sample.project,sample.shot,width,height,e=>{message.textContent=e.message;},{studio:sample.studio,label:subject.name});figure.append(view.canvas);draw();
 }catch(e){message.textContent=(e as Error).message;}}
 const tick=(now:number)=>{if(disposed||!playing)return;if(previous)time.value=String((time.valueAsNumber+(now-previous)/1000)%Number(time.max));previous=now;draw();frame=requestAnimationFrame(tick);};
 play.onclick=()=>{playing=!playing;play.textContent=playing?'Ⅱ':'▶';play.setAttribute('aria-pressed',String(playing));previous=0;cancelAnimationFrame(frame);if(playing)frame=requestAnimationFrame(tick);};
 clip.onchange=reset;for(const input of [time,yaw,pitch,zoom])input.oninput=draw;reset();
 const visibility=()=>{if(document.hidden){playing=false;cancelAnimationFrame(frame);play.textContent='▶';play.setAttribute('aria-pressed','false');}};document.addEventListener('visibilitychange',visibility);
 return ()=>{disposed=true;cancelAnimationFrame(frame);view?.dispose();document.removeEventListener('visibilitychange',visibility);};
}
