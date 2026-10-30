import {utf8ByteLength} from './data-size.ts';
import {acceptBoardModel2D} from './storyboard-model2d.ts';
import {acceptBoardModel} from './storyboard-resources.ts';
import type {Project} from './model.ts';
import type {BoardReviewTarget} from './storyboard.ts';
export const MAX_RESOURCE_IMPORT_BYTES=8*1024*1024;
/** Import a single model or its AI response envelope, never an entire project/plan. */
export function importStoryboardResource(text:string,project:Project,target:BoardReviewTarget,dimension:'2d'|'3d'):Project{
 if(utf8ByteLength(text)>MAX_RESOURCE_IMPORT_BYTES)throw Error('Resource JSON: maximum 8 MiB');
 const raw=JSON.parse(text.replace(/^\uFEFF/,''));
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Resource JSON: expected a model object or {model,reply}');
 const response=Object.hasOwn(raw,'model')?raw:{model:raw};
 return (dimension==='2d'?acceptBoardModel2D:acceptBoardModel)(JSON.stringify(response),project,target);
}
