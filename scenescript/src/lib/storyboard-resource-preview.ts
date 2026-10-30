import {boardDefinition2D} from './storyboard-model2d.ts';
import type {Project} from './model.ts';
import type {BoardSubject,Storyboard} from './storyboard.ts';

/** Stable IDs are the default association; an explicit null clears it. Never guess by name. */
export function boardResource2D(project:Project,subject:BoardSubject,setting:boolean){
 const kind=setting?'stages2d':'objects2d',id=subject.model2d?subject.resource2d??subject.id:subject.resource2d===undefined?subject.id:subject.resource2d;
 return {kind,id,resource:boardDefinition2D(subject,setting)??(id&&Object.hasOwn(project[kind],id)?project[kind][id]:null)} as const;
}
export function boardResourceModes(project:Project,board:Storyboard,subject:BoardSubject,setting:boolean):('2d'|'3d')[]{
 const mode=subject.design?.mode??'inherit',effective=mode==='inherit'?board.production?.renderMode:mode;
 if(effective==='2d'||effective==='3d')return [effective];
 const has2D=!!boardResource2D(project,subject,setting).resource,has3D=!!subject.model3d;
 if(has2D||has3D)return [...(has2D?['2d' as const]:[]),...(has3D?['3d' as const]:[])];
 return project.scenes.some(s=>s.stage2d)&&!project.scenes.some(s=>s.stage3d)?['2d']:['3d'];
}
