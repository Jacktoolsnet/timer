import {stageFrame2D,matchingFrame2D} from './stage2d-frame.ts';
import {objectSoundScore2D} from './sound2d.ts';
import {musicEvents} from './music.ts';
import type {Model3D} from './model3d.ts';
import type {Project} from './model.ts';
import type {Storyboard} from './storyboard.ts';
export type ProductionIssue={code:'formatMismatch'|'stageFormat'|'missingModel'|'unusedResource'|'unspecified'|'unexpected3d'|'missing3d'|'missing2d'|'missingMotion'|'missingCamera'|'missingDialogue'|'speechPending'|'missingMusic'|'sfxPending'|'sfxPlanMissing';detail?:string;pending?:boolean};
/** Structural checks only, not a guarantee of artistic quality or semantic completeness. */
export function reviewProduction(p:Project,board:Storyboard|null=p.storyboard):ProductionIssue[]{
 const plan=board?.production,issues:ProductionIssue[]=[];
 if(board&&p.format!==board.format)issues.push({code:'formatMismatch',detail:p.format+' → '+board.format});
 const used=new Set(p.scenes.flatMap(s=>s.stage2d?[s.stage2d.stage,...(s.stage2d.transition?[s.stage2d.transition.stage]:[])]:[]));
 for(const id of used){const stage=p.stages2d[id];if(stage&&!matchingFrame2D(stageFrame2D(stage),p.format))issues.push({code:'stageFormat',detail:stage.name});}
 if(board){for(const [kind,items]of [['characters',board.characters],['settings',board.settings]] as const){for(const s of items){if(!board.shots.some(shot=>shot[kind].includes(s.id)))continue;const mode=s.design?.mode==='inherit'?plan?.renderMode:s.design?.mode;if(mode==='3d'&&!s.model3d)issues.push({code:'missingModel',detail:s.name});if(s.status==='approved'&&s.model3d&&!p.scenes.some(scene=>kind==='settings'?scene.stage3d?.stage===s.id:scene.stage3d?.actors.some(a=>a.character===s.id)))issues.push({code:'unusedResource',detail:s.name});}}}
 if(!plan)return issues;
 const solid=(model:Model3D|null|undefined)=>model?.parts.some(part=>part.shape!=='plane'&&part.shape!=='group'&&part.opacity>0&&part.size.x>0&&part.size.y>0&&part.size.z>0)??false;
 const worlds=p.scenes.filter(s=>s.stage3d&&(s.stage3d.actors.some(a=>solid(p.characters[a.character]?.model))||(s.stage3d.groups?.length??0)>0||solid(p.stages[s.stage3d.stage]?.model)));
 if(plan.renderMode==='auto')issues.push({code:'unspecified'});
 if(plan.renderMode==='2d'&&worlds.length)issues.push({code:'unexpected3d'});
 if(plan.renderMode==='3d'||plan.renderMode==='mixed'){
  if(!worlds.length)issues.push({code:'missing3d'});
  else{
   if(!worlds.some(s=>{const w=s.stage3d!;return (w.stageMotions?.length??0)>0||w.actors.some(a=>!!a.path||a.action!=='idle'||a.toX!==a.x||a.toZ!==a.z||a.actions.some(a=>a.type!=='idle')||a.motions.length>0);}))issues.push({code:'missingMotion'});
   if(!worlds.some(s=>{const c=s.stage3d!.camera;return c.orbit!==0||!!c.follow||(c.keys?.length??0)>1;}))issues.push({code:'missingCamera'});
  }
 }
 if(plan.renderMode==='mixed'&&!p.scenes.some(s=>s.stage2d||s.elements.some(e=>e.type==='text'||e.type==='image'||e.type==='shape')))issues.push({code:'missing2d'});
 const narration=[p.narration,...p.scenes.map(s=>s.narration)].filter(n=>n?.text.trim());
 if(plan.dialogue){
  if(!narration.length)issues.push({code:'missingDialogue'});
  else for(const n of narration)if(n&&(!n.asset||n.muted||n.volume<=0))issues.push({code:'speechPending',detail:n.speaker||n.text.slice(0,120),pending:true});
 }
 if(plan.music&&(!p.music?.enabled||p.music.volume<=0||!p.music.instruments.some(i=>i.volume>0)||(p.music.mode==='score'&&!p.music.notes.some(n=>n.velocity>0))))issues.push({code:'missingMusic'});
 if(plan.sfx){
  // Native score instruments can implement synthesized SFX without a recording.
  // Exact task/name binding plus an audible event in the shot is structural evidence,
  // not a judgement of sound quality. Unmatched descriptions stay pending as before.
  const soundScore=objectSoundScore2D(p);let start=0,count=0;const total=p.scenes.reduce((sum,scene)=>sum+scene.duration,0);
  for(const shot of board!.shots){
   const end=start+shot.duration;
   for(const description of shot.soundEffects??[]){
    count++;
    const audible=[p.music,soundScore].some(music=>music?.enabled&&music.mode==='score'&&music.volume>0&&music.instruments.some(instrument=>instrument.name===description&&instrument.volume>0&&musicEvents(music,total,start,end).some(note=>note.instrument===instrument.id&&note.at>=start&&note.at<end&&note.velocity>0)));
    if(!audible)issues.push({code:'sfxPending',detail:shot.title+': '+description,pending:true});
   }
   start=end;
  }
  if(!count)issues.push({code:'sfxPlanMissing'});
 }
 return issues;
}
export function productionInstructions(board:Storyboard){
 const format=' Target project.format MUST be '+board.format+'. Compose natively for this format, no letterboxing. 2D custom stage frames use '+JSON.stringify((board.format==='portrait'?{width:540,height:960}:board.format==='square'?{width:720,height:720}:{width:960,height:540}))+'. ';
 const p=board.production;const resources=[...board.characters,...board.settings].filter(s=>s.status==='approved'&&s.model3d);const design=' Respect each subject.design (mode, style, surface, details); rounded/natural humans must not become Roblox/block figures. Approved subject.model3d geometry is binding and restored locally under the same subject ID in project.characters or project.stages. Reference those exact IDs in actors/stages; do not duplicate or redesign reviewed resources. Existing clips and joints are the movement vocabulary. '+(resources.length?'Reviewed model IDs: '+resources.map(s=>s.id).join(', ')+'. ':'');if(!p)return format+design;
 return format+design+((p.renderMode==='2d'||p.renderMode==='mixed')?'For 2D use Project.objects2d and Project.stages2d as reusable resource libraries. Reference object IDs from Scene.stage2d.actors with unique scene-local instance IDs. Keep appearance in resources and timing, placement, actions, camera and stage transitions in scenes. Reuse matching storyboard subject IDs when creating resources. Do not return the old bundled light-collector preset. ':'')+'Binding production requirements: '+JSON.stringify(p)+'. '+
 ((p.renderMode==='3d'||p.renderMode==='mixed')?'Build real 3D characters and stages with model.parts geometry, scene.stage3d actors, meaningful motion and 3D camera movement. Storyboard images are design references, NOT flat scene replacements or image-plane stand-ins. Text overlays are allowed only when planned. ':'')+
 (p.renderMode==='mixed'?'Combine actual 3D with deliberate 2D elements. ':'')+
 (p.dialogue?'Create literal dialogue in Scene.narration.text with stable speaker IDs/assigned voices; split executable scenes for speaker changes. Do not substitute dialogue with subtitles. For speaking 3D actors bind speech to scene narration for audio-driven lip movement. Missing recordings remain pending for the separate paid speech workflow; do not invent audio Base64. ':'')+
 (p.music?'Include audible enabled Project.music using native generated music or a valid score, not merely a textual music description. ':'')+
 (p.sfx?'Preserve shot.soundEffects as concrete pending SFX tasks. For reusable 2D SFX prefer Object2D.sounds bindings (see the authoring guide), linked to actor actions/clips; actor.sound controls mute/volume/pitch. Keep scene transition sounds and accompaniment in Project.music. For other synthesized SFX you may use native Project.music in score mode: give each SFX instrument exactly the corresponding soundEffects description as its name and schedule audible notes within that storyboard shot. Keep a musical accompaniment as well when music is required. Unmatched descriptions remain pending; never claim descriptions alone are audible. There is no automatic SFX recording generation track. ':'');
}
