import type {Project} from './model.ts';
import type {BoardReviewTarget,BoardSubject} from './storyboard.ts';
export type ImageReference={imageId:string;name:string;data:string;subjects:{kind:string;id:string;name:string}[]};
/** Only selected identities/equipment, never the whole image library or a previous scene collage. */
export function imageGenerationReferences(project:Project,target:BoardReviewTarget|null):ImageReference[]{
 const b=project.storyboard;if(!b||!target)return [];
 const linked:{kind:string;subject:BoardSubject}[]=[];
 const add=(kind:string,subject:BoardSubject|undefined)=>{if(subject&&!linked.some(x=>x.kind===kind&&x.subject.id===subject.id))linked.push({kind,subject});};
 const equipment=(id:string)=>{const setting=b.settings.find(s=>s.id===id);for(const object of b.characters.filter(c=>c.kind==='object'&&setting?.objects?.includes(c.id)))add('object',object);};
 if(target.kind==='characters'){const c=b.characters.find(c=>c.id===target.id);add(c?.kind??'character',c);}
 else if(target.kind==='settings')equipment(target.id);
 else{
  const shot=b.shots.find(s=>s.id===target.id);
  for(const c of b.characters.filter(c=>shot?.characters.includes(c.id)))add(c.kind,c);
  for(const setting of b.settings.filter(s=>shot?.settings.includes(s.id))){add('setting',setting);equipment(setting.id);}
 }
 const refs=new Map<string,ImageReference>();
 for(const {kind,subject}of linked){
  if(!subject.image)continue;const image=b.images[subject.image];if(!image?.data)continue;
  let ref=refs.get(subject.image);if(!ref){ref={imageId:subject.image,name:image.name,data:image.data,subjects:[]};refs.set(subject.image,ref);}
  ref.subjects.push({kind,id:subject.id,name:subject.name});
 }
 const result=[...refs.values()];
 if(result.length>8)throw new Error('Reference images: maximum 8 images. Reduce references or disable reference images.');
 return result;
}
