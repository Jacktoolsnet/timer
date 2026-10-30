import {actions2D,type Object2D} from './stage2d.ts';
import {restoreBoardModels2D} from './storyboard-model2d.ts';
import type {Project} from './model.ts';
/** The actual post-restoration animation contract, not the AI's replaceable drafts. */
export function animationResources2D(project:Project){
 const restored:Record<string,any>={};restoreBoardModels2D(restored,project);
 const objects={...project.objects2d,...restored.objects2d} as Project['objects2d'],stages={...project.stages2d,...restored.stages2d} as Project['stages2d'];
 const supported=(resource:Object2D)=>actions2D.filter(type=>type==='play'?resource.kind==='custom'&&!!Object.keys(resource.model?.animations??{}).length:resource.kind==='custom'?true:resource.kind==='robot'?type!=='attach':!['walk','wave','jump'].includes(type));
 return {
  objects2d:Object.fromEntries(Object.entries(objects).map(([id,resource])=>[id,{kind:resource.kind,actions:supported(resource),clips:resource.kind==='custom'?Object.keys(resource.model?.animations??{}).sort():[],clipMode:resource.kind==='custom'?'existing-model-clips-only':'empty-clip-only'}])),
  stages2d:Object.fromEntries(Object.entries(stages).map(([id,resource])=>[id,{preset:resource.preset,clips:resource.preset==='custom'?Object.keys(resource.model?.animations??{}).sort():[],clipMode:resource.preset==='custom'?'existing-model-clips-only':'empty-clip-only'}]))
 };
}
