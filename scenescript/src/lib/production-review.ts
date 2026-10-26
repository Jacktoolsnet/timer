import type {Model3D} from './model3d.ts';
import type {Project} from './model.ts';
import type {Storyboard} from './storyboard.ts';
export type ProductionIssue={code:'unspecified'|'unexpected3d'|'missing3d'|'missing2d'|'missingMotion'|'missingCamera'|'missingDialogue'|'speechPending'|'missingMusic'|'sfxPending'|'sfxPlanMissing';detail?:string;pending?:boolean};
/** Structural checks only, not a guarantee of artistic quality or semantic completeness. */
export function reviewProduction(p:Project,board:Storyboard|null=p.storyboard):ProductionIssue[]{
 const plan=board?.production;if(!plan)return [];
 const issues:ProductionIssue[]=[];
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
 if(plan.renderMode==='mixed'&&!p.scenes.some(s=>s.elements.some(e=>e.type==='text'||e.type==='image'||e.type==='shape')))issues.push({code:'missing2d'});
 const narration=[p.narration,...p.scenes.map(s=>s.narration)].filter(n=>n?.text.trim());
 if(plan.dialogue){
  if(!narration.length)issues.push({code:'missingDialogue'});
  else for(const n of narration)if(n&&(!n.asset||n.muted||n.volume<=0))issues.push({code:'speechPending',detail:n.speaker||n.text.slice(0,120),pending:true});
 }
 if(plan.music&&(!p.music?.enabled||p.music.volume<=0||!p.music.instruments.some(i=>i.volume>0)||(p.music.mode==='score'&&!p.music.notes.some(n=>n.velocity>0))))issues.push({code:'missingMusic'});
 if(plan.sfx){
  const tasks=board!.shots.flatMap(s=>(s.soundEffects??[]).map(description=>({code:'sfxPending' as const,detail:s.title+': '+description,pending:true})));
  issues.push(...(tasks.length?tasks:[{code:'sfxPlanMissing' as const}]));
 }
 return issues;
}
export function productionInstructions(board:Storyboard){
 const p=board.production;if(!p)return '';
 return 'Binding production requirements: '+JSON.stringify(p)+'. '+
 ((p.renderMode==='3d'||p.renderMode==='mixed')?'Build real 3D characters and stages with model.parts geometry, scene.stage3d actors, meaningful motion and 3D camera movement. Storyboard images are design references, NOT flat scene replacements or image-plane stand-ins. Text overlays are allowed only when planned. ':'')+
 (p.renderMode==='mixed'?'Combine actual 3D with deliberate 2D elements. ':'')+
 (p.dialogue?'Create literal dialogue in Scene.narration.text with stable speaker IDs/assigned voices; split executable scenes for speaker changes. Do not substitute dialogue with subtitles. For speaking 3D actors bind speech to scene narration for audio-driven lip movement. Missing recordings remain pending for the separate paid speech workflow; do not invent audio Base64. ':'')+
 (p.music?'Include audible enabled Project.music using native generated music or a valid score, not merely a textual music description. ':'')+
 (p.sfx?'Preserve shot.soundEffects as concrete pending SFX tasks. This editor has no automatic SFX generation/playback track; never claim these descriptions are already audible. ':'');
}
