import {parseStoryboard,invalidateStoryboardApprovals,type Storyboard,type BoardReviewTarget} from './storyboard.ts';
/** Detach one preview; retain the asset while any other storyboard element references it. */
export function removeStoryboardImage(source:Storyboard,target:BoardReviewTarget):Storyboard{
 const draft=structuredClone(source),item=draft[target.kind].find(x=>x.id===target.id);
 if(!item)throw new Error('Storyboard: missing image target');
 const image=item.image;if(!image)return source;
 item.image=null;
 if(![...draft.characters,...draft.settings,...draft.shots].some(x=>x.image===image))delete draft.images[image];
 draft.revision++;invalidateStoryboardApprovals(draft,target);return parseStoryboard(draft);
}
