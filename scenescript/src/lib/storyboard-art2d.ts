/** Dedicated alpha-capable edit model; never silently retry another model after a provider rejection. */
export const artworkEditSettings={model:'gpt-image-1.5',size:'1024x1024',quality:'high',background:'transparent',input_fidelity:'high'} as const;
import type {Project} from './model.ts';
import type {BoardReviewTarget} from './storyboard.ts';
import {resourceSubject} from './storyboard-resources.ts';
import {parseModel2D} from './model2d.ts';
import {formatFrame2D} from './stage2d-frame.ts';
import {defaultBoardDesign} from './storyboard-design.ts';
/** Select only the subject's own sketch; equipment/shot references are never sprite bases. */
export function artworkSource2D(project:Project,target:BoardReviewTarget){
 if(!project.storyboard||target.kind==='shots')return null;
 const s=resourceSubject(project.storyboard,target),library=target.kind==='settings'?project.stages2d:project.objects2d,existing=s.model2d??library[s.resource2d??s.id]?.model;
 // Refinements keep an already authored illustration and its effects/rig, not a fresh seed.
 if(existing?.parts.some(p=>p.shape==='sprite'))return null;
 const image=s.image?project.storyboard.images[s.image]:undefined;
 return image?.data?{image,existing,setting:target.kind==='settings'}:null;
}
/** Ephemeral input only: never mutate the user's board, approvals, library or original sketch. */
export function seedArtwork2D(project:Project,target:BoardReviewTarget,image:{name:string;data:string},pixels:{width:number;height:number}){
 const board=project.storyboard!;const s=resourceSubject(board,target),setting=target.kind==='settings',old=artworkSource2D(project,target)?.existing;
 const frame=formatFrame2D(board.format),width=setting?frame.width:old?.width??Math.round(320*Math.min(1,pixels.width/pixels.height)),height=setting?frame.height:old?.height??Math.round(320*Math.min(1,pixels.height/pixels.width));
 const scale=setting?Math.max(width/pixels.width,height/pixels.height):Math.min(width/pixels.width,height/pixels.height),w=pixels.width*scale,h=pixels.height*scale;
 const model=parseModel2D({width,height,originX:setting?0:old?.originX??width/2,originY:setting?0:old?.originY??height,images:{reference:image},parts:[{id:'artwork',shape:'sprite',image:'reference',x:(width-w)/2,y:setting?(height-h)/2:height-h,width:w,height:h}],animations:{}});
 const subject={...s,model2d:model,model2dDesign:structuredClone(s.design??defaultBoardDesign())};
 return {...project,storyboard:{...board,[target.kind]:board[target.kind].map(item=>item.id===target.id?subject:item)}} as Project;
}
export const artwork2DInstructions='The supplied model contains the selected sketch as an actual embedded sprite, not merely a visual suggestion. Keep the artwork sprite visible with its original image ID, colors, texture, highlights, aspect ratio and base dimensions. Do not replace or cover it with vector geometry. Add separate restrained animation/effect layers only where requested (e.g. steam, glints, candlelight); no generic wobble, pulse or flashing over the entire illustration. Existing old vector clips are not a rig for painted limbs. Painted characters support whole-body motion; independently articulated limbs require separately authored image layers. For settings the image is already cover-fitted to authoringFrame; preserve the full-frame composition. Return existing image manifests {name}, never invented Base64. Describe real limitations honestly.';
export function artwork2DWords(locale:string){return locale==='de'?{hint:'2D mit Skizze: Illustration als Bildbasis erhalten. Für Freistellung oder das Entfernen fremder Objekte bei Bedarf max. ein zusätzlicher Bild-API-Aufruf (gpt-image-1.5, hohe Qualität und Vorlagentreue). Ohne Skizze: Vektormodell. Bestehende Bildressourcen werden weiterverwendet.',preparing:'2D-Bildbasis wird vorbereitet …',cutout:'Skizze wird freigestellt (Bild-API) …',invalid:'Die Bild-API hat keine nutzbare Freistellung geliefert. Die Ressource und die Originalskizze bleiben unverändert. Bitte eine freigestellte Skizze verwenden und erneut starten.'}:{hint:'2D with sketch: preserve illustration as image base. If cutout or removal of unrelated objects is needed, at most one additional image API call (gpt-image-1.5, high quality and input fidelity). Without sketch: vector model. Existing image resources are reused.',preparing:'Preparing 2D artwork …',cutout:'Creating transparent cutout (image API) …',invalid:'The image API did not return a usable transparent cutout. Resource and original sketch are unchanged. Please use a transparent sketch and try again.'};}

export const artworkIsolationInstructions='For this NEW sketch-backed resource, also return artworkEdit:boolean alongside model/reply. Inspect the supplied artwork and selected description/comments. Set true if it contains a separate prop, person, scenery or other content that must NOT be baked into the selected resource (including items explicitly described as separate scene objects). Transparency alone does not prove isolation. The application can remove unrelated content with one image-edit call; do NOT hide it with painted patches or replace the illustration with vectors. Set false when the image already contains only the selected resource. Keep the provided sprite and its image manifest in either case.';
