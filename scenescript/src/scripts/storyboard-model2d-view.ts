import {stageFrame2D} from '../lib/stage2d-frame';
import {storyboardResourceWords} from '../lib/storyboard-resource-i18n';
import {createStage2DView} from './stage2d-preview';
import {resourcePreview2D} from '../lib/stage2d-resource-preview';
import {previewLibrary2D} from '../lib/storyboard-model2d';
import {storyboardDesignWords} from '../lib/storyboard-design-i18n';
import type {BoardSubject} from '../lib/storyboard';
import type {Resources2D} from '../lib/stage2d';
/** Same absolute-time renderer for rehearsal, scene playback and export. */
export function storyboardModel2DView(host:HTMLElement,source:Resources2D,subject:BoardSubject,setting:boolean,controls=true,width=640,height=480){
 const library=previewLibrary2D(source,subject,setting),kind=setting?'stages2d':'objects2d',id=subject.resource2d??subject.id,resource=library[kind][id];
 if(setting&&resource&&'preset' in resource){const frame=stageFrame2D(resource),fit=Math.min(width/frame.width,height/frame.height);width=Math.round(frame.width*fit);height=Math.round(frame.height*fit);}
 const t=storyboardDesignWords(document.documentElement.lang),figure=document.createElement('div'),tools=document.createElement('div'),message=document.createElement('p');
 figure.className='board-model-canvas board-resource2d-canvas';figure.dataset.previewWidth=String(width);figure.dataset.previewHeight=String(height);figure.style.aspectRatio=width+'/'+height;tools.className='board-model-controls';message.setAttribute('role','status');
 const clip=document.createElement('select');clip.setAttribute('aria-label',storyboardResourceWords(document.documentElement.lang).clip);clip.add(new Option(t.still,''));
 for(const name of Object.keys(resource?.model?.animations??{}))clip.add(new Option(name,name));
 const play=document.createElement('button');play.type='button';play.textContent='▶';play.title=t.play;play.setAttribute('aria-label',t.play);play.setAttribute('aria-pressed','false');
 const label=document.createElement('label');label.textContent=t.time;const time=document.createElement('input');time.type='range';time.min='0';time.max='1';time.step='.01';time.value='0';time.setAttribute('aria-label',t.time);label.append(time);tools.append(clip,play,label);host.append(figure);if(controls)host.append(tools);host.append(message);
 let view:ReturnType<typeof createStage2DView>|undefined,disposed=false,frame=0,playing=false,previous=0;
 function reset(){view?.dispose();figure.replaceChildren();message.textContent='';const sample=resourcePreview2D(library,kind,id,clip.value);if(!sample)return;time.max=String(sample.duration);time.value='0';view=createStage2DView(sample.resources,sample.shot,sample.duration,width,height,e=>{message.textContent=e.message;},sample.isolated);view.canvas.setAttribute('aria-label','2D · '+resource.name);figure.append(view.canvas);view.draw(0);}
 const tick=(now:number)=>{if(disposed||!playing)return;if(previous)time.value=String((time.valueAsNumber+(now-previous)/1000)%Number(time.max));previous=now;view?.draw(time.valueAsNumber);frame=requestAnimationFrame(tick);};
 const stop=()=>{playing=false;cancelAnimationFrame(frame);play.setAttribute('aria-pressed','false');play.textContent='▶';previous=0;};
 play.onclick=()=>{if(playing)stop();else{playing=true;play.textContent='Ⅱ';play.setAttribute('aria-pressed','true');previous=0;frame=requestAnimationFrame(tick);}};
 clip.onchange=()=>{stop();reset();};time.oninput=()=>view?.draw(time.valueAsNumber);
 const visibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',visibility);reset();
 return ()=>{disposed=true;stop();view?.dispose();document.removeEventListener('visibilitychange',visibility);};
}
