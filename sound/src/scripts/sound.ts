import {instrumentGroups,pickerCopy,type InstrumentGroup} from '../lib/instrument-picker';
import {tapNoteAt,tapNoteY,tapNoteKey,tapNoteSemitones,tapNoteDegree} from '../lib/tap-notes';
import {wavSupported,createWavRecording} from '../lib/wav-export';
import {fileCopy} from '../lib/file-copy';
import {mp4Type,createMp4Recording,paintVideo} from '../lib/video-export';
import {padNumbers,padForKey,padBounds,focusedPadCenter,focusedPadAt,padFocusCopy} from '../lib/orbit-layout';
import {RHYTHM_EDIT_MUSIC_LEVEL,cloneRhythm,emptyRhythm,hasRhythm,rhythmLane,recordRhythmHit,rhythmHitsAt,finishRhythm,rhythmBarPoints,replacingRhythmLane,resetRhythmSession,remeterRhythm,rhythmCopy,type RhythmLane} from '../lib/tap-rhythm';
import {createRhythmPlayer} from '../lib/rhythm-player';
import {performanceGate} from '../lib/performance';
import {gridEvolutionPlan,enrichGrid,variedGrid,gridSizes,gridCopy,remapPoints,gridEvents,gridPhraseHold,swingPosition,gridFractionAtTime,canEvolveGrid,type GridChoice,type GridSize} from '../lib/track-grid';
import {gestureCopy,HOLD_DELAY,RING_FADE,gestureMode,holdSteps,ringAppearance,type GestureMode} from '../lib/pad-gestures';
import {danceRhythmRole,danceRhythmWave,rhythmDrums,rhythmClarity,isRhythmDance,type PulseInstrument} from '../lib/dance-rhythm';
import {tangoPulseRole,tangoPulseWave,dancePulseClarity} from '../lib/tango';
import {waltzPulseRole,waltzPulseWave,slowWaltzSwell,slowWaltzMix} from '../lib/waltz';
import {dances,danceIds,danceCopy,danceFoundation,dancePoints,type DanceId} from '../lib/dances';
import {resolveGroove,grooveCopy,groovePattern,grooveMutationGrid,grooveAnchors,grooveAnchored,grooveRole,grooveAccent,randomGroovePattern,type GrooveChoice} from '../lib/groove';
import {mixLevels,balancedMix,performanceVelocity} from '../lib/mixing';
import {sustainedInstruments,phraseActive,phraseHold,type SustainedInstrument} from '../lib/phrasing';
import {createSustainedVoice} from '../lib/sustained-voice';
import {noteGlow} from '../lib/note-glow';
import {developmentPlan,accompanimentMotif,registerArc,registerNote,type DevelopmentPlan} from '../lib/development';
import {vocalInstruments,vowelPosition,vocalFundamental,vocalCharacter} from '../lib/vocal';
import {voiceRecipe} from '../lib/voice-recipes';
import {acousticInstruments,acousticWave,type AcousticInstrument} from '../lib/acoustic';
import {spaceProfile,stereoPosition,sectionExpression} from '../lib/space';
import {createAudioSpace} from '../lib/audio-space';
import {arrangementPlan,breathGain,ornamentAt,type ArrangementPlan} from '../lib/arrangement';
import {dialogueInstrument,answerMotif,timbreMotion} from '../lib/expression';
import {songForm,copyPhrases,sectionGain,songCopy,type Phrase,type Section,type SongPart} from '../lib/song';
import {makeMotif,varyMotif,chordFor,melodicSemitones,isMelodic,gestureDegree} from '../lib/harmony';
import {jazzSemitones} from '../lib/jazz-harmony';
import {storageAllowed} from '../lib/storage';
import {STORAGE_KEY} from '../lib/engine';
import {decodeSettings,type SoundSettings} from '../lib/sound-settings';
import {soundProfiles} from '../lib/sound-profiles';
import {approach,journeyLength,morphWeights} from '../lib/journey';
import {presets,partsForStyle,evolutionPalette,styleCopy,type StyleId} from '../lib/presets';
import {screenWakeLock} from '../lib/wake-lock';
import {evolvePattern,nextEvolutionStep} from '../lib/evolution';
import {enhanceClockSelects} from '../../../shared/preview-selects';
import {defaultInstruments,instrumentIds,instrumentNames,type InstrumentId} from '../lib/instruments';
import {copy,pitchCopy} from '../lib/sound-i18n';
const t=copy[document.documentElement.lang as keyof typeof copy]||copy.en;
const $=<T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const orbit=$<HTMLCanvasElement>('#orbit'), drawing=$<HTMLCanvasElement>('#drawing');
const oc=orbit.getContext('2d')!,dc=drawing.getContext('2d')!;
const atmosphere=$<HTMLCanvasElement>('#sound-atmosphere'),ac=atmosphere.getContext('2d')!;
const colors=['#21bed1','#a482ed','#f0788c','#d8a847','#48bca0','#e68a44','#779cf5','#dc7bcb','#b2c85e'];
const lightColors=['#00869b','#7845c7','#cf3659','#a66a08','#078565','#bd5715','#3d66c5','#b0399c','#6c8120'];
const initialParts=partsForStyle('electronic');
const tracks=colors.map((color,i)=>({color,grid:'auto' as GridChoice,slots:16 as GridSize,pendingGrid:null as GridChoice|null,pendingSlots:null as GridSize|null,motif:makeMotif(presets.electronic.melody),phase:0,direction:1,directionMode:'forward',pendingDirection:null as number|null,randomDynamics:false,lastVelocity:1,scheduledVelocity:1,morph:null as {to:InstrumentId;progress:number;from:number;at:number;duration:number}|null,hitVelocities:Array<number>(16).fill(1),enabled:true,instrument:initialParts[i].instrument,points:Array.from({length:16},(_,s)=>initialParts[i].steps.includes(s)),mute:false,volume:initialParts[i].volume??.55,pitch:initialParts[i].pitch??0,flash:Array(16).fill(-100),hits:Array<number>(16).fill(-Infinity)}));
let audio:AudioContext|undefined, master:GainNode|undefined, playing=false,timer:ReturnType<typeof setInterval>|undefined,nextTime=0,step=0,bpm=100;
let recordingOutput:DynamicsCompressorNode|undefined;
let videoRecording:ReturnType<typeof createMp4Recording>|null=null;
let wavRecording:Awaited<ReturnType<typeof createWavRecording>>|null=null;
let space:ReturnType<typeof createAudioSpace>|undefined,tapSpace:ReturnType<typeof createAudioSpace>|undefined;
const acousticCache=new Map<string,AudioBuffer>();
let noiseBuffer:AudioBuffer|undefined;
const liveMix=tracks.map(()=>new Set<GainNode>());
let currentMix=tracks.map(()=>1);
const sustained=new Map<string,{track:number;time:number;id:SustainedInstrument;voice:ReturnType<typeof createSustainedVoice>}>();
let lastPadDark:boolean|undefined;
let visualStep=0,visualTime=0,visualDuration=.15;
const language=document.documentElement.lang as keyof typeof styleCopy;
let currentStyle:StyleId='electronic',pendingStyle:StyleId|null=null;
let currentDance:DanceId|null=null,pendingDance:DanceId|null=null;
function currentPreset(){return currentDance?dances[currentDance].preset:presets[currentStyle];}
function rhythmTrack(i:number){return danceFoundation(currentDance,i);}
function waltzPulse(i:number){return tracks[i].slots===stepsPerBar()?waltzPulseRole(groove.beats,tracks[i].instrument,tracks[i].points):null;}
function pulseTrack(i:number){return rhythmTrack(i)||waltzPulse(i)!==null||(currentStyle==='focus'&&groove.choice==='auto'&&!currentDance&&['kick','shaker','bass'].includes(tracks[i].instrument));}
let grooveChoice:GrooveChoice='auto',pendingGroove:GrooveChoice|null=null;
let groove=resolveGroove(currentStyle,grooveChoice);
function stepsPerBar(){return groove.steps;}
let padMode:'draw'|'rhythm'='draw';
let selectedPad:RhythmLane|null=null,padSwitchBlocked=false;
const padNotes=Array<number>(9).fill(3);
let nextRhythmKeyId=-20;
const editFaders=tracks.map(()=>new Set<GainNode>());
function editLevel(i:number){if(tracks[i].mute)return 0;return rhythmEditing&&selectedPad!==null&&selectedPad!==i?RHYTHM_EDIT_MUSIC_LEVEL:1;}
function padPoint(lane:RhythmLane){return focusedPadCenter(lane,drawing.width,drawing.height,selectedPad);}
let tapPattern=emptyRhythm(groove.beats);
let rhythmBackup:ReturnType<typeof cloneRhythm>|null=null;
function snapshotRhythmTrack(tr:typeof tracks[number]){
 return {instrument:tr.instrument,mute:tr.mute,points:[...tr.points],phase:tr.phase,direction:tr.direction,directionMode:tr.directionMode,
  pendingDirection:tr.pendingDirection,grid:tr.grid,slots:tr.slots,pendingGrid:tr.pendingGrid,pendingSlots:tr.pendingSlots,morph:tr.morph?{...tr.morph}:null};
}
let rhythmTrackBackup:ReturnType<typeof snapshotRhythmTrack>[]|null=null;
const rhythmTouched=new Set<number>();
function beginRhythmEdit(){
 if(rhythmBackup)return;
 rhythmBackup=cloneRhythm(tapPattern);rhythmTrackBackup=tracks.map(snapshotRhythmTrack);rhythmTouched.clear();
}
function acceptRhythmEdit(){rhythmBackup=null;rhythmTrackBackup=null;rhythmTouched.clear();}
function cancelRhythmEdit(){
 if(!rhythmBackup)return;
 rhythmGeneration++;cancelPadGestures();rhythmPlayer?.stop();cancelTappedVoices();
 const changed=tracks.map((_,i)=>tappedTrack(i)||rhythmBackup!.hits[i].some(Boolean));
 tapPattern=rhythmBackup;
 if(rhythmTrackBackup)for(const index of rhythmTouched)Object.assign(tracks[index],rhythmTrackBackup[index]);
 acceptRhythmEdit();rhythmEditing=false;selectedPad=null;padSwitchBlocked=false;
 // Drop draft-only queued visual hits; the transport itself keeps running.
 events.forEach(event=>{event.notes=event.notes.filter(note=>!changed[note.track]);});
 tracks.forEach((tr,i)=>{
  if(changed[i]){tr.hits.fill(-Infinity);tr.flash.fill(-100);}
  if(tappedTrack(i)&&audio)liveMix[i].forEach(node=>{node.gain.cancelScheduledValues(audio!.currentTime);node.gain.setTargetAtTime(0,audio!.currentTime,.006);});
 });
 sync();persistSettings();
}
let rhythmEditing=false,orbitBus:GainNode|undefined,tapBus:GainNode|undefined;
let rhythmPlayer:ReturnType<typeof createRhythmPlayer>|undefined;
let rhythmStarting:Promise<void>|null=null,rhythmGeneration=0;
const rhythmClock:{step:number;time:number;duration:number}[]=[];
const percussion=new Set(['kick','snare','hat','clap','tom','rim','shaker','conga']);
const rhythmColors=tracks.map((_,i)=>i);
const tappedVoices=new Set<{track:number;time:number;fader:GainNode}>();
const heldRhythmKeys=new Map<string,number>();
function tappedTrack(index:number){return tapPattern.hits[index].some(Boolean);}
function protectedRhythmTrack(index:number){return selectedPad===index||tappedTrack(index)||!!rhythmBackup?.hits[index].some(Boolean);}
function cancelTappedVoices(index?:number,after=-Infinity){
 if(!audio)return;
 for(const entry of tappedVoices)if((index===undefined||entry.track===index)&&entry.time>=after){
  entry.fader.gain.cancelScheduledValues(audio.currentTime);
  entry.fader.gain.setTargetAtTime(0,audio.currentTime,.006);
 }
 sustained.forEach((entry,key)=>{if(key.startsWith('tap:')&&entry.time>=after&&(index===undefined||entry.track===index)){entry.voice.release(audio!.currentTime);sustained.delete(key);}});
}
function audibleMixTracks(){return hasRhythm(tapPattern)?tracks.map((tr,i)=>tappedTrack(i)?{...tr,mute:true}:tr):tracks;}
function rhythmPosition(time=audio?.currentTime||0){
 const clock=[...rhythmClock].reverse().find(entry=>entry.time<=time)||rhythmClock[0];
 return clock?Math.max(0,clock.step+(time-clock.time)/clock.duration):0;
}
function syncRhythmUi(){
 const text=rhythmCopy[language],active=padMode==='rhythm';
 document.querySelectorAll<HTMLButtonElement>('[data-pad-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.padMode===padMode)));
 $('#rhythm-zones').hidden=!active;$('#rhythm-controls').hidden=!active;
 drawing.setAttribute('aria-describedby','gesture-keyboard');
 drawing.dataset.selectedPad=selectedPad===null?'':String(selectedPad);
 $('#rhythm-zones').dataset.focused=String(selectedPad!==null);
 const keyNames=tracks.map((tr,i)=>padNumbers[i]+': '+instrumentNames[language][instrumentIds.indexOf(tr.instrument)]).join('; ');
 $('#gesture-keyboard').textContent=active?padFocusCopy[language].keyboard+' '+keyNames:gestureCopy[language].help+' '+gestureCopy[language].keyboard;
 const hint=active?text.hint:gestureCopy[language].hint;
 drawing.setAttribute('aria-label',active&&selectedPad!==null?padNumbers[selectedPad]+' · '+instrumentNames[language][instrumentIds.indexOf(tracks[selectedPad].instrument)]+' · '+hint:hint);
 const status=padSwitchBlocked?padFocusCopy[language].pending:active&&selectedPad===null?padFocusCopy[language].choose:active&&rhythmEditing&&hasRhythm(tapPattern)?text.editing:tapPattern.state==='armed'?text.armed:tapPattern.state==='recording'?text.recording:playing?text.loop:text.paused;
 if($('#rhythm-status').textContent!==status)$('#rhythm-status').textContent=status;
 drawing.dataset.mode=padMode;drawing.dataset.rhythmState=tapPattern.state;
 drawing.dataset.rhythmHits=String(tapPattern.hits.reduce((n,lane)=>n+lane.filter(Boolean).length,0));
 drawing.dataset.rhythmPattern=JSON.stringify(tapPattern.hits);
 drawing.dataset.rhythmNotes=JSON.stringify(tapPattern.notes);
 document.querySelectorAll<HTMLElement>('#rhythm-zones>[data-lane]').forEach((zone,i)=>{
  const tr=tracks[i],name=instrumentNames[language][instrumentIds.indexOf(tr.instrument)];
  zone.querySelector('.pad-instrument')!.textContent=name;zone.style.setProperty('--lane',tr.color);
  zone.dataset.disabled=String(!tr.enabled||tr.mute||tr.volume===0);zone.dataset.recorded=String(tappedTrack(i));
  zone.title=padNumbers[i]+' · '+name;
  zone.dataset.selected=String(selectedPad===i);
  zone.dataset.melodic=String(isMelodic(tr.instrument));
  zone.style.setProperty('--note-row',String(7-padNotes[i]));
  const b=padBounds(i as RhythmLane,100,100,selectedPad);
  zone.style.left=b.x+'%';zone.style.top=b.y+'%';zone.style.width=b.width+'%';zone.style.height=b.height+'%';
 });
 $('#pad-instrument-actions').hidden=selectedPad===null;
 if(selectedPad!==null){
  const muted=tracks[selectedPad].mute;
  $('#pad-mute').setAttribute('aria-pressed',String(muted));
  labelAction('#pad-mute',pickerCopy[language][muted?'unmute':'mute']);
 }else if($<HTMLDialogElement>('#instrument-dialog').open)$<HTMLDialogElement>('#instrument-dialog').close();
 $('#rhythm-record').toggleAttribute('disabled',selectedPad===null);
 $('#rhythm-clear').toggleAttribute('disabled',selectedPad===null||!tapPattern.hits[selectedPad].some(Boolean));
 $('#rhythm-done').toggleAttribute('disabled',!rhythmEditing);
 $('#rhythm-cancel').toggleAttribute('disabled',rhythmBackup===null);
 const musicLevel=active&&rhythmEditing&&selectedPad!==null ? RHYTHM_EDIT_MUSIC_LEVEL : 1;
 drawing.dataset.laneLevels=tracks.map((_,i)=>editLevel(i)).join(',');
 drawing.dataset.musicLevel=String(musicLevel);drawing.dataset.rhythmEditing=String(rhythmEditing);
 if(audio&&orbitBus){
  orbitBus.gain.setTargetAtTime(1,audio.currentTime,.18);
  tapBus?.gain.setTargetAtTime(1,audio.currentTime,.18);
  editFaders.forEach((nodes,i)=>nodes.forEach(node=>{node.gain.cancelAndHoldAtTime(audio!.currentTime);node.gain.setTargetAtTime(editLevel(i),audio!.currentTime,.18);}));
  tracks.forEach((_,i)=>rhythmPlayer?.setLaneLevel(i as RhythmLane,editLevel(i)));
 }
}
function resetTapRhythm(){
 rhythmGeneration++;rhythmPlayer?.stop();cancelTappedVoices();
 rhythmEditing=padMode==='rhythm';tapPattern=emptyRhythm(groove.beats);cancelPadGestures();syncRhythmUi();persistSettings();
}
async function tapRhythm(lane:RhythmLane,pressed:number,note:number|null=null){
 const generation=rhythmGeneration;
 if(!playing){
  rhythmStarting??=start().finally(()=>{rhythmStarting=null;});
  await rhythmStarting;
 }
 if(!playing||!audio||generation!==rhythmGeneration)return;
 const tr=tracks[lane];if(!tr.enabled||tr.mute||tr.volume<=0)return;
 padSwitchBlocked=false;beginRhythmEdit();rhythmTouched.add(lane);
 const at=audio.currentTime-Math.max(0,performance.now()-pressed)/1000,position=rhythmPosition(at);
 const replacing=replacingRhythmLane(tapPattern,position,lane);
 // Cancel only this lane's already queued hits; the other fingers/loops keep playing.
 rhythmPlayer?.cancelLane(lane,replacing?-Infinity:audio.currentTime);
 cancelTappedVoices(lane,replacing?-Infinity:audio.currentTime);
 events.forEach(event=>{if(event.time>=audio!.currentTime)event.notes=event.notes.filter(note=>note.track!==lane);});
 // A tapped part keeps its selected timbre; the untouched orbits can still evolve.
 const changedTimbre=!!tr.morph;
 if(tr.morph){if(currentMorph(tr,audio.currentTime)>=.5)tr.instrument=tr.morph.to;tr.morph=null;}
 if(journey?.track===lane)journey=null;
 tr.direction=1;tr.phase=0;tr.pendingDirection=null;
 liveMix[lane].forEach(node=>{node.gain.cancelScheduledValues(audio!.currentTime);node.gain.setTargetAtTime(0,audio!.currentTime,.006);});
 sustained.forEach((entry,key)=>{if(entry.track===lane&&!key.startsWith('tap:')){entry.voice.release(audio!.currentTime);sustained.delete(key);}});
 rhythmEditing=true;
 recordRhythmHit(tapPattern,position,lane,note);
 playTapped(lane,audio.currentTime+.004,Math.max(0,Math.round(position)));
 if(changedTimbre)sync();else syncRhythmUi();persistSettings();
}

function musicalStep(){return step/stepsPerBar()*16;}
function trackSteps(i:number){return tracks[i].slots;}
function trackAngle(i:number,time:number){
 const fraction=Math.max(0,Math.min(1,(time-visualTime)/visualDuration));
 const real=swingPosition(visualStep+fraction,stepsPerBar(),groove.beats,groove.swing)/stepsPerBar();
 return gridFractionAtTime(real,trackSteps(i),groove.beats,groove.swing)*Math.PI*2;
}
function applyGrid(index:number,choice:GridChoice,slots:GridSize){
 const tr=tracks[index],old=tr.slots;
 if([...padGestures.values()].some(g=>g.target===index||padLocation(g.startX,g.startY)?.index===index))cancelPadGestures();
 if(rhythmTrack(index)){choice='auto';slots=stepsPerBar();}
 tr.points=remapPoints(tr.points,old,slots);tr.phase=Math.round(tr.phase/old*slots)%slots;
 tr.grid=choice;tr.slots=slots;tr.pendingGrid=null;tr.pendingSlots=null;tr.hits.fill(-Infinity);tr.flash.fill(-100);
 sustained.forEach((entry,key)=>{if(entry.track===index){entry.voice.release(playing?nextTime:audio?.currentTime||0);sustained.delete(key);}});
 if(song)for(const memory of [song.chorus,song.verse,song.from])if(memory){const p=memory[index];p.points=remapPoints(p.points,p.slots??old,slots);p.slots=slots;}
}
function gridCandidates(){
 return tracks.map((tr,index)=>({tr,index})).filter(({tr,index})=>tr.enabled&&!tr.mute&&tr.volume>0&&!protectedRhythmTrack(index)&&tr.grid==='auto'&&tr.pendingGrid===null&&musicalStep()>=drawnUntil[index]&&![...padGestures.values()].some(g=>g.target===index||padLocation(g.startX,g.startY)?.index===index)&&!(currentStyle==='focus'&&index===0)&&canEvolveGrid(tr.instrument,pulseTrack(index))&&(!tr.morph||canEvolveGrid(tr.morph.to,false)));
}
function varyGrid(index:number,initial=false){
 const tr=tracks[index],old=tr.slots;
 // Compare audible melodic orbits, not the four deliberately fixed drum/bass grids.
 const others=tracks.filter((other,i)=>i!==index&&other.enabled&&!other.mute&&other.volume>0&&canEvolveGrid(other.instrument,pulseTrack(i))).map(other=>other.slots);
 applyGrid(index,'auto',variedGrid(old,others,Math.random,initial));
 if(!initial){
  const allowed=grooveMutationGrid(groove,tr.instrument).map(s=>Math.round(s/stepsPerBar()*tr.slots)%tr.slots);
  tr.points=enrichGrid(tr.points,old,tr.slots,allowed);
  if(song?.form[song.index].kind==='chorus')song.chorus[index]=copyPhrases([tr])[0];
 }
 gridLastChange[index]=++gridChangeSerial;
}
function shuffleGrids(){
 gridCandidates().forEach(({index})=>varyGrid(index,true));pendingGridShuffle=false;
 gridEvolutionBar=evolving?gridEvolutionPlan(currentStyle,Math.floor(step/stepsPerBar()),[]).nextBar:Infinity;sync();
}
function evolveGrids(bar:number){
 const plan=gridEvolutionPlan(currentStyle,bar,gridCandidates().map(({index})=>({index,last:gridLastChange[index]})));
 plan.indices.forEach(index=>varyGrid(index));gridEvolutionBar=plan.nextBar;if(plan.indices.length)sync();
}
function applyPendingGrids(){let changed=false;tracks.forEach((tr,i)=>{if(tr.pendingGrid!==null){applyGrid(i,tr.pendingGrid,tr.pendingSlots!);changed=true;}});if(changed)sync();}


let transpose=0,noteEffect=1;
let evolving=false,evolutionStep=Infinity,pendingGridShuffle=false;
let gridEvolutionBar=Infinity,gridChangeSerial=0;
const gridLastChange=tracks.map(()=>0);
let arrangement:ArrangementPlan|null=null;
let development:DevelopmentPlan|null=null;
const drawnUntil=tracks.map(()=>0);
let journey:{track:number;cycle:number;length:number;pitch:number;tempo:number}|null=null;
let song:{
 form:Section[];index:number;startBar:number;previous:SongPart|null;
 chorus:Phrase[];verse:Phrase[]|null;from:Phrase[]|null;fadeAt:number;fadeDuration:number;
}|null=null;
function updateSongUi(bar:number){
 const panel=$('#song-structure');panel.hidden=!evolving||!song;if(!song)return;
 const part=song.form[song.index],text=songCopy[language];
 panel.dataset.part=part.kind;
 $('#song-label').textContent=text[part.kind];
 $('#song-bar').textContent=text.bar+' '+(bar-song.startBar+1)+' / '+part.bars;
 const list=$('#song-parts');list.replaceChildren(...song.form.map((section,index)=>{
  const chip=document.createElement('span');chip.textContent=text[section.kind];
  chip.className=index===song!.index?'song-part current':'song-part';
  if(index===song!.index)chip.setAttribute('aria-current','step');
  return chip;
 }));
}
function startSong(bar:number){
 song={form:songForm(Math.random,!!currentDance),index:0,startBar:bar,previous:null,chorus:copyPhrases(tracks),verse:null,from:null,fadeAt:0,fadeDuration:0};
 updateSongUi(bar);
}
function songBoundary(time:number,bar:number){
 if(!evolving||!song)return;
 const part=song.form[song.index];
 if(bar-song.startBar>=part.bars){
  if(part.kind==='verse')song.verse=copyPhrases(tracks);
  const previous=part.kind,from=copyPhrases(tracks);
  song.index++;song.startBar=bar;
  if(song.index>=song.form.length){
   // A new form develops from the current music rather than replacing the whole loop.
   startSong(bar);
  }
  const current=song!;
  current.previous=previous;current.from=from;current.fadeAt=time;current.fadeDuration=60/bpm*groove.beats*2;
  const next=current.form[current.index].kind;
  const remembered=next==='chorus'?current.chorus:next==='verse'?current.verse:null;
  if(remembered)tracks.forEach((tr,i)=>{
   tr.points=remapPoints(remembered[i].points,remembered[i].slots??tr.slots,tr.slots);tr.motif=[...remembered[i].motif];tr.pitch=remembered[i].pitch;
  });
  if(next==='bridge')tracks.forEach(tr=>{if(isMelodic(tr.instrument))varyMotif(tr.motif);});
  sync();
 }
 updateSongUi(bar);
}
function songMix(time:number){
 return song?.from?Math.max(0,Math.min(1,(time-song.fadeAt)/song.fadeDuration)):1;
}
function songExpression(){
 if(!evolving||!song)return {cutoff:1,gain:1};
 const part=song.form[song.index];
 return sectionExpression(part.kind,song.form[song.index+1]?.kind,step/stepsPerBar()-song.startBar,part.bars);
}
function songLevel(time:number,instrument:string){
 if(!evolving||!song)return 1;
 const part=song.form[song.index],elapsedBars=Math.max(0,step/stepsPerBar()-song.startBar);
 const to=sectionGain(part.kind,instrument,part.kind==='outro'?0:elapsedBars/part.bars),mix=songMix(time);
 return song.previous?sectionGain(song.previous,instrument,song.previous==='outro'?0:1)*(1-mix)+to*mix:to;
}
/** A deliberate outro remains a fade; it must not be canceled by mix balancing. */
function songFade(time:number){
 if(!evolving||!song)return 1;
 const part=song.form[song.index];
 if(part.kind==='outro')return Math.max(0,Math.min(1,1-(step/stepsPerBar()-song.startBar)/part.bars));
 return song.previous==='outro'?songMix(time):1;
}
function rememberDrawing(track:number){
 drawnUntil[track]=musicalStep()+32;
 if(!evolving||!song)return;
 const kind=song.form[song.index].kind;
 const update=(memory:Phrase[])=>{memory[track]=copyPhrases([tracks[track]])[0];};
 if(kind==='chorus')update(song.chorus);
 if(kind==='verse'&&song.verse)update(song.verse);
 // Direct input should be heard immediately, not blended back to an older phrase.
 if(song.from)update(song.from);
}
function nextMusicStep(current:number){
 if(currentStyle==='focus'||currentStyle==='coffeehouse'||currentStyle==='slowwaltz')return (Math.floor(current/stepsPerBar())+4+Math.floor(Math.random()*5))*stepsPerBar();
 if(currentStyle==='sport')return (Math.floor(current/stepsPerBar())+2+Math.floor(Math.random()*5))*stepsPerBar();
 return nextEvolutionStep(current,Math.random,stepsPerBar());
}
function setEvolution(on:boolean){
 if(on!==evolving){arrangement=null;development=null;drawnUntil.fill(0);pendingGridShuffle=on;}
 if(evolving&&!on)tracks.forEach(tr=>{if(tr.directionMode!=='random')tr.pendingDirection=tr.directionMode==='reverse'?-1:1;});
 if(on&&!evolving)startSong(playing?Math.ceil(step/stepsPerBar()):0);
 if(!on){
  currentMix=currentStyle==='slowwaltz'?balancedMix(audibleMixTracks(),tracks.map((_,i)=>slowWaltzMix(1,waltzPulse(i)))):tracks.map(()=>1);
  if(audio)liveMix.forEach((nodes,i)=>nodes.forEach(node=>{
   node.gain.cancelAndHoldAtTime(audio!.currentTime);
   node.gain.setTargetAtTime(currentMix[i],audio!.currentTime,.15);
  }));
  song=null;gridEvolutionBar=Infinity;$('#song-structure').hidden=true;}
 evolving=on;evolutionStep=on?nextMusicStep(playing?step:0):Infinity;
 $('#evolve').setAttribute('aria-pressed',String(on));labelAction('#evolve',on?t.evolveStop:t.evolve);
 $('#evolution-status').textContent='';
 if(on)updateSongUi(song!.startBar);
 sync();
}
let persistenceReady=false,saveTimer:ReturnType<typeof setTimeout>|undefined;
function snapshotSettings(includeDraft=false):SoundSettings{
 const backup=includeDraft?null:rhythmBackup;
 return {
   version:2,style:currentStyle,dance:currentDance,groove:grooveChoice,bpm,transpose,noteEffect,volume:Number($<HTMLInputElement>('#volume').value),
   background:backgroundChoice,center:centerChoice,orbit:orbitChoice,
   pad:{mode:padMode,beats:(backup??tapPattern).beats,hits:(backup??tapPattern).hits.map(lane=>[...lane]),notes:(backup??tapPattern).notes.map(lane=>[...lane])},
   tracks:tracks.map((live,i)=>{const tr=backup&&rhythmTouched.has(i)&&rhythmTrackBackup?{...live,...rhythmTrackBackup[i]}:live;return ({
    grid:tr.grid,slots:tr.slots,enabled:tr.enabled,mute:tr.mute,instrument:tr.instrument,points:[...tr.points],motif:[...tr.motif],volume:tr.volume,pitch:tr.pitch,
    phase:tr.phase,direction:evolving&&tr.directionMode!=='random'?(tr.directionMode==='reverse'?-1:1):(tr.pendingDirection??tr.direction),directionMode:tr.directionMode,randomDynamics:tr.randomDynamics,
    morph:tr.morph?{to:tr.morph.to,progress:currentMorph(tr,audio?.currentTime||0)}:null
   });})
  };
}
function saveSettings(){
 if(!persistenceReady||!storageAllowed())return;
 try{
  localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshotSettings()));
 }catch{
  const status=document.querySelector('#storage-status');
  if(status)status.textContent=document.querySelector<HTMLElement>('#clear-storage')?.dataset.error||'';
 }
}
function persistSettings(){
 if(!persistenceReady||!storageAllowed())return;
 if(saveTimer)clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>{saveTimer=undefined;saveSettings();},250);
}
document.addEventListener('storage-enabled',saveSettings);
document.addEventListener('preferences-cleared',()=>{
 if(saveTimer)clearTimeout(saveTimer);saveTimer=undefined;
 try{localStorage.removeItem(STORAGE_KEY);}catch{}
});
window.addEventListener('pagehide',()=>{finishVideoRecording();finishWavRecording();if(saveTimer)clearTimeout(saveTimer);saveTimer=undefined;saveSettings();});
const events:{time:number;step:number;duration:number;clock?:boolean;notes:{track:number;beat:number;velocity:number;note?:number|null}[]}[]=[];
function labelAction(selector:string,label:string){const button=$(selector);button.setAttribute('aria-label',label);button.setAttribute('title',label);}
const wake=screenWakeLock($('#wake-status'),'',t.wakeUnavailable);
window.addEventListener('pageshow',()=>wake(document.body.classList.contains('focus-view')));
let backgroundMode:'clouds'|'aurora'|'stars'|'waves'|'off'='clouds';
let orbitMode:'comet'|'dot'|'pulse'|'off'='comet';
let orbitAnimation=true;
let centerMode:'ring'|'filled'|'sine'|'bars'|'sun'|'off'='ring';
let centerChoice:SoundSettings['center']=centerMode;
let backgroundChoice:SoundSettings['background']=backgroundMode;
let orbitChoice:SoundSettings['orbit']=orbitMode;
let animationStep=Infinity;
function pickVariant<T extends string>(modes:readonly T[],current:T):T{
 const choices=modes.filter(mode=>mode!==current);
 return choices[Math.floor(Math.random()*choices.length)];
}
function selectCenterMode(choice:SoundSettings['center']){
 centerChoice=choice;
 centerMode=choice==='random'?pickVariant(currentStyle==='focus'?['ring','filled','sine']:currentStyle==='sport'?['ring','bars','sun']:['ring','filled','sine','bars','sun'],centerMode):choice;
 orbit.dataset.centerVariant=centerMode;persistSettings();
 document.querySelectorAll<HTMLButtonElement>('[data-center-mode]').forEach(tile=>tile.setAttribute('aria-pressed',String(tile.dataset.centerMode===choice)));
}
function selectBackgroundMode(choice:SoundSettings['background']){
 backgroundChoice=choice;persistSettings();
 backgroundMode=choice==='random'?pickVariant(['clouds','aurora','stars','waves'] as const,backgroundMode):choice;
 document.querySelectorAll<HTMLButtonElement>('[data-background-mode]').forEach(tile=>tile.setAttribute('aria-pressed',String(tile.dataset.backgroundMode===choice)));
 atmosphere.hidden=backgroundMode==='off';atmosphere.dataset.mode=backgroundMode;
 if(backgroundMode==='off')ac.clearRect(0,0,atmosphere.width,atmosphere.height);
}
function selectOrbitMode(choice:SoundSettings['orbit']){
 orbitChoice=choice;persistSettings();
 orbitMode=choice==='random'?pickVariant(['comet','dot','pulse'] as const,orbitMode):choice;
 orbitAnimation=orbitMode!=='off';orbit.dataset.animated=String(orbitAnimation);orbit.dataset.mode=orbitMode;
 document.querySelectorAll<HTMLButtonElement>('[data-orbit-mode]').forEach(tile=>tile.setAttribute('aria-pressed',String(tile.dataset.orbitMode===choice)));
}
document.querySelectorAll<HTMLButtonElement>('[data-center-mode]').forEach(button=>button.addEventListener('click',()=>selectCenterMode(button.dataset.centerMode as typeof centerChoice)));
document.querySelectorAll<HTMLButtonElement>('[data-background-mode]').forEach(button=>button.addEventListener('click',()=>selectBackgroundMode(button.dataset.backgroundMode as typeof backgroundChoice)));
document.querySelectorAll<HTMLButtonElement>('[data-orbit-mode]').forEach(button=>button.addEventListener('click',()=>selectOrbitMode(button.dataset.orbitMode as typeof orbitChoice)));
function evolveAnimations(includeBackground=true){
 if(centerChoice==='random')selectCenterMode('random');
 if(includeBackground&&backgroundChoice==='random')selectBackgroundMode('random');
 if(orbitChoice==='random')selectOrbitMode('random');
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function activeTracks(){return tracks.map((tr,index)=>({tr,index})).filter(({tr})=>tr.enabled);}
function radius(rank:number,count:number){return 300-rank*(184/Math.max(1,count-1));}
function sync(){
 tracks.forEach((tr,i)=>{
  const row=$<HTMLElement>('[data-track="'+i+'"]');
  row.dataset.morph=tr.morph?String(tr.morph.progress):'';
  row.dataset.morphTarget=tr.morph?.to||'';row.dataset.motif=tr.motif.join(',');
  row.dataset.slots=String(tr.slots);row.dataset.grid=String(tr.grid);
  const grid=row.querySelector<HTMLSelectElement>('.track-grid')!;grid.value=String(tr.pendingGrid??tr.grid);grid.disabled=rhythmTrack(i);grid.dispatchEvent(new Event('options-sync'));
  const gridTrigger=row.querySelector<HTMLButtonElement>('[id="trigger-grid-'+i+'"]');if(gridTrigger)gridTrigger.disabled=grid.disabled;
  row.querySelector('.grid-status')!.textContent=rhythmTrack(i)?gridCopy[language].locked:tr.pendingGrid!==null?gridCopy[language].pending:'';
  row.dataset.enabled=String(tr.enabled);row.dataset.phase=String(tr.phase);row.dataset.direction=String(tr.direction);
  const direction=row.querySelector<HTMLSelectElement>('.track-direction')!;
  direction.value=rhythmTrack(i)||tappedTrack(i)?'forward':evolving?'random':tr.directionMode;direction.disabled=evolving||tappedTrack(i)||rhythmTrack(i)||tr.instrument==='kick';
  direction.dispatchEvent(new Event('options-sync'));
  const trigger=row.querySelector<HTMLButtonElement>('[id="trigger-direction-'+i+'"]');
  if(trigger)trigger.disabled=direction.disabled;
  const dynamics=row.querySelector<HTMLInputElement>('.random-dynamics')!;
  dynamics.checked=evolving||tr.randomDynamics;dynamics.disabled=evolving;
  row.querySelector<HTMLInputElement>('.track-enabled')!.checked=tr.enabled;
  row.querySelector<HTMLInputElement>('.mute')!.checked=tr.mute;
  row.querySelector<HTMLInputElement>('.track-volume')!.value=String(tr.volume);
  row.querySelector('.track-volume-value')!.textContent=Math.round(tr.volume*100)+' %';
  const select=row.querySelector<HTMLSelectElement>('.instrument-select')!;
  select.value=tr.instrument;select.dispatchEvent(new Event('options-sync'));
  const name=instrumentNames[language][instrumentIds.indexOf(tr.instrument)];
  row.querySelector('.instrument-name')!.textContent=name;
  row.querySelector('.steps')!.setAttribute('aria-label',name);
  row.querySelectorAll('[data-step]').forEach((b,s)=>b.setAttribute('aria-label',name+' · '+(s+1)));
  row.querySelector('.count')!.textContent=tr.points.slice(0,tr.slots).filter(Boolean).length+' / '+tr.slots;
  row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b,s)=>{b.hidden=s>=tr.slots;b.disabled=s>=tr.slots;b.setAttribute('aria-pressed',String(tr.points[s]));});
 });
 syncRhythmUi();persistSettings();
}
tracks.forEach((tr,i)=>{
 const row=$<HTMLElement>('[data-track="'+i+'"]');
 row.querySelector<HTMLInputElement>('.track-enabled')!.addEventListener('change',e=>{
  tr.enabled=(e.target as HTMLInputElement).checked;if(!tr.enabled){cancelTappedVoices(i);rhythmPlayer?.cancelLane(i as RhythmLane,-Infinity);}tr.flash.fill(-100);tr.hits.fill(-Infinity);sync();
 });
 row.querySelector<HTMLSelectElement>('.instrument-select')!.addEventListener('change',e=>{
  if(selectedPad===i){beginRhythmEdit();rhythmTouched.add(i);}
  cancelTappedVoices(i);rhythmPlayer?.cancelLane(i as RhythmLane,-Infinity);
  tr.instrument=(e.target as HTMLSelectElement).value as InstrumentId;
  tr.morph=null;if(journey?.track===i)journey=null;
  if(tr.instrument==='kick'){tr.directionMode='forward';tr.direction=1;tr.pendingDirection=null;}
  const lang=document.documentElement.lang as keyof typeof instrumentNames;
  const name=instrumentNames[lang][instrumentIds.indexOf(tr.instrument)];
  row.querySelector('.instrument-name')!.textContent=name;
  row.querySelector('.steps')!.setAttribute('aria-label',name);
  row.querySelectorAll('[data-step]').forEach((b,s)=>b.setAttribute('aria-label',name+' · '+(s+1)));
  sync();
 });
 row.querySelector<HTMLSelectElement>('.track-direction')!.addEventListener('change',e=>{
  tr.directionMode=tr.instrument==='kick'?'forward':(e.target as HTMLSelectElement).value;
  tr.pendingDirection=tr.directionMode==='random'?null:tr.directionMode==='reverse'?-1:1;
  if(!playing){if(tr.pendingDirection!==null)tr.direction=tr.pendingDirection;tr.pendingDirection=null;}
  sync();
 });
 row.querySelector<HTMLSelectElement>('.track-grid')!.addEventListener('change',e=>{
  if(rhythmTrack(i))return;const value=(e.target as HTMLSelectElement).value,choice:GridChoice=value==='auto'?'auto':Number(value) as GridSize,slots=choice==='auto'?stepsPerBar():choice;
  if(!(gridSizes as readonly number[]).includes(slots))return;
  if(playing){tr.pendingGrid=choice;tr.pendingSlots=slots;}else applyGrid(i,choice,slots);sync();
 });
 row.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b,s)=>b.addEventListener('click',()=>{if(s>=tr.slots)return;tr.points[s]=!tr.points[s];rememberDrawing(i);sync();}));
 row.querySelector<HTMLInputElement>('.mute')!.addEventListener('change',e=>{
  if(selectedPad===i){beginRhythmEdit();rhythmTouched.add(i);}
  tr.mute=(e.target as HTMLInputElement).checked;
  if(tr.mute){
   cancelTappedVoices(i);rhythmPlayer?.cancelLane(i as RhythmLane,-Infinity);
   sustained.forEach((entry,key)=>{if(entry.track===i&&audio){entry.voice.release(audio.currentTime);sustained.delete(key);}});
  }
  syncRhythmUi();persistSettings();
 });
 row.querySelector<HTMLInputElement>('.track-volume')!.addEventListener('input',e=>{
  tr.volume=Number((e.target as HTMLInputElement).value);if(tr.volume===0)cancelTappedVoices(i);syncRhythmUi();
  row.querySelector('.track-volume-value')!.textContent=Math.round(tr.volume*100)+' %';persistSettings();
 });
 row.querySelector<HTMLInputElement>('.random-dynamics')!.addEventListener('change',e=>{
  tr.randomDynamics=(e.target as HTMLInputElement).checked;
  if(!tr.randomDynamics){tr.lastVelocity=1;tr.hitVelocities.fill(1);}persistSettings();
 });
});
let expressionSeed=Math.random()*Math.PI*2;
function dialogueRole(index:number){
 const melodic=tracks.map((tr,i)=>({tr,i})).filter(({tr})=>tr.enabled&&!tr.mute&&tr.volume>0&&tr.points.some(Boolean)&&dialogueInstrument(tr.instrument));
 // No extra notes or tracks: existing patterns and user silences remain intact.
 if(melodic.length<2)return -1;
 const lead=development?melodic.findIndex(({i})=>i===development!.lead):0;
 if(lead>0)melodic.unshift(...melodic.splice(lead,1));
 return melodic.findIndex(({i})=>i===index);
}
function harmonyBar(){return evolving&&song?Math.max(0,Math.floor(step/stepsPerBar())-song.startBar):Math.floor(step/stepsPerBar());}
function currentMorph(tr:typeof tracks[number],time:number){
 const m=tr.morph;if(!m)return 0;
 const fraction=m.duration?Math.max(0,Math.min(1,(time-m.at)/m.duration)):1;
 return m.from+(m.progress-m.from)*fraction;
}
function voice(i:number,time:number,beat:number,velocity:number,phrase?:Phrase){
 const tr=tracks[i];
 const weights=tr.morph?morphWeights(currentMorph(tr,time)):[1,0];
 const first=weights[0]>.0001?voiceInstrument(i,time,beat,velocity*weights[0],tr.instrument,phrase):null;
 const second=tr.morph&&weights[1]>.0001?voiceInstrument(i,time,beat,velocity*weights[1],tr.morph.to,phrase):null;
 // During timbre morphs the louder voice supplies the displayed pitch.
 return weights[1]>weights[0]?second:first;
}
function voiceInstrument(i:number,time:number,beat:number,velocity:number,id:InstrumentId,phrase?:Phrase,tapped=false,tapHold=0,tapNote:number|null=null):number|null{
 const tr=tracks[i];const musicBeat=beat/tr.slots*stepsPerBar();if(!audio||!master||!tr.enabled||tr.mute||tr.volume===0)return null;
 const ctx=audio,profile=soundProfiles[currentStyle];
 const explicitNote=tapped&&tapNote!==null;
 const tango=explicitNote?null:tangoPulseRole(currentDance,i,id),crisp=currentDance==='viennese',dancePulse=explicitNote?null:danceRhythmRole(currentDance,i,id);
 const pulse=explicitNote?null:dancePulse||tango||(tr.slots===stepsPerBar()?waltzPulseRole(groove.beats,id,phrase?.points||tr.points):null);
 const harmonicStyle:StyleId=currentDance?['tango','pasodoble'].includes(currentDance)?'electronic':currentStyle==='jazz'||currentDance==='jive'?'pop':currentStyle:currentStyle;
 const vocal=(vocalInstruments as readonly string[]).includes(id);
 const cutoff=vocal?Math.max(3000,profile.cutoff):profile.cutoff;
 const expressive=evolving&&!tapped&&dialogueInstrument(id);
 const role=expressive?dialogueRole(i):-1;
 const bar=step/stepsPerBar();
 const motion=evolving?timbreMotion(bar,expressionSeed,i):{cutoff:1,attack:1};
 const expression=tapped?{gain:1,cutoff:1}:songExpression();
 // Answers follow the current (including drawn or crossfading) phrase, not a stale copy.
 const leader=role===1?tracks.find((tr,index)=>tr.enabled&&!tr.mute&&tr.volume>0&&dialogueInstrument(tr.instrument)&&dialogueRole(index)===0):undefined;
 const sourceMotif=phrase?.motif||tr.motif;
 const protectedDrawing=tapped||musicalStep()<drawnUntil[i];
 const kind=song?.form[song.index].kind||'verse';
 const ownMotif=evolving&&development&&!protectedDrawing
  ?accompanimentMotif(sourceMotif,development,i,musicalStep(),kind):sourceMotif;
 const motif=leader&&!protectedDrawing?answerMotif(ownMotif,leader.motif):ownMotif;

 // One shared low-pass per voice keeps harmonic layers coherent and softens metallic edges.
 const bus=ctx.createBiquadFilter();bus.type='lowpass';bus.Q.value=.55;
 bus.frequency.setValueAtTime(cutoff*motion.cutoff*expression.cutoff,time);
 bus.frequency.exponentialRampToValueAtTime(cutoff*(evolving?timbreMotion(bar+.25,expressionSeed,i).cutoff:1)*expression.cutoff,time+.15);
 if(id==='acidbass'){bus.frequency.cancelScheduledValues(time);bus.Q.setValueAtTime(5,time);bus.frequency.setValueAtTime(Math.min(cutoff,3600),time);bus.frequency.exponentialRampToValueAtTime(230,time+.22);}
 const pan=ctx.createStereoPanner(),hallSend=ctx.createGain(),echoSend=ctx.createGain();
 pan.pan.setValueAtTime(stereoPosition(id,i,bar,expressionSeed),time);
 pan.pan.linearRampToValueAtTime(stereoPosition(id,i,bar+1,expressionSeed),time+60/bpm*4);
 const fader=ctx.createGain();fader.gain.setValueAtTime(tapped?1:currentMix[i],time);
 const tapEntry={track:i,time,fader};if(tapped)tappedVoices.add(tapEntry);else liveMix[i].add(fader);
 const edit=ctx.createGain();edit.gain.setValueAtTime(editLevel(i),time);editFaders[i].add(edit);
 bus.connect(fader);fader.connect(edit);edit.connect(pan);pan.connect(tapped?tapBus!:orbitBus!);
 const cleanVoice=()=>{editFaders[i].delete(edit);edit.disconnect();tappedVoices.delete(tapEntry);liveMix[i].delete(fader);bus.disconnect();fader.disconnect();pan.disconnect();hallSend.disconnect();echoSend.disconnect();};
 const roomSpace=tapped?tapSpace:space;
 if(roomSpace){
  const room=spaceProfile(currentStyle),foundation=['kick','bass','synthbass','doublebass','acidbass'].includes(id);
  hallSend.gain.value=foundation?.008:pulse?.025:room.hall;
  echoSend.gain.value=foundation||pulse?0:room.echo;
  pan.connect(hallSend);hallSend.connect(roomSpace.hall);
  pan.connect(echoSend);echoSend.connect(roomSpace.delay);
  roomSpace.delay.delayTime.setTargetAtTime(60/bpm*.75,time,.15);
 }
 let sources=0;
 const ended=()=>{if(--sources===0)cleanVoice();};
 const semitones=harmonicStyle==='jazz'
  ?jazzSemitones(harmonyBar(),musicBeat,id,phrase?.pitch??tr.pitch,motif)
  :melodicSemitones(harmonicStyle,harmonyBar(),musicBeat,id,phrase?.pitch??tr.pitch,motif);
 const chord=chordFor(harmonicStyle,harmonyBar());
 const jazzRoot=jazzSemitones(harmonyBar(),0,'bass',0);
 const register=evolving&&!protectedDrawing&&dialogueInstrument(id)?registerArc(step/stepsPerBar()):0;
 const voiced=explicitNote?tapNoteSemitones(harmonicStyle,harmonyBar(),tapNote):registerNote(semitones,register,harmonicStyle==='jazz'?jazzRoot:chord.root,harmonicStyle==='jazz'?[0,2,4,7,9]:[0,chord.third,7]);
 const visualNote=isMelodic(id)?explicitNote?tapNote:tapNoteDegree(harmonicStyle,harmonyBar(),voiced):null;
 const note=261.626*2**((voiced+(isMelodic(id)?transpose:0))/12);
 function tone(freq:number,duration:number,level:number,type:OscillatorType='sine',end?:number,attack=.004,glide=.18,sustain?:number){
  const osc=ctx.createOscillator(),gain=ctx.createGain();sources++;
  // Retain an instrument's deliberately slow attack while warming sharp plucks.
  if(attack===.004)attack*=profile.attack*motion.attack;
  osc.type=type;osc.frequency.setValueAtTime(freq,time);
  if(end)osc.frequency.exponentialRampToValueAtTime(end,time+Math.min(duration,glide));
  const peak=Math.max(.0002,level*tr.volume*velocity);
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(peak,time+attack);
  if(sustain!==undefined){
   const release=id==='pad'?.45:.07;
   gain.gain.exponentialRampToValueAtTime(Math.max(.0001,peak*sustain),time+attack+(duration-attack-release)*.35);
   gain.gain.setValueAtTime(Math.max(.0001,peak*sustain),time+duration-release);
  }
  gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+duration+.02);
  osc.onended=()=>{osc.disconnect();gain.disconnect();ended();};
 }
 function noise(duration:number,level:number,frequency:number,type:BiquadFilterType='highpass',offset=0,attack=.001){
  sources++;
  if(!noiseBuffer||noiseBuffer.sampleRate!==ctx.sampleRate){
   noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
   const data=noiseBuffer.getChannelData(0);
   for(let n=0;n<data.length;n++)data[n]=Math.random()*2-1;
  }
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),at=time+offset;
  source.buffer=noiseBuffer;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.7;
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level*tr.volume*velocity),at+attack);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(filter);filter.connect(gain);gain.connect(bus);source.start(at,Math.random()*(1-duration-.02));source.stop(at+duration+.02);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();ended();};
 }
 if((sustainedInstruments as readonly string[]).includes(id)){
  const key=(tapped?'tap:':'')+i+':'+id,previous=sustained.get(key);
  const frequency=vocal?(explicitNote?261.626*2**(voiced/12)/2:vocalFundamental(261.626*2**(voiced/12)))*2**(transpose/12):id==='organ'||id==='cello'||id==='horn'?note/2:note;
  const character=vocalCharacter(currentStyle),vowel=evolving?vowelPosition(step/stepsPerBar(),expressionSeed):character.vowel;
  const clock=((beat-tr.phase)*tr.direction+tr.slots*2)%tr.slots;
  const bridge=tapped?tapHold:tr.slots===stepsPerBar()?phraseHold(phrase?.points||tr.points,beat,tr.direction,60/bpm/4,groove.swing,clock,tr.slots):gridPhraseHold(phrase?.points||tr.points,beat,clock,tr.direction,tr.slots,groove.beats,bpm,groove.swing);
  const articulation=performanceGate(currentStyle,id as SustainedInstrument,bridge,60/bpm,currentDance),hold=articulation.hold;
  const level=tr.volume*velocity*(id==='voice'?.25:id==='strings'||id==='cello'?.15:id==='saxophone'?.23:id==='organ'?.16:id==='pad'?.13:.18);
  if(articulation.legato&&previous?.voice.canContinue(time)){
   previous.voice.note(time,frequency,level,hold,vowel);
   cleanVoice();return visualNote;
  }
  if(articulation.legato)previous?.voice.release(time);
  const entry={track:i,time,id:id as SustainedInstrument,voice:null as unknown as ReturnType<typeof createSustainedVoice>};
  entry.voice=createSustainedVoice(ctx,bus,entry.id,frequency,time,level,hold,vowel,()=>{
   cleanVoice();
   if(sustained.get(key)===entry)sustained.delete(key);
  },articulation.voice);
  sustained.set(key,entry);return visualNote;
 }
 if(dancePulse||acousticInstruments.includes(id)){
  const acoustic=id as AcousticInstrument,frequency=(id==='bass'||id==='doublebass')?note/4:id==='guitar'?note/2:note;
  // Three touch layers: stronger hits excite more upper partials, not just more volume.
  const layer=Math.max(0,Math.min(2,Math.round(velocity*tr.volume*2)));
  const brightness=(profile.warm?.2:.4)+layer*.2;
  const pulseStep=((beat-tr.phase)*tr.direction+tr.slots*2)%tr.slots;
  const key=(pulse?[dancePulse?currentDance:tango?'tango':'waltz',id,pulse,chord.root,chord.third,transpose,bpm,ctx.sampleRate,brightness,crisp,tango||dancePulse?beat:!crisp?pulseStep:0]:[id,frequency.toFixed(4),ctx.sampleRate,brightness]).join(':');
  let buffer=acousticCache.get(key);
  if(!buffer){
   const samples=dancePulse&&isRhythmDance(currentDance)?danceRhythmWave(currentDance,id as PulseInstrument,dancePulse,chord.root,chord.third,transpose,bpm,beat,ctx.sampleRate,brightness):tango?tangoPulseWave(acoustic,tango,chord.root,chord.third,transpose,bpm,beat,ctx.sampleRate,brightness):pulse?waltzPulseWave(acoustic,pulse,chord.root,chord.third,transpose,bpm,ctx.sampleRate,brightness,crisp,pulseStep):acousticWave(acoustic,frequency,ctx.sampleRate,brightness);
   buffer=ctx.createBuffer(1,samples.length,ctx.sampleRate);buffer.getChannelData(0).set(samples);
   if(acousticCache.size>=40)acousticCache.delete(acousticCache.keys().next().value!);
   acousticCache.set(key,buffer);
  }
  const level=tr.volume*velocity*.28;
  const source=ctx.createBufferSource(),gain=ctx.createGain();sources++;
  source.buffer=buffer;gain.gain.setValueAtTime(level,time);
  source.connect(gain);gain.connect(bus);source.start(time);
  source.onended=()=>{source.disconnect();gain.disconnect();ended();};
  return visualNote;
 }
 const recipe=rhythmDrums(currentDance,i,id,bpm,voiceRecipe(id,profile.warm,profile.decay));
 for(const spec of recipe.tones){
  const frequency=spec.hz??note*(spec.ratio??1);
  // Do not fold ultrasonic bell/metal partials back into the audible range.
  if(frequency>=ctx.sampleRate*.45)continue;
  tone(frequency,spec.duration,spec.level,spec.type,spec.endHz,spec.attack??.004,spec.glide,spec.sustain);
 }
 for(const spec of recipe.noise)noise(spec.duration,spec.level,spec.frequency,spec.type,spec.offset,spec.attack);

 return visualNote;
}
function playTapped(lane:RhythmLane,time:number,clockStep:number){
 const tr=tracks[lane];if(!audio||!tr.enabled||tr.mute||tr.volume<=0)return;
 const beat=Math.floor((clockStep%stepsPerBar())/stepsPerBar()*tr.slots)%tr.slots;
 const noteSlot=((clockStep-(tapPattern.start??0))%(tapPattern.beats*8)+tapPattern.beats*8)%(tapPattern.beats*8);
 let tapNote=isMelodic(tr.instrument)?tapPattern.notes[lane][noteSlot]:null;
 if(percussion.has(tr.instrument))rhythmPlayer?.hit(lane,time,tr.instrument,tr.volume);
 else{
  const row=tapPattern.hits[lane],offset=((clockStep-(tapPattern.start??0))%row.length+row.length)%row.length;
  let gap=1;while(gap<row.length&&!row[(offset+gap)%row.length])gap++;
  tapNote=voiceInstrument(lane,time,beat,1,tr.instrument,undefined,true,Math.min(60/bpm*2,gap*60/bpm/4*.92),tapNote);
 }
 events.push({time,step:clockStep%stepsPerBar(),duration:60/bpm/4,clock:false,notes:[{track:lane,beat,velocity:1,note:tapNote}]});
 events.sort((a,b)=>a.time-b.time);
}

function applyDirections(randomize=false){
 tracks.forEach((tr,i)=>{
  if(protectedRhythmTrack(i))return;
  if(rhythmTrack(i)){tr.direction=1;tr.phase=0;tr.directionMode='forward';tr.pendingDirection=null;return;}
  if(tr.instrument==='kick'&&(!evolving||currentStyle==='sport')){tr.direction=1;tr.directionMode='forward';tr.pendingDirection=null;return;}
  if(tr.pendingDirection!==null){tr.direction=tr.pendingDirection;tr.pendingDirection=null;}
  if(randomize&&!evolving&&tr.enabled&&!tr.mute&&(evolving||tr.directionMode==='random')&&Math.random()<.4){tr.direction*=-1;tr.hits.fill(-Infinity);}
 });
 sync();
}
function evolveJourney(time:number){
 const eligible=tracks.map((tr,index)=>({tr,index})).filter(({tr,index})=>tr.enabled&&!tr.mute&&tr.volume>0&&!pulseTrack(index)&&!protectedRhythmTrack(index));
 if(!eligible.length)return;
 if(journey&&!eligible.some(({index})=>index===journey!.track))journey=null;
 if(!journey){
  // Resume a partially mixed colour after a pause instead of dropping it.
  const palette=currentDance?[...new Set(dances[currentDance].preset.parts.slice(4).map(p=>p.instrument))]:evolutionPalette(currentStyle);
  const alternativesFor=(instrument:InstrumentId)=>palette.filter(id=>{
   if(id===instrument)return false;
   const role=grooveRole(instrument),next=grooveRole(id);
   return ['kick','backbeat','hat','bass'].includes(role)?next===role:!['kick','backbeat','hat','bass'].includes(next);
  });
  // Do not spend an entire journey trying to replace a foundation with no compatible timbre.
  const compatible=eligible.filter(({tr})=>tr.morph||alternativesFor(tr.instrument).length);
  const tonal=compatible.length?compatible:eligible;
  const chosen=tonal.find(({tr})=>tr.morph)||tonal[Math.floor(Math.random()*tonal.length)];
  const alternatives=alternativesFor(chosen.tr.instrument);
  if(!chosen.tr.morph&&alternatives.length)chosen.tr.morph={to:alternatives[Math.floor(Math.random()*alternatives.length)],progress:0,from:0,at:time,duration:0};
  const length=journeyLength()+((currentStyle==='focus'||currentStyle==='coffeehouse'||currentStyle==='slowwaltz')?2:0);
  journey={track:chosen.index,cycle:chosen.tr.morph?Math.round(chosen.tr.morph.progress*length):0,length,
   pitch:Math.max(0,Math.min(currentPreset().scale.length-1,chosen.tr.pitch+(Math.random()<.5?-1:1)*((currentStyle==='focus'||currentStyle==='coffeehouse'||currentStyle==='slowwaltz')?1:2))),
   tempo:Math.max(currentStyle==='slowwaltz'?78:currentStyle==='focus'?68:40,Math.min(currentStyle==='slowwaltz'?96:currentStyle==='focus'?84:180,Math.round(bpm*(.94+Math.random()*.12))))};
 }
 const plan=journey,tr=tracks[plan.track];
 plan.cycle++;
 if(tr.morph){
  tr.morph.from=currentMorph(tr,time);tr.morph.at=time;tr.morph.duration=60/bpm*groove.beats;
  tr.morph.progress=Math.min(1,plan.cycle/plan.length);
 }
 tr.pitch=approach(tr.pitch,plan.pitch,1);
 if(plan.cycle===2&&isMelodic(tr.instrument))varyMotif(tr.motif);
 if(!currentDance)bpm=approach(bpm,plan.tempo,2);
 $<HTMLInputElement>('#tempo').value=String(bpm);$('#tempo-value').textContent=bpm+' BPM';
 // Only one point changes, on another orbit. Never rebuild the whole groove at once.
 const rhythm=eligible.filter(({index})=>index!==plan.track);
 let changedTrack=-1;
 if(rhythm.length){
  const selected=rhythm[Math.floor(Math.random()*rhythm.length)];
  evolvePattern([selected.tr],Math.random,grooveMutationGrid(groove,selected.tr.instrument).map(s=>Math.round(s/stepsPerBar()*selected.tr.slots)%selected.tr.slots),1,id=>grooveAnchors(groove,id).map(s=>Math.round(s/stepsPerBar()*selected.tr.slots)%selected.tr.slots),selected.tr.slots);changedTrack=selected.index;
 }
 // Phase OR direction: at most one more track, never the timbre/rhythm track.
 const motion=eligible.filter(({index})=>index!==plan.track&&index!==changedTrack&&!grooveAnchored(tracks[index].instrument));
 if(motion.length&&Math.random()<((currentStyle==='focus'||currentStyle==='slowwaltz')?.15:currentStyle==='sport'?.2:.4)){
  const selected=motion[Math.floor(Math.random()*motion.length)].tr;
  if(Math.random()<.5)selected.direction*=-1;
  else selected.phase=(selected.phase+(Math.random()<.5?-1:1)+selected.slots)%selected.slots;
  selected.hits.fill(-Infinity);
 }
 if(plan.cycle>=plan.length)journey=null;
 if(song&&song.form[song.index].kind==='chorus'){
  tracks.forEach((tr,i)=>{tr.motif=[...song!.chorus[i].motif];tr.points=remapPoints(song!.chorus[i].points,song!.chorus[i].slots??tr.slots,tr.slots);tr.pitch=song!.chorus[i].pitch;});
 }
 sync();
}
function schedule(){
 if(!audio||!playing)return;
 sustained.forEach((entry,key)=>{
  const tr=tracks[entry.track];
  if(!tr.enabled||tr.mute||tr.volume===0||(!key.startsWith('tap:')&&!tr.points.some(Boolean))||(tr.instrument!==entry.id&&tr.morph?.to!==entry.id)){
   entry.voice.release(audio!.currentTime);sustained.delete(key);
  }
 });
 if(nextTime<audio.currentTime-.1){
  // Cold instrument synthesis / a burst of nine keys can briefly block the UI.
  // Skip missed ticks instead of stopping playback or dumping stale notes in a burst.
  while(nextTime<audio.currentTime+.015){
   const s=step%stepsPerBar();nextTime+=60/bpm/4*(s%4<2?1+groove.swing:1-groove.swing);step++;
  }
 }
 while(nextTime<audio.currentTime+.1){
  if(pendingGroove&&step%stepsPerBar()===0)configureGroove(pendingGroove,true);
  let finishedMorph=false;
  tracks.forEach(tr=>{if(tr.morph&&tr.morph.progress===1&&currentMorph(tr,nextTime)>=1){
   tr.instrument=tr.morph.to;tr.morph=null;finishedMorph=true;
  }});
  if(finishedMorph)sync();
  if(step%stepsPerBar()===0){applyPendingGrids();applyDirections();songBoundary(nextTime,Math.floor(step/stepsPerBar()));}
  if(step%stepsPerBar()===0&&step>=animationStep){
   evolveAnimations();animationStep=nextEvolutionStep(step,Math.random,stepsPerBar());
  }
  if(pendingStyle&&step%stepsPerBar()===0)applyStyle(pendingStyle,pendingDance);
  if(pendingGridShuffle&&step%stepsPerBar()===0)shuffleGrids();
  if(evolving&&step%stepsPerBar()===0&&step/stepsPerBar()>=gridEvolutionBar)evolveGrids(step/stepsPerBar());
  if(evolving&&step%stepsPerBar()===0&&step>=evolutionStep){
   evolveJourney(nextTime);evolutionStep=nextMusicStep(step);
  }
  if(song?.from&&songMix(nextTime)>=1)song.from=null;
  if(evolving&&step%(stepsPerBar()*4)===0){
   // New restrained choices per phrase; never edit stored patterns or refrains.
   arrangement=arrangementPlan(tracks,musicalStep());
  }

  if(evolving&&(!development||musicalStep()-development.start>=128)){
   development=developmentPlan(tracks,musicalStep(),development);
  }
  const chorus=song?.form[song.index].kind==='chorus';
  const chorusRelief=chorus?songMix(nextTime):song?.previous==='chorus'?1-songMix(nextTime):0;
  const s=step%stepsPerBar();
  const performance=evolving?mixLevels(tracks,development,musicalStep(),chorusRelief,drawnUntil):tracks.map(()=>1);
  const performed=performance.map((gain,i)=>{
   // Focus keeps the melody present: rotating leads and section changes are gentle,
   // otherwise a quiet kick can become the foreground when the piano is ducked.
   if(currentStyle==='focus')return pulseTrack(i)?1:(.7+.3*gain)*(evolving?.8+.2*songLevel(nextTime,tracks[i].instrument):1);
   if(currentStyle==='slowwaltz'){
    // Sections shape the whole waltz, not just its melody against an unchanging loud pulse.
    return slowWaltzMix(pulseTrack(i)?1:gain,waltzPulse(i))*(evolving?songLevel(nextTime,tracks[i].instrument):1);
   }
   return evolving?(pulseTrack(i)?1:gain*songLevel(nextTime,tracks[i].instrument)):1;
  });
  currentMix=balancedMix(audibleMixTracks(),performed).map((gain,i)=>gain*songFade(nextTime)*(currentStyle==='slowwaltz'&&!pulseTrack(i)?slowWaltzSwell(s/4):1)*dancePulseClarity(currentDance,i,s)*rhythmClarity(currentDance,i,s));
  liveMix.forEach((nodes,index)=>nodes.forEach(node=>node.gain.setTargetAtTime(currentMix[index],nextTime,.09)));
  const duration=60/bpm/4*(s%4<2?1+groove.swing:1-groove.swing);
  rhythmClock.push({step,time:nextTime,duration});if(rhythmClock.length>128)rhythmClock.shift();
  for(const lane of rhythmHitsAt(tapPattern,step)){
   playTapped(lane,nextTime,step);
  }
  events.push({time:nextTime,step:s,duration,notes:[]});
  tracks.forEach((tr,i)=>{for(const due of gridEvents(tr.slots,stepsPerBar(),s,groove.beats,groove.swing)){
   const beat=((tr.direction*due.index+tr.phase)%tr.slots+tr.slots)%tr.slots,time=nextTime+due.offset*60/bpm/4;
   const playNote=()=>{
   if(tr.enabled&&!tr.mute&&tr.volume>0){
    if(tappedTrack(i))return;
    const old=evolving&&!pulseTrack(i)&&song?.from?song.from[i]:null;
    const protectedDrawing=musicalStep()<drawnUntil[i];
    if(!pulseTrack(i)&&!phraseActive(tr.instrument,musicalStep(),i,song?.form[song.index].kind==='chorus',evolving,protectedDrawing)){
     const key=i+':'+tr.instrument,held=sustained.get(key);
     if(held){held.voice.release(time);sustained.delete(key);}return;
    }
    const extra=evolving&&!pulseTrack(i)&&arrangement&&!protectedDrawing
     &&ornamentAt(arrangement,i,musicalStep(),beat,tr.direction,tr.points,tr.slots);
    if(evolving&&!pulseTrack(i)&&development&&!protectedDrawing&&!chorus&&i===development.variation
     &&isMelodic(tr.instrument)&&Math.floor((musicalStep()-development.start)/16)%2===1&&s===4)return;
    if(!tr.points[beat]&&!old?.points[beat]&&!extra)return;
    const dynamics=pulseTrack(i)?1:evolving?performanceVelocity(tr.scheduledVelocity):tr.randomDynamics?.45+Math.random()*.55:1;
    tr.scheduledVelocity=dynamics;
    const foundation=pulseTrack(i)||['kick','bass','synthbass','doublebass','acidbass'].includes(tr.instrument)||!!tr.morph&&['kick','bass','synthbass','doublebass','acidbass'].includes(tr.morph.to);
    const breath=evolving&&arrangement&&!protectedDrawing&&!foundation?breathGain(arrangement,i,musicalStep()):1;
    const velocity=grooveAccent(groove,tr.instrument,(pulseTrack(i)?due.index:beat)/tr.slots*stepsPerBar(),i)*dynamics*breath*songExpression().gain*(extra?.45:1),mix=evolving&&!pulseTrack(i)?songMix(time):1;
    if(velocity<=.0001)return;
    const joined=(sustainedInstruments as readonly string[]).includes(tr.instrument)
     &&(!tr.morph||(sustainedInstruments as readonly string[]).includes(tr.morph.to));
    let note:number|null=null;
    if(joined&&old?.points[beat]&&tr.points[beat]&&mix>0&&mix<1){
     // One connected line: don't schedule two competing gain envelopes on the same voice.
     note=voice(i,time,beat,velocity,mix<.5?old:undefined);
    }else{
     const previous=old&&old.points[beat]&&mix<1?voice(i,time,beat,velocity*(1-mix),old):null;
     const current=(tr.points[beat]||extra)&&mix>0?voice(i,time,beat,velocity*mix):null;
     note=current!==null&&(mix>=.5||previous===null)?current:previous;
    }
    if(velocity*currentMix[i]>.0001)events.push({time,step:s,duration,clock:false,notes:[{track:i,beat,velocity:velocity*currentMix[i],note}]});
   }
   };playNote();
  }});
  events.sort((a,b)=>a.time-b.time);nextTime+=duration;step++;
 }
}
function stop(){
 finishVideoRecording();finishWavRecording();
 rhythmGeneration++;rhythmPlayer?.stop();cancelTappedVoices();finishRhythm(tapPattern);
 cancelPadGestures();
 sustained.forEach(entry=>entry.voice.release(audio?.currentTime||0));sustained.clear();
 setEvolution(false);playing=false;if(timer)clearInterval(timer);timer=undefined;events.length=0;tracks.forEach(tr=>tr.hits.fill(-Infinity));
 if(master&&audio){master.gain.cancelScheduledValues(audio.currentTime);master.gain.setTargetAtTime(0,audio.currentTime,.01);}
 applyPendingGrids();applyDirections();if(pendingStyle)applyStyle(pendingStyle,pendingDance);if(pendingGroove){configureGroove(pendingGroove,true);sync();}
 syncRhythmUi();
 labelAction('#play',t.play);$('#play').setAttribute('aria-pressed','false');
}
let starting=false;
async function start(){
 if(starting)return;starting=true;
 try{
  audio??=new AudioContext();
  if(!master){master=audio.createGain();const compressor=audio.createDynamicsCompressor();master.connect(compressor);compressor.connect(audio.destination);recordingOutput=compressor;orbitBus=audio.createGain();orbitBus.connect(master);space=createAudioSpace(audio,orbitBus);tapBus=audio.createGain();tapBus.connect(master);tapSpace=createAudioSpace(audio,tapBus);}
  rhythmPlayer??=createRhythmPlayer(audio,tapBus!);
  await audio.resume();if(document.hidden)return;
  master.gain.setValueAtTime(Number($<HTMLInputElement>('#volume').value),audio.currentTime);
  rhythmClock.length=0;
  if(hasRhythm(tapPattern)){finishRhythm(tapPattern);tapPattern.start=0;resetRhythmSession(tapPattern);}
  if(rhythmBackup&&hasRhythm(rhythmBackup)){finishRhythm(rhythmBackup);rhythmBackup.start=0;resetRhythmSession(rhythmBackup);}
  playing=true;step=0;evolveAnimations();animationStep=nextEvolutionStep(0,Math.random,stepsPerBar());nextTime=audio.currentTime+.05;visualStep=0;visualTime=nextTime;visualDuration=60/bpm/4;
  labelAction('#play',t.pause);$('#play').setAttribute('aria-pressed','true');$('#audio-status').textContent='';
  syncRhythmUi();schedule();timer=setInterval(schedule,25);
 }catch{$('#audio-status').textContent=t.error;stop();}
 finally{starting=false;}
}
$('#evolve').addEventListener('click',async()=>{
 if(starting)return;
 if(evolving){setEvolution(false);return;}
 if(!playing){
  setEvolution(true);await start();if(!playing)setEvolution(false);
 }else{
  setEvolution(true);
  if(song){song.previous='chorus';song.from=copyPhrases(tracks);song.fadeAt=audio!.currentTime;song.fadeDuration=60/bpm*groove.beats*2;}
 }
});
$('#play').addEventListener('click',()=>playing?stop():void start());
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
$<HTMLInputElement>('#tempo').addEventListener('input',e=>{bpm=Number((e.target as HTMLInputElement).value);$('#tempo-value').textContent=bpm+' BPM';persistSettings();});
function syncGroove(){
 document.querySelectorAll<HTMLButtonElement>('[data-groove]').forEach(button=>{
  button.disabled=!!currentDance;
  button.setAttribute('aria-pressed',String(button.dataset.groove===grooveChoice));
  button.classList.toggle('is-pending',button.dataset.groove===pendingGroove);
 });
 $('#meter-value').textContent=groove.beats+'/4';
 $('#groove-pending').textContent=pendingGroove?grooveCopy[language].pending:'';
 $('#sound-app').dataset.steps=String(stepsPerBar());
 $('#orbit').dataset.steps=String(stepsPerBar());
}
function configureGroove(choice:GrooveChoice,rebuild:boolean){
 cancelPadGestures();
 const old=stepsPerBar(),bar=step/old;
 grooveChoice=currentDance?'auto':choice;pendingGroove=null;groove=resolveGroove(currentStyle,choice,currentDance);
 step=Math.round(bar*stepsPerBar());
 if(old!==stepsPerBar()){
  remeterRhythm(tapPattern,groove.beats,Math.floor(step/stepsPerBar())*stepsPerBar());
  if(rhythmBackup)remeterRhythm(rhythmBackup,groove.beats,Math.floor(step/stepsPerBar())*stepsPerBar());
  rhythmClock.length=0;syncRhythmUi();persistSettings();
 }
 if(Number.isFinite(evolutionStep))evolutionStep=Math.ceil(evolutionStep/old)*stepsPerBar();
 if(Number.isFinite(animationStep))animationStep=Math.ceil(animationStep/old)*stepsPerBar();
 tracks.forEach((tr,i)=>{
  const n=rhythmTrack(i)||tr.grid==='auto'?stepsPerBar():tr.grid;
  if(!rebuild&&n!==tr.slots){tr.points=remapPoints(tr.points,tr.slots,n);tr.phase=Math.round(tr.phase/tr.slots*n)%n;}
  tr.slots=n;tr.pendingGrid=null;tr.pendingSlots=null;
 });
 if(rebuild){
  sustained.forEach(entry=>entry.voice.release(playing?nextTime:audio?.currentTime||0));sustained.clear();
  tracks.forEach(tr=>{
   const pattern=groovePattern(groove,tr.instrument);
   tr.points=remapPoints(Array.from({length:16},(_,i)=>pattern.includes(i)),stepsPerBar(),tr.slots);
   tr.phase=grooveAnchored(tr.instrument)?0:tr.phase%tr.slots;
   if(grooveAnchored(tr.instrument)){tr.direction=1;tr.pendingDirection=null;}
   tr.hits.fill(-Infinity);tr.flash.fill(-100);
  });
  if(song){song.chorus=copyPhrases(tracks);song.verse=null;song.from=null;}
 }
 syncGroove();
}
document.querySelectorAll<HTMLButtonElement>('[data-groove]').forEach(button=>button.addEventListener('click',()=>{
 if(currentDance)return;
 const choice=button.dataset.groove as GrooveChoice;
 if(choice===grooveChoice){pendingGroove=null;syncGroove();return;}
 if(playing){pendingGroove=choice;syncGroove();}
 else{configureGroove(choice,true);sync();}
}));
function syncNoteEffect(){
 const text=Math.round(noteEffect*100)+' %';
 $<HTMLInputElement>('#note-effect').value=String(Math.round(noteEffect*100));
 $('#note-effect-value').textContent=text;$('#note-effect').setAttribute('aria-valuetext',text);
}
$<HTMLInputElement>('#note-effect').addEventListener('input',e=>{
 noteEffect=Number((e.target as HTMLInputElement).value)/100;syncNoteEffect();persistSettings();
});
function syncTranspose(){
 const text=(transpose>0?'+':'')+transpose+' '+pitchCopy[language].unit;
 $<HTMLInputElement>('#transpose').value=String(transpose);
 $('#transpose').setAttribute('aria-valuetext',text);$('#transpose-value').textContent=text;
}
$<HTMLInputElement>('#transpose').addEventListener('input',e=>{
 transpose=Number((e.target as HTMLInputElement).value);syncTranspose();persistSettings();
});
function syncVolume(){
 const slider=$<HTMLInputElement>('#volume');
 const value=Math.round(Number(slider.value)/Number(slider.max)*100)+' %';
 $('#volume-value').textContent=value;slider.setAttribute('aria-valuetext',value);
}
syncVolume();
$<HTMLInputElement>('#volume').addEventListener('input',e=>{syncVolume();if(master&&audio&&playing)master.gain.setTargetAtTime(Number((e.target as HTMLInputElement).value),audio.currentTime,.02);persistSettings();});
$('#clear').addEventListener('click',()=>{acceptRhythmEdit();resetTapRhythm();selectedPad=null;padSwitchBlocked=false;rhythmEditing=false;cancelPadGestures();tracks.forEach(tr=>tr.points.fill(false));sync();});
function applyStyle(id:StyleId,dance:DanceId|null=null){
 acceptRhythmEdit();
 if(hasRhythm(tapPattern))resetTapRhythm();
 selectedPad=null;padSwitchBlocked=false;rhythmEditing=false;
 // Tango is a visible music style backed by the existing protected marcato arrangement.
 if(id==='tango'||dance==='tango'){id='tango';dance='tango';}
 cancelPadGestures();
 sustained.forEach(entry=>entry.voice.release(audio?.currentTime||0));sustained.clear();
 currentStyle=id;currentDance=dance;pendingStyle=null;pendingDance=null;journey=null;arrangement=null;development=null;
 if(dance)grooveChoice='auto';
 const preset=currentPreset(),parts=partsForStyle(id,preset);
 tracks.forEach((tr,i)=>{
  const part=parts[i];tr.grid='auto';tr.slots=resolveGroove(id,grooveChoice,dance).steps;tr.pendingGrid=null;tr.pendingSlots=null;tr.enabled=true;tr.motif=makeMotif(preset.melody);tr.morph=null;tr.scheduledVelocity=1;tr.phase=0;tr.direction=1;tr.directionMode='forward';tr.pendingDirection=null;tr.instrument=part?.instrument||defaultInstruments[i];
  tr.points=Array.from({length:16},(_,s)=>!!part?.steps.includes(s));tr.pitch=part?.pitch||0;tr.volume=part?.volume??.55;tr.mute=false;tr.lastVelocity=1;tr.hitVelocities.fill(1);tr.flash.fill(-100);tr.hits.fill(-Infinity);
 });
 configureGroove(grooveChoice,grooveChoice!=='auto');
 bpm=preset.bpm;$<HTMLInputElement>('#tempo').value=String(bpm);$('#tempo-value').textContent=bpm+' BPM';
 syncStyleTiles();syncDanceTiles();
 if(evolving){pendingGridShuffle=true;evolutionStep=nextMusicStep(step);startSong(Math.floor(step/stepsPerBar()));}
 evolveAnimations(false);
 $('#style-status').textContent='';sync();
}
function syncStyleTiles(){
 document.querySelectorAll<HTMLButtonElement>('[data-style-preset]').forEach(button=>{
  button.setAttribute('aria-pressed',String((!currentDance||currentStyle==='tango')&&button.dataset.stylePreset===currentStyle));
  button.classList.toggle('is-pending',(!pendingDance||pendingStyle==='tango')&&button.dataset.stylePreset===pendingStyle);
 });
}
function syncDanceTiles(){
 document.querySelectorAll<HTMLButtonElement>('button[data-dance]').forEach(button=>{
  button.setAttribute('aria-pressed',String(button.dataset.dance===(currentDance||'')));
  button.classList.toggle('is-pending',!!pendingStyle&&button.dataset.dance===(pendingDance||''));
 });
 const index=currentDance?danceIds.indexOf(currentDance):-1;
 $('#dance-status').textContent=pendingStyle&&pendingDance?danceCopy[language].pending:index>=0?danceCopy[language].origins[index]:'';
 $('#sound-app').dataset.activeDance=currentDance||'';
}
document.querySelectorAll<HTMLButtonElement>('button[data-dance]').forEach(button=>button.addEventListener('click',()=>{
 const dance=(button.dataset.dance||null) as DanceId|null,id=dance?dances[dance].style:currentStyle==='tango'?'electronic':currentStyle;
 if(playing){pendingStyle=id;pendingDance=dance;syncStyleTiles();syncDanceTiles();}
 else applyStyle(id,dance);
}));
document.querySelectorAll<HTMLButtonElement>('[data-style-preset]').forEach(button=>button.addEventListener('click',()=>{
 const id=button.dataset.stylePreset as StyleId,dance=id==='tango'?'tango':null;
 if(id===currentStyle&&currentDance===dance){pendingStyle=null;pendingDance=null;$('#style-status').textContent='';syncStyleTiles();syncDanceTiles();return;}
 if(playing){pendingStyle=id;pendingDance=dance;$('#style-status').textContent=styleCopy[language].pending;syncStyleTiles();syncDanceTiles();}
 else applyStyle(id);
}));
$('#reset').addEventListener('click',()=>{const id=pendingStyle||currentStyle,dance=pendingStyle?pendingDance:currentDance;if(playing){pendingStyle=id;pendingDance=dance;$('#style-status').textContent=styleCopy[language].pending;}else applyStyle(id,dance);});
$('#random').addEventListener('click',()=>{
 const preset=currentPreset();journey=null;
 if(playing)pendingGridShuffle=true;else shuffleGrids();
 tracks.forEach((tr,i)=>{if(!tr.enabled)return;if(currentDance&&rhythmTrack(i)){tr.points=dancePoints(currentDance,i);tr.phase=0;tr.direction=1;return;}tr.morph=null;tr.points=remapPoints(randomGroovePattern(groove,tr.instrument,preset.density),stepsPerBar(),tr.slots);tr.pitch=Math.floor(Math.random()*preset.scale.length);tr.phase=grooveAnchored(tr.instrument)?0:Math.round(Math.floor(Math.random()*groove.beats)/groove.beats*tr.slots)%tr.slots;tr.hits.fill(-Infinity);});sync();
});
let ownsFullscreen=false;
function focus(on:boolean,requestFullscreen=true){
 wake(on);document.body.classList.toggle('focus-view',on);
 if(!on)document.body.classList.remove('focus-idle','focus-cursor-hidden');
 $('#focus').setAttribute('aria-pressed',String(on));labelAction('#focus',on?t.exit:t.focus);
 if(on&&requestFullscreen&&!document.fullscreenElement&&document.documentElement.requestFullscreen){
  // Request directly inside the user gesture; denial falls back to the page's focus view.
  void document.documentElement.requestFullscreen().then(()=>{
   ownsFullscreen=true;
   if(!document.body.classList.contains('focus-view')&&document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
  }).catch(()=>{});
 }else if(!on&&ownsFullscreen&&document.fullscreenElement){
  ownsFullscreen=false;void document.exitFullscreen().catch(()=>{});
 }
}
document.addEventListener('fullscreenchange',()=>{
 if(!document.fullscreenElement&&ownsFullscreen){ownsFullscreen=false;focus(false,false);}
});
$('#focus').addEventListener('click',()=>focus(!document.body.classList.contains('focus-view')));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&!(padMode==='rhythm'&&selectedPad!==null))focus(false);});
function position(e:PointerEvent,c:HTMLCanvasElement){const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*c.width,y:(e.clientY-r.top)/r.height*c.height};}
orbit.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 const p=position(e,orbit),x=p.x-350,y=p.y-350,r=Math.hypot(x,y);
 // Independent of orbit visibility and active tracks; leave note hit-testing untouched.
 if(r<=80){
  e.preventDefault();
  const variants=['ring','filled','sun','sine','bars'] as const;
  selectCenterMode(variants[(variants.indexOf(centerMode as typeof variants[number])+1)%variants.length]);
  return;
 }
 if(r>320)return; // Outside the orbit belongs to the background shortcut.
 e.preventDefault();
 const active=activeTracks();
 let hit:{index:number;step:number;distance:number}|null=null;
 if(orbitAnimation)active.forEach(({index},rank)=>{
  const ringRadius=radius(rank,active.length),slots=trackSteps(index);
  for(let step=0;step<slots;step++){
   const angle=step/slots*Math.PI*2-Math.PI/2;
   const distance=Math.hypot(x-Math.cos(angle)*ringRadius,y-Math.sin(angle)*ringRadius);
   if(distance<=Math.min(14,92/Math.max(1,active.length-1))&&(!hit||distance<hit.distance))hit={index,step,distance};
  }
 });
 if(hit){
  const {index,step}=hit;
  // Locked dance points still consume the tap, without unexpectedly switching animations.
  if(rhythmTrack(index))return;
  tracks[index].points[step]=!tracks[index].points[step];rememberDrawing(index);sync();return;
 }
 const variants=['comet','dot','pulse'] as const;
 selectOrbitMode(variants[(variants.findIndex(mode=>mode===orbitMode)+1)%variants.length]);
});
$('#sound-app').addEventListener('pointerdown',e=>{
 if(e.button!==0||e.defaultPrevented||document.querySelector('dialog[open]'))return;
 const target=e.target as HTMLElement;
 // Only the free canvas/background surfaces, never drawing, controls or status text.
 if(!target.matches('#sound-app,.sound-grid,.orbit-wrap,#orbit,#sound-atmosphere'))return;
 const point=position(e,orbit);
 if(Math.hypot(point.x-350,point.y-350)<=320)return;
 e.preventDefault();
 const variants=['clouds','aurora','stars','waves'] as const;
 selectBackgroundMode(variants[(variants.findIndex(mode=>mode===backgroundMode)+1)%variants.length]);
});
type Trail={x:number;y:number;time:number;start:boolean;color:string;pointer:number};
type PadRing={x:number;y:number;color:string;started:number;released:number|null;duration:number;strength?:number;lane?:RhythmLane;note?:number|null};
type PadGesture={id:number;x:number;y:number;startX:number;startY:number;clientX:number;clientY:number;started:number;mode:GestureMode;painted:Set<string>;last?:Trail;lastStamp:number;applied:number;target:number|null;originStep:number;ring:PadRing};
const padGestures=new Map<number,PadGesture>();
let trail:Trail[]=[],padRings:PadRing[]=[];
let keyboardPoint={x:drawing.width/2,y:drawing.height/2},padSyncPending=false;
function schedulePadSync(){if(padSyncPending)return;padSyncPending=true;requestAnimationFrame(()=>{padSyncPending=false;sync();});}
function padLocation(x:number,y:number){
 const active=activeTracks();if(!active.length)return null;
 const rank=Math.min(active.length-1,Math.max(0,Math.floor(y/drawing.height*active.length)));
 return {active,rank,index:active[rank].index,step:Math.min(trackSteps(active[rank].index)-1,Math.max(0,Math.floor(x/drawing.width*trackSteps(active[rank].index))))};
}
function gestureTarget(x:number,y:number){
 const location=padLocation(x,y);if(!location)return null;
 const {active,rank,index}=location;
 const melodic=active.filter(({tr,index:i})=>!rhythmTrack(i)&&(isMelodic(tr.instrument)||!!tr.morph&&isMelodic(tr.morph.to)));
 const target=melodic.find(entry=>entry.index===index)||melodic.sort((a,b)=>Math.abs(a.index-index)-Math.abs(b.index-index))[0];
 const melodicStep=target?Math.min(target.tr.slots-1,Math.floor(x/drawing.width*target.tr.slots)):0;
 if(target){
  target.tr.motif[Math.min(7,Math.floor(melodicStep/target.tr.slots*8))]=target.index===index?gestureDegree(y,drawing.height,active.length,rank):gestureDegree(y,drawing.height,1,0);
  target.tr.pitch=0;if(journey?.track===target.index)journey.pitch=0;rememberDrawing(target.index);
 }
 // A dance foundation never loses its pulse to drawing, taps or holds.
 const selected=rhythmTrack(index)?target?.index??null:index;
 return {index:selected,step:selected===null?0:Math.min(trackSteps(selected)-1,Math.max(0,Math.floor(x/drawing.width*trackSteps(selected)))),color:colors[index]};
}
function togglePaintedStep(g:PadGesture,index:number,s:number,now:number){
 const key=index+':'+s;if(g.painted.has(key))return;g.painted.add(key);
 if(rhythmTrack(index)||!tracks[index].enabled)return;
 const tr=tracks[index];tr.points[s]=!tr.points[s];tr.flash[s]=tr.points[s]?now:-100;tr.hits[s]=-Infinity;
 rememberDrawing(index);
}
function paint(g:PadGesture,x:number,y:number,now:number,first=false){
 const location=padLocation(x,y);if(!location)return;
 const speed=g.last?Math.hypot(x-g.last.x,y-g.last.y)/Math.max(1,now-g.last.time):0;
 const point={x,y,time:now,start:first,color:colors[location.index],pointer:g.id};
 if(first||now-g.lastStamp>35){
  const target=gestureTarget(x,y);
  if(target?.index!==null&&target?.index!==undefined){togglePaintedStep(g,target.index,target.step,now);if(speed>1.6)togglePaintedStep(g,target.index,(target.step+1)%trackSteps(target.index),now);}
  g.lastStamp=now;schedulePadSync();
 }
 trail.push(point);if(trail.length>1500)trail.shift();g.last=point;
}
function applyHold(g:PadGesture,now:number){
 if(g.target===null){
  const target=gestureTarget(g.startX,g.startY);if(!target||target.index===null)return;
  g.target=target.index;g.originStep=target.step;
 }
 const index=g.target,tr=tracks[index];if(!tr.enabled||rhythmTrack(index))return;
 const steps=holdSteps(g.originStep,now-g.started,bpm,tr.slots,groove.beats);
 if(steps.length<=g.applied)return;
 for(const s of steps.slice(g.applied)){
  tr.points[s]=true;tr.flash[s]=now;tr.hits[s]=-Infinity;g.painted.add(index+':'+s);
 }
 g.applied=steps.length;rememberDrawing(index);schedulePadSync();
}
function beginPadGesture(id:number,x:number,y:number,clientX:number,clientY:number,keyNote?:number){
 if(padGestures.has(id)||padGestures.size>=10)return;
 const location=padLocation(x,y);if(!location&&padMode==='draw')return;
 const lane=padMode==='rhythm'?focusedPadAt(x,y,drawing.width,drawing.height,selectedPad):rhythmLane(x,y,drawing.width,drawing.height);
 if(lane===null)return;
 if(padMode==='rhythm'&&selectedPad!==lane){selectRhythmPad(lane);return;}
 if(padMode==='rhythm'&&(!tracks[lane].enabled||tracks[lane].mute||tracks[lane].volume<=0))return;
 const noteBounds=padBounds(lane,drawing.width,drawing.height,selectedPad);
 const tapNote=padMode==='rhythm'&&isMelodic(tracks[lane].instrument)?keyNote??tapNoteAt(y,noteBounds.y,noteBounds.height):null;
 if(tapNote!==null)padNotes[lane]=tapNote;
 const now=performance.now(),ring:PadRing={x,y,note:tapNote,lane:padMode==='rhythm'?lane:undefined,color:colors[padMode==='rhythm'?rhythmColors[lane]:location!.index],started:now,released:null,duration:0};
 if(padRings.length>=32){const released=padRings.findIndex(r=>r.released!==null);if(released>=0)padRings.splice(released,1);}
 padRings.push(ring);
 padGestures.set(id,{id,x,y,startX:x,startY:y,clientX,clientY,started:now,mode:'pending',painted:new Set(),lastStamp:0,applied:0,target:null,originStep:padMode==='rhythm'?lane:location?.step??0,ring});
 if(padMode==='rhythm')void tapRhythm(lane,now,tapNote);
 keyboardPoint={x,y};syncPadState();
}
function movePadGesture(id:number,x:number,y:number,clientX:number,clientY:number){
 const g=padGestures.get(id);if(!g)return;
 if(padMode==='rhythm')return;
 const now=performance.now(),mode=gestureMode(g.mode,Math.hypot(clientX-g.clientX,clientY-g.clientY),now-g.started);
 if(mode==='drawing'){
  if(g.mode!=='drawing'){
   g.ring.duration=now-g.started;g.ring.released=now;
   // Do not undo points just created by holding when the finger starts moving.
   if(g.mode==='pending')paint(g,g.startX,g.startY,now,true);
  }
  paint(g,x,y,now,g.mode==='holding');
 }else if(mode==='holding')applyHold(g,now);
 g.mode=mode;g.x=x;g.y=y;syncPadState();
}
function finishPadGesture(id:number,cancel=false){
 const g=padGestures.get(id);if(!g)return;
 const now=performance.now();
 if(padMode==='draw'&&!cancel&&g.mode==='drawing')paint(g,g.x,g.y,now,true);
 if(padMode==='draw'&&!cancel&&g.mode!=='drawing'){
  if(now-g.started>=HOLD_DELAY)applyHold(g,now);
  else paint(g,g.startX,g.startY,now,true);
 }
 if(g.ring.released===null){g.ring.duration=now-g.started;g.ring.released=now;}
 padGestures.delete(id);
 if(id>=0&&drawing.hasPointerCapture(id))drawing.releasePointerCapture(id);
 syncPadState();
}
function cancelPadGestures(){heldRhythmKeys.clear();for(const id of [...padGestures.keys()])finishPadGesture(id,true);}
function syncPadState(){
 drawing.dataset.pointers=String(padGestures.size);
 drawing.dataset.input=[...padGestures.values()].some(g=>g.mode==='drawing')?'drawing':[...padGestures.values()].some(g=>g.mode==='holding')?'holding':padGestures.size?'pending':'idle';
}
document.querySelectorAll<HTMLButtonElement>('[data-pad-mode]').forEach(button=>button.addEventListener('click',()=>{
 rhythmGeneration++;cancelPadGestures();if(selectedPad!==null)cancelRhythmEdit();padMode=button.dataset.padMode as typeof padMode;selectedPad=null;padSwitchBlocked=false;rhythmEditing=false;syncRhythmUi();persistSettings();
}));
$('#rhythm-done').addEventListener('click',()=>{
 cancelPadGestures();rhythmGeneration++;acceptRhythmEdit();rhythmEditing=false;selectedPad=null;padSwitchBlocked=false;finishRhythm(tapPattern);
 // Accept even a short take now, without waiting for a further two-bar recording pass.
 tapPattern.laneStart.fill(null);syncRhythmUi();persistSettings();
});
$('#rhythm-cancel').addEventListener('click',cancelRhythmEdit);
$('#pad-mute').addEventListener('click',()=>{
 if(selectedPad===null)return;
 const input=$<HTMLInputElement>('[data-track="'+selectedPad+'"] .mute');
 input.checked=!tracks[selectedPad].mute;input.dispatchEvent(new Event('change',{bubbles:true}));
});
const instrumentDialog=$<HTMLDialogElement>('#instrument-dialog');
function showInstrumentGroup(group:InstrumentGroup,moveFocus=false){
 document.querySelectorAll<HTMLButtonElement>('[data-instrument-group]').forEach(tab=>{
  const active=tab.dataset.instrumentGroup===group;
  tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
  if(active&&moveFocus)tab.focus();
 });
 for(const name of Object.keys(instrumentGroups))$('#instrument-panel-'+name).hidden=name!==group;
}
$('#pad-instrument').addEventListener('click',()=>{
 if(selectedPad===null)return;cancelPadGestures();
 const tr=tracks[selectedPad];
 $('#instrument-picker-track').textContent=padNumbers[selectedPad]+' · '+instrumentNames[language][instrumentIds.indexOf(tr.instrument)];
 instrumentDialog.style.setProperty('--picker-color',tr.color);
 document.querySelectorAll<HTMLButtonElement>('[data-pick-instrument]').forEach(tile=>tile.setAttribute('aria-pressed',String(tile.dataset.pickInstrument===tr.instrument)));
 const group=(Object.keys(instrumentGroups) as InstrumentGroup[]).find(name=>(instrumentGroups[name] as readonly string[]).includes(tr.instrument))!;
 showInstrumentGroup(group);instrumentDialog.showModal();
 instrumentDialog.querySelector<HTMLElement>('[role=tab][aria-selected=true]')?.scrollIntoView({block:'nearest',inline:'nearest'});
 instrumentDialog.querySelector<HTMLButtonElement>('[aria-pressed=true]')?.focus();
});
$('#instrument-picker-close').addEventListener('click',()=>instrumentDialog.close());
instrumentDialog.addEventListener('click',event=>{
 if(event.target!==instrumentDialog)return;
 const r=instrumentDialog.getBoundingClientRect();
 if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)instrumentDialog.close();
});
document.querySelectorAll<HTMLButtonElement>('[data-instrument-group]').forEach(tab=>{
 tab.addEventListener('click',()=>showInstrumentGroup(tab.dataset.instrumentGroup as InstrumentGroup));
 tab.addEventListener('keydown',event=>{
  const groups=Object.keys(instrumentGroups) as InstrumentGroup[],index=groups.indexOf(tab.dataset.instrumentGroup as InstrumentGroup);
  const next=event.key==='Home'?0:event.key==='End'?groups.length-1:event.key==='ArrowRight'?(index+1)%groups.length:event.key==='ArrowLeft'?(index+groups.length-1)%groups.length:null;
  if(next===null)return;event.preventDefault();showInstrumentGroup(groups[next],true);
 });
});
document.querySelectorAll<HTMLButtonElement>('[data-pick-instrument]').forEach(tile=>tile.addEventListener('click',()=>{
 if(selectedPad===null){instrumentDialog.close();return;}
 const select=$<HTMLSelectElement>('[data-track="'+selectedPad+'"] .instrument-select');
 select.value=tile.dataset.pickInstrument!;select.dispatchEvent(new Event('change',{bubbles:true}));
 instrumentDialog.close();
}));

function beginReplacementTake(){
 if(selectedPad===null)return;
 cancelPadGestures();rhythmGeneration++;beginRhythmEdit();rhythmTouched.add(selectedPad);
 rhythmPlayer?.cancelLane(selectedPad,-Infinity);cancelTappedVoices(selectedPad);
 tapPattern.hits[selectedPad].fill(false);tapPattern.notes[selectedPad].fill(null);tapPattern.lastTap[selectedPad]=null;
 tapPattern.laneStart[selectedPad]=null;tapPattern.liveStep[selectedPad]=null;
 if(!hasRhythm(tapPattern)){tapPattern.start=null;tapPattern.state='armed';}
 rhythmEditing=true;syncRhythmUi();persistSettings();
}
function selectRhythmPad(lane:RhythmLane){
 const tr=tracks[lane];if(!tr.enabled)return false;
 if(selectedPad===lane)return true;
 if(selectedPad!==null&&rhythmTouched.size){padSwitchBlocked=true;syncRhythmUi();return false;}
 if(selectedPad!==null)cancelRhythmEdit();
 cancelPadGestures();rhythmGeneration++;selectedPad=lane;padSwitchBlocked=false;rhythmEditing=true;beginRhythmEdit();
 keyboardPoint=padPoint(lane);syncRhythmUi();return true;
}
$('#rhythm-record').addEventListener('click',beginReplacementTake);
$('#rhythm-clear').addEventListener('click',beginReplacementTake);
syncRhythmUi();
drawing.addEventListener('contextmenu',e=>e.preventDefault());
drawing.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;e.preventDefault();const p=position(e,drawing);
 beginPadGesture(e.pointerId,p.x,p.y,e.clientX,e.clientY);
 if(padGestures.has(e.pointerId))try{drawing.setPointerCapture(e.pointerId);}catch{/* End outside the pad is handled by the window fallback. */}
});
drawing.addEventListener('pointermove',e=>{
 if(!padGestures.has(e.pointerId))return;
 if(e.pointerType==='mouse'&&e.buttons===0){finishPadGesture(e.pointerId,true);return;}
 const p=position(e,drawing);movePadGesture(e.pointerId,p.x,p.y,e.clientX,e.clientY);
});
drawing.addEventListener('pointerup',e=>finishPadGesture(e.pointerId));
drawing.addEventListener('pointercancel',e=>finishPadGesture(e.pointerId,true));
drawing.addEventListener('lostpointercapture',e=>finishPadGesture(e.pointerId,true));
window.addEventListener('pointerup',e=>finishPadGesture(e.pointerId));
window.addEventListener('pointercancel',e=>finishPadGesture(e.pointerId,true));
window.addEventListener('blur',cancelPadGestures);
drawing.addEventListener('keydown',e=>{
 if(padMode==='rhythm')return;

 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
  e.preventDefault();if(padGestures.has(-1))return;
  const active=activeTracks(),location=padLocation(keyboardPoint.x,keyboardPoint.y);if(!location)return;
  const rank=Math.max(0,Math.min(active.length-1,location.rank+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)));
  const slots=trackSteps(active[rank].index),base=rank===location.rank?location.step:Math.min(slots-1,Math.floor(keyboardPoint.x/drawing.width*slots));
  const s=(base+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)+slots)%slots;
  keyboardPoint={x:(s+.5)/trackSteps(active[rank].index)*drawing.width,y:(rank+.5)/active.length*drawing.height};return;
 }
 if(e.key!==' '&&e.key!=='Enter')return;e.preventDefault();if(e.repeat)return;
 beginPadGesture(-1,keyboardPoint.x,keyboardPoint.y,0,0);if(e.key==='Enter')finishPadGesture(-1);
});
drawing.addEventListener('keyup',e=>{if(e.key===' '){e.preventDefault();finishPadGesture(-1);}});
drawing.addEventListener('blur',()=>{finishPadGesture(-1,true);for(const id of heldRhythmKeys.values())finishPadGesture(id,true);heldRhythmKeys.clear();});
window.addEventListener('keydown',e=>{
 if(padMode!=='rhythm'||e.ctrlKey||e.metaKey||e.altKey)return;
 const target=e.target as HTMLElement;
 if(target.closest('input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox],[role=combobox],[role=listbox],[role=option],[aria-haspopup=listbox]')||document.querySelector('dialog[open]'))return;
 if(selectedPad!==null&&(e.key==='Enter'||e.key==='Escape')){
  e.preventDefault();if(!e.repeat)$(e.key==='Enter'?'#rhythm-done':'#rhythm-cancel').click();return;
 }
 const keyNote=selectedPad!==null?tapNoteKey(e.code,e.key):null;
 let lane=keyNote!==null?selectedPad:padForKey(e.code,e.key);
 if(lane===null&&document.activeElement===drawing){
  if(e.key.startsWith('Arrow')){
   e.preventDefault();
   const current=focusedPadAt(keyboardPoint.x,keyboardPoint.y,drawing.width,drawing.height,selectedPad)??selectedPad??4;
   const col=Math.max(0,Math.min(2,current%3+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)));
   const row=Math.max(0,Math.min(2,Math.floor(current/3)+(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)));
   keyboardPoint=padPoint((row*3+col) as RhythmLane);return;
  }
  if(e.key===' ')lane=focusedPadAt(keyboardPoint.x,keyboardPoint.y,drawing.width,drawing.height,selectedPad)??selectedPad;
 }
 if(lane===null)return;e.preventDefault();
 const key=e.code||e.key;if(e.repeat||heldRhythmKeys.has(key))return;
 if(selectedPad!==lane){selectRhythmPad(lane);return;}
 const id=nextRhythmKeyId--,point=padPoint(lane),note=keyNote??padNotes[lane];
 const b=padBounds(lane,drawing.width,drawing.height,selectedPad);
 if(isMelodic(tracks[lane].instrument))point.y=tapNoteY(note,b.y,b.height);
 heldRhythmKeys.set(key,id);beginPadGesture(id,point.x,point.y,0,0,note);
});
window.addEventListener('keyup',e=>{
 const key=e.code||e.key,id=heldRhythmKeys.get(key);if(id===undefined)return;
 e.preventDefault();heldRhythmKeys.delete(key);finishPadGesture(id);
});
function renderPadGestures(now:number,dark:boolean){
 for(const g of padGestures.values())if(padMode==='draw'&&g.mode!=='drawing'&&now-g.started>=HOLD_DELAY){g.mode='holding';applyHold(g,now);}
 syncPadState();padRings=padRings.filter(r=>r.released===null||now-r.released<RING_FADE);
 drawing.dataset.rings=String(padRings.length);
 for(const ring of padRings){
  const elapsed=ring.released===null?now-ring.started:ring.duration,age=ring.released===null?null:now-ring.released;
  const {radius,alpha:baseAlpha}=ringAppearance(elapsed,age,reduced.matches),alpha=baseAlpha*(ring.strength??1),color=dark?ring.color:lightColors[colors.indexOf(ring.color)];
  dc.save();
  if(ring.lane!==undefined){
   const b=padBounds(ring.lane,drawing.width,drawing.height,selectedPad),point=padPoint(ring.lane);
   ring.x=point.x;ring.y=ring.note!==undefined&&ring.note!==null?tapNoteY(ring.note,b.y,b.height):point.y;
   dc.beginPath();dc.rect(b.x,b.y,b.width,b.height);dc.clip();
  }
  dc.globalAlpha=alpha;
  const glow=dc.createRadialGradient(ring.x,ring.y,0,ring.x,ring.y,radius*1.6);
  glow.addColorStop(0,color+'b3');glow.addColorStop(.45,color+'55');glow.addColorStop(1,color+'00');
  dc.fillStyle=glow;dc.beginPath();dc.arc(ring.x,ring.y,radius*1.6,0,Math.PI*2);dc.fill();
  dc.strokeStyle=color;dc.shadowColor=color;dc.shadowBlur=reduced.matches?0:dark?20:9;
  dc.lineWidth=2.5;dc.beginPath();dc.arc(ring.x,ring.y,radius,0,Math.PI*2);dc.stroke();
  if(!reduced.matches){dc.globalAlpha=alpha*.45;dc.lineWidth=1;dc.beginPath();dc.arc(ring.x,ring.y,radius*1.28,0,Math.PI*2);dc.stroke();}
  dc.globalAlpha=alpha*.9;dc.fillStyle=dark?'#f5ffff':color;dc.beginPath();dc.arc(ring.x,ring.y,3,0,Math.PI*2);dc.fill();dc.restore();
 }
 if(document.activeElement===drawing){dc.save();dc.strokeStyle=dark?'#f5ffff':'#304050';dc.lineWidth=1.5;dc.setLineDash([3,4]);dc.beginPath();dc.arc(keyboardPoint.x,keyboardPoint.y,9,0,Math.PI*2);dc.stroke();dc.restore();}
}
/** Low-resolution atmospheric lighting, driven by scheduled audible note hits. */
function renderAtmosphere(time:number,dark:boolean){
 const w=atmosphere.width,h=atmosphere.height;
 ac.clearRect(0,0,w,h);
 atmosphere.dataset.mode=backgroundMode;
 const active=activeTracks().filter(({tr})=>!tr.mute&&tr.volume>0);
 const masterLevel=Number($<HTMLInputElement>('#volume').value);
 const beats=time*bpm/60,still=reduced.matches||!playing;
 const centeredBands=backgroundMode==='aurora'||backgroundMode==='waves';
 let orbitX=w/2,orbitY=h/2,orbitHeight=h*.7;
 if(centeredBands){
  // Follow the actual on-screen orbit, including responsive layout and focus transitions.
  const target=orbit.getBoundingClientRect(),backdrop=atmosphere.getBoundingClientRect();
  if(backdrop.width&&backdrop.height){
   orbitX=(target.left+target.width/2-backdrop.left)/backdrop.width*w;
   orbitY=(target.top+target.height/2-backdrop.top)/backdrop.height*h;
   orbitHeight=target.height/backdrop.height*h;
  }
 }
 const profile={speed:.018,size:330,power:.55};
 for(const [rank,{tr,index}] of active.entries()){
  const phase=still?tr.pitch*.3:beats*profile.speed+tr.pitch*.3;
  const x=w*(.18+.64*(.5+.5*Math.sin(index*2.4+phase)));
  const y=centeredBands?orbitY+Math.cos(index*1.7+phase*.73)*28:h*(.2+.6*(.5+.5*Math.cos(index*1.7+phase*.73)));
  const age=time-Math.max(...tr.hits);
  const decay=1.5;
  const hit=playing&&age>=0&&age<2?Math.exp(-age*decay):0;
  const energy=tr.volume*tr.lastVelocity*Math.min(1,masterLevel/.3);
  const pulse=reduced.matches?0:hit*energy;
  const size=profile.size+pulse*95+(still?0:Math.sin(beats*profile.speed*3+index)*20);
  ac.globalAlpha=((dark?.13:.065)+pulse*(dark?.24:.12)*profile.power)*(centeredBands?.4:1);
  const glow=ac.createRadialGradient(x,y,0,x,y,size);
  glow.addColorStop(0,tr.color);glow.addColorStop(.4,tr.color+'99');glow.addColorStop(1,tr.color+'00');
  ac.fillStyle=glow;ac.fillRect(x-size,y-size,size*2,size*2);
  if(still)continue;
  ac.strokeStyle=tr.color;ac.fillStyle=tr.color;ac.lineWidth=2;
  if(backgroundMode==='aurora'){
   // Translucent curtains sway gently and lift with note energy.
   ac.globalAlpha=(dark?.028:.02)+pulse*.06;
   for(let ribbon=0;ribbon<3;ribbon++){
    ac.lineWidth=5+ribbon*3;ac.beginPath();
    for(let n=0;n<=40;n++){
     const px=n/40*w;
     const py=orbitY+(rank-(active.length-1)/2)*orbitHeight*.045+(ribbon-1)*orbitHeight*.02+Math.sin((px-orbitX)/w*6+phase+ribbon*.25)*orbitHeight*(.09+pulse*.12);
     if(n===0)ac.moveTo(px,py);else ac.lineTo(px,py);
    }
    ac.stroke();
   }
  }else if(backgroundMode==='stars'){
   // Stable seeds avoid random per-frame flicker; movement and twinkle follow tempo.
   for(let star=0;star<10;star++){
    const seed=index*17+star*7;
    const sx=((Math.sin(seed*12.3)*.5+.5)*w+(still?0:beats*(1+index*.2)))%w;
    const sy=(Math.cos(seed*5.7)*.5+.5)*h;
    const twinkle=.5+.5*Math.sin(seed+beats*.45);
    ac.globalAlpha=(dark?.16:.12)+twinkle*.12+pulse*.35;
    const radius=1.2+twinkle*.6+pulse*2;
    ac.beginPath();ac.arc(sx,sy,radius,0,Math.PI*2);ac.fill();
   }
  }else if(backgroundMode==='waves'){
   ac.globalAlpha=(dark?.035:.025)+pulse*.075;ac.lineWidth=1+pulse*1.5;
   for(let wave=0;wave<3;wave++){
    ac.beginPath();
    for(let n=0;n<=64;n++){
     const px=n/64*w;
     const py=orbitY+(rank-(active.length-1)/2)*orbitHeight*.035+(wave-1)*orbitHeight*.025+Math.sin((px-orbitX)/w*9-phase*3+index)*orbitHeight*(.065+pulse*.14);
     if(n===0)ac.moveTo(px,py);else ac.lineTo(px,py);
    }
    ac.stroke();
   }
  }else{
   // Light clouds have their own look, independent of the music preset.
   ac.globalAlpha=(dark?.035:.025)+pulse*.07;
   ac.lineWidth=10;ac.beginPath();
   ac.ellipse(x,y,size*.85,size*.5,phase*.1,0,Math.PI*2);ac.stroke();
  }
 }
 ac.globalAlpha=1;ac.lineWidth=1;
}
/** Coloured segments breathe together, with stronger local accents on note hits. */
function renderPulseRing(time:number,dark:boolean){
 const active=activeTracks().filter(({tr})=>!tr.mute&&tr.volume>0);
 if(!active.length)return;
 const motion=playing&&!reduced.matches,masterLevel=Math.min(1,Number($<HTMLInputElement>('#volume').value)/.3);
 const energies=active.map(({tr})=>{
  const age=time-Math.max(...tr.hits);
  return motion&&age>=0&&age<.8?Math.exp(-age*5)*tr.volume*tr.lastVelocity*masterLevel:0;
 });
 const power=Math.min(1,energies.reduce((a,b)=>a+b,0));
 const radius=23+power*18;
 active.forEach(({tr},index)=>{
  const energy=energies[index],angle=index/active.length*Math.PI*2-Math.PI/2;
  const span=Math.PI*2/active.length,gap=active.length===1?0:.06;
  oc.beginPath();oc.arc(350,350,radius+energy*9,angle+gap,angle+span-gap);
  oc.lineCap='round';oc.lineWidth=3+energy*6;oc.strokeStyle=tr.color;
  oc.globalAlpha=.3+energy*.7;oc.shadowColor=tr.color;
  oc.shadowBlur=reduced.matches?0:(dark?7:2)+energy*22;oc.stroke();
 });
 oc.shadowBlur=0;oc.globalAlpha=1;oc.lineWidth=1;oc.lineCap='butt';
}
/** Alternate centre views share the audible note envelope, never the raw wall clock. */
function renderCenterVariant(time:number,dark:boolean,mode:'filled'|'sine'|'bars'){
 const active=activeTracks().filter(({tr})=>!tr.mute&&tr.volume>0);
 if(!active.length)return;
 const motion=playing&&!reduced.matches;
 const masterLevel=Math.min(1,Number($<HTMLInputElement>('#volume').value)/.3);
 const values=active.map(({tr})=>{
  const age=time-Math.max(...tr.hits);
  const energy=motion&&age>=0&&age<.8?Math.exp(-age*5)*tr.volume*tr.lastVelocity*masterLevel:0;
  return {tr,energy};
 });
 const power=Math.min(1,values.reduce((sum,v)=>sum+v.energy,0));
 values.forEach(({tr,energy},i)=>{
  oc.strokeStyle=tr.color;oc.fillStyle=tr.color;
  oc.shadowColor=tr.color;oc.shadowBlur=reduced.matches?0:(dark?6:2)+energy*18;
  oc.globalAlpha=.35+energy*.65;
  if(mode==='filled'){
   const span=Math.PI*2/values.length,start=i*span-Math.PI/2,gap=values.length===1?0:.025;
   const outer=31+power*23+energy*9,inner=outer*.42;
   oc.beginPath();oc.arc(350,350,outer,start+gap,start+span-gap);
   oc.arc(350,350,inner,start+span-gap,start+gap,true);oc.closePath();oc.fill();
  }else if(mode==='sine'){
   const amplitude=3+energy*32;
   const phase=motion?time*bpm/60*Math.PI:0;
   oc.lineWidth=1.5+energy*2;oc.beginPath();
   for(let n=0;n<=96;n++){
    const x=-76+n*152/96;
    const envelope=Math.sin(n/96*Math.PI);
    const y=Math.sin(n/96*Math.PI*(3+tr.pitch*.35)-phase+i*.7)*amplitude*envelope;
    if(n===0)oc.moveTo(350+x,350+y);else oc.lineTo(350+x,350+y);
   }
   oc.stroke();
  }else{
   const width=Math.min(12,120/values.length-5),spacing=width+5;
   const x=350+(i-(values.length-1)/2)*spacing;
   const height=7+energy*85;
   oc.lineCap='round';oc.lineWidth=width;
   oc.beginPath();oc.moveTo(x,350-height/2);oc.lineTo(x,350+height/2);oc.stroke();
  }
 });
 oc.shadowBlur=0;oc.globalAlpha=1;oc.lineWidth=1;oc.lineCap='butt';
}
/** A small organic light surface follows the orbit heads and audible note energy. */
function renderCenter(time:number,dark:boolean){
 const active=activeTracks().filter(({tr})=>!tr.mute&&tr.volume>0);
 if(!active.length)return;
 const motion=playing&&!reduced.matches;
 const masterLevel=Math.min(1,Number($<HTMLInputElement>('#volume').value)/.3);
 const sources=active.map(({tr,index})=>{
  const age=time-Math.max(...tr.hits);
  const hit=motion&&age>=0&&age<.85?Math.exp(-age*5.5):0;
  const energy=tr.volume*tr.lastVelocity*masterLevel;
  const pitch=tr.pitch/Math.max(1,currentPreset().scale.length-1);
  return {color:tr.color,angle:tr.direction*(motion?trackAngle(index,time):0)+tr.phase/tr.slots*Math.PI*2-Math.PI/2,
   strength:hit*energy,height:hit*energy*(65+pitch*40),index};
 });
 const dominant=[...sources].sort((a,b)=>b.strength-a.strength);
 const first=dominant[0],second=dominant[1]||first;
 const power=Math.min(1,sources.reduce((sum,source)=>sum+source.strength,0));
 // A soft corona supplies light rather than another hard ring around the centre.
 const haloRadius=48+power*65;
 const corona=oc.createRadialGradient(350,350,8,350,350,haloRadius);
 corona.addColorStop(0,first.color+'bb');corona.addColorStop(.28,first.color+'66');
 corona.addColorStop(.62,second.color+'22');corona.addColorStop(1,first.color+'00');
 oc.globalAlpha=dark?.85:.58;oc.fillStyle=corona;
 oc.fillRect(350-haloRadius,350-haloRadius,haloRadius*2,haloRadius*2);oc.globalAlpha=1;
 const glow=oc.createRadialGradient(350,350,2,350,350,86);
 glow.addColorStop(0,dark?'#fff9eaff':'#fff9ddff');
 glow.addColorStop(.15,first.color+'ff');glow.addColorStop(.5,second.color+'dd');glow.addColorStop(1,first.color+'77');
 oc.beginPath();
 for(let n=0;n<=96;n++){
  const theta=n/96*Math.PI*2;
  let height=0;
  for(const source of sources){
   const difference=Math.atan2(Math.sin(theta-source.angle),Math.cos(theta-source.angle));
   height+=(1.5+source.height)*Math.exp(-difference*difference/ .28);
  }
  const breath=motion?Math.sin(time*1.2+theta*3)*.8:0;
  const radius=Math.min(86,15+height+breath);
  const x=350+Math.cos(theta)*radius,y=350+Math.sin(theta)*radius;
  if(n===0)oc.moveTo(x,y);else oc.lineTo(x,y);
 }
 oc.closePath();oc.fillStyle=glow;oc.shadowColor=first.color;
 oc.shadowBlur=reduced.matches?0:(dark?24:10)+power*30;oc.fill();
 oc.shadowBlur=0;oc.lineWidth=1.3;oc.strokeStyle=first.color+'cc';oc.stroke();
 // Small radiant core: it remains compact while the coloured surface erupts on notes.
 const coreRadius=8+power*7;
 const core=oc.createRadialGradient(350,350,0,350,350,coreRadius);
 core.addColorStop(0,'#fffdf3');core.addColorStop(.3,dark?'#fff5dc':'#fff7df');
 core.addColorStop(.7,first.color+'dd');core.addColorStop(1,first.color+'00');
 oc.fillStyle=core;oc.shadowColor=first.color;oc.shadowBlur=reduced.matches?0:12+power*18;
 oc.beginPath();oc.arc(350,350,coreRadius,0,Math.PI*2);oc.fill();oc.shadowBlur=0;
 // Restore drawing state before the drawing-pad pass.
 oc.globalAlpha=1;oc.lineWidth=1;
}
function frame(now:number){
 const time=audio?.currentTime||0;
 while(events.length&&events[0].time<=time){const ev=events.shift()!;if(ev.clock!==false){visualStep=ev.step;visualTime=ev.time;visualDuration=ev.duration;}ev.notes.forEach(({track,beat,velocity,note})=>{const tr=tracks[track];if(tr.enabled&&!tr.mute&&tr.volume>0){tr.flash[beat]=now;tr.hits[beat]=ev.time;tr.hitVelocities[beat]=velocity;tr.lastVelocity=velocity;
   if(note!==undefined&&note!==null){
    const zone=$<HTMLElement>('#rhythm-zones>[data-lane="'+track+'"]');
    zone.dataset.playedNote=String(note);zone.style.setProperty('--note-row',String(7-note));
   }
   // Share the audible onset clock with the orbit, for automatic and recorded notes alike.
   if(padMode==='rhythm'&&playing&&Number($<HTMLInputElement>('#volume').value)>0){
    padRings.push({...padPoint(track as RhythmLane),lane:track as RhythmLane,note,color:colors[track],started:now,released:now,duration:160,strength:Math.min(1,.35+tr.volume*velocity)});
    if(padRings.length>32)padRings.shift();
   }}});}
 const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
 tracks.forEach((tr,i)=>{tr.color=(dark?colors:lightColors)[i];});
 if(lastPadDark!==dark){
  lastPadDark=dark;document.querySelectorAll<HTMLElement>('#rhythm-zones>[data-lane]').forEach((zone,i)=>zone.style.setProperty('--lane',tracks[i].color));
 }
 if(backgroundMode!=='off')renderAtmosphere(time,dark);
 oc.clearRect(0,0,700,700);
 const visualMaster=Math.min(1,Number($<HTMLInputElement>('#volume').value)/.3);
 const active=activeTracks();
 if(orbitAnimation)active.forEach(({tr,index},rank)=>{
  const r=radius(rank,active.length);oc.beginPath();oc.arc(350,350,r,0,Math.PI*2);oc.strokeStyle=tr.color+(dark?'55':'99');oc.lineWidth=dark?1:1.4;oc.stroke();
  // Each orbit carries a continuous comet; audible notes briefly boost its glow.
  if(playing&&orbitAnimation&&!reduced.matches){
   const age=time-Math.max(...tr.hits);
   const level=Math.min(1,tr.volume*tr.lastVelocity*visualMaster);
   const pulse=!tr.mute&&tr.volume>0&&age>=0&&age<.65?Math.pow(1-age/.65,.8)*level:0;
   const head=tr.direction*trackAngle(index,time)+tr.phase/tr.slots*Math.PI*2-Math.PI/2,length=.85,segments=32;
   const muted=tr.mute||tr.volume===0;
   const brightness=(muted?.1:(dark?.18:.23)+(dark?.25:.3)*level)+pulse*.65;
   oc.lineCap='round';
   if(orbitMode==='comet')for(let n=segments;n>0;n--){
    const strength=Math.pow(1-n/(segments+1),1.5)*brightness;
    oc.beginPath();oc.arc(350,350,r,head-tr.direction*n*length/segments,head-tr.direction*(n-1)*length/segments,tr.direction<0);
    oc.strokeStyle=tr.color;oc.lineWidth=4+pulse*3;oc.globalAlpha=strength;
    oc.shadowColor=tr.color;oc.shadowBlur=(dark?9:3)+pulse*(dark?16:6);oc.stroke();
   }
   oc.shadowBlur=dark?8+pulse*12:3;oc.globalAlpha=Math.min(1,brightness+.15);
   oc.beginPath();oc.arc(350+Math.cos(head)*r,350+Math.sin(head)*r,3.2+pulse*2,0,Math.PI*2);
   oc.fillStyle=tr.color;oc.fill();
   if(orbitMode==='pulse'){
    oc.shadowBlur=0;oc.lineWidth=1.5+pulse;oc.globalAlpha=.25+pulse*.55;
    oc.beginPath();oc.arc(350+Math.cos(head)*r,350+Math.sin(head)*r,8+pulse*15,0,Math.PI*2);
    oc.strokeStyle=tr.color;oc.stroke();
   }
   oc.globalAlpha=1;oc.shadowBlur=0;oc.lineCap='butt';oc.lineWidth=1;
  }
  const displayed=tappedTrack(index)?rhythmBarPoints(tapPattern,index as RhythmLane,Math.floor(rhythmPosition()/stepsPerBar())*stepsPerBar(),tr.slots):tr.points;
  for(let s=0;s<tr.slots;s++){
   const a=s/tr.slots*Math.PI*2-Math.PI/2,x=350+Math.cos(a)*r,y=350+Math.sin(a)*r;
   const pulse=noteGlow((time-tr.hits[s])*1000,tr.volume*tr.hitVelocities[s]*visualMaster,playing&&orbitAnimation&&!tr.mute&&tr.volume>0&&visualMaster>0,reduced.matches,noteEffect),on=displayed[s];
   oc.globalAlpha=tr.mute?.28:1;oc.shadowColor=tr.color;oc.shadowBlur=on?(dark?15:6)+pulse*22:0;
   oc.beginPath();oc.arc(x,y,on?5+pulse*5:3,0,Math.PI*2);oc.fillStyle=on?tr.color:(dark?'#101c28':'#fcfdf8');oc.fill();oc.strokeStyle=tr.color;oc.stroke();oc.shadowBlur=0;
   if(pulse>0){
    // Broad coloured bloom plus a bright core makes quiet hits clearly readable.
    const haloRadius=12+pulse*22;
    const halo=oc.createRadialGradient(x,y,2,x,y,haloRadius);
    halo.addColorStop(0,tr.color+'dd');halo.addColorStop(.35,tr.color+'99');halo.addColorStop(1,tr.color+'00');
    oc.globalAlpha=pulse;oc.fillStyle=halo;oc.beginPath();oc.arc(x,y,haloRadius,0,Math.PI*2);oc.fill();
    oc.shadowColor=tr.color;oc.shadowBlur=(dark?38:20)*pulse;
    oc.globalAlpha=Math.min(1,pulse*1.8);oc.fillStyle=dark?'#f5ffff':'#ffffff';
    oc.beginPath();oc.arc(x,y,3+pulse*4,0,Math.PI*2);oc.fill();oc.shadowBlur=0;
    oc.beginPath();oc.arc(x,y,13+(1-pulse)*22,0,Math.PI*2);
    oc.strokeStyle=tr.color;oc.lineWidth=1.5+pulse*2.5;oc.globalAlpha=Math.min(1,pulse*1.3);oc.stroke();oc.lineWidth=1;
   }
   oc.globalAlpha=1;
  }
 });

 if(centerMode==='sun')renderCenter(time,dark);
 else if(centerMode==='ring')renderPulseRing(time,dark);
 else if(centerMode!=='off')renderCenterVariant(time,dark,centerMode);
 dc.clearRect(0,0,drawing.width,drawing.height);trail=trail.filter(p=>now-p.time<2200);
 const previousTrail=new Map<number,Trail>();
 for(const b of trail){const a=previousTrail.get(b.pointer);previousTrail.set(b.pointer,b);if(!a||b.start)continue;dc.globalAlpha=Math.max(0,1-(now-b.time)/2200);const color=dark?b.color:lightColors[colors.indexOf(b.color)];dc.strokeStyle=color;dc.shadowColor=color;dc.shadowBlur=reduced.matches?0:dark?16:7;dc.lineWidth=3;dc.lineCap='round';dc.beginPath();dc.moveTo(a.x,a.y);dc.lineTo(b.x,b.y);dc.stroke();}
 dc.globalAlpha=1;dc.shadowBlur=0;
 if(playing&&tapPattern.state==='recording'&&tapPattern.start!==null&&rhythmPosition()>=tapPattern.start+tapPattern.beats*8){
  finishRhythm(tapPattern);syncRhythmUi();persistSettings();
 }
 const progress=$<HTMLProgressElement>('#rhythm-progress');progress.max=tapPattern.beats*8;
 progress.value=tapPattern.state==='armed'?0:tapPattern.state==='loop'?progress.max:Math.max(0,rhythmPosition()-(tapPattern.start??0));
 renderPadGestures(now,dark);
 videoRecording?.frame(now);
 requestAnimationFrame(frame);
}
enhanceClockSelects($('.instruments-tile') as HTMLFormElement);
function applySettings(saved:SoundSettings){
  applyStyle(saved.style,saved.dance??null);configureGroove(saved.groove??'auto',false);bpm=saved.bpm;transpose=saved.transpose??0;syncTranspose();noteEffect=saved.noteEffect??1;syncNoteEffect();
  $<HTMLInputElement>('#tempo').value=String(bpm);$('#tempo-value').textContent=bpm+' BPM';
  $<HTMLInputElement>('#volume').value=String(saved.volume);syncVolume();
  saved.tracks.forEach((source,i)=>{
   const tr=tracks[i];
   tr.grid=rhythmTrack(i)?'auto':source.grid??'auto';tr.slots=rhythmTrack(i)?stepsPerBar():source.slots??(tr.grid==='auto'?stepsPerBar():tr.grid);
   tr.enabled=source.enabled;tr.mute=source.mute;tr.instrument=source.instrument;tr.points=source.points.map((point,s)=>s<tr.slots&&point);tr.motif=source.motif?[...source.motif]:makeMotif(presets[saved.style].melody);
   tr.volume=source.volume;tr.pitch=source.pitch;tr.phase=source.phase%tr.slots;tr.direction=source.direction;
   tr.directionMode=source.directionMode;tr.randomDynamics=source.randomDynamics;
   tr.morph=source.morph?{...source.morph,from:source.morph.progress,at:0,duration:0}:null;
  });
  padMode='draw';selectedPad=null;padSwitchBlocked=false;rhythmEditing=false;tapPattern=emptyRhythm(groove.beats);padRings=[];trail=[];
  if(saved.pad){
   padMode=saved.pad.mode;tapPattern=emptyRhythm(saved.pad.beats);
   tapPattern.hits=saved.pad.hits.map(lane=>[...lane]);tapPattern.notes=saved.pad.notes?.map(row=>[...row])??tapPattern.notes;finishRhythm(tapPattern);
   tapPattern.start=hasRhythm(tapPattern)?0:null;
   remeterRhythm(tapPattern,groove.beats,0);syncRhythmUi();
  }
  syncRhythmUi();
  selectCenterMode(saved.center);selectBackgroundMode(saved.background);selectOrbitMode(saved.orbit);

 syncGroove();syncDanceTiles();sync();
}
function restoreSettings(){
 if(!storageAllowed())return;
 try{
  const saved=decodeSettings(localStorage.getItem(STORAGE_KEY));if(saved)applySettings(saved);
 }catch{}
}
restoreSettings();syncGroove();syncDanceTiles();sync();persistenceReady=true;requestAnimationFrame(frame);


// File operations do not require persistent-storage consent and never contact a server.
const files=fileCopy[language]||fileCopy.en;
const filesDialog=$<HTMLDialogElement>('#files-dialog'),fileInput=$<HTMLInputElement>('#json-file');
let wavBusy=false,wavAbort:AbortController|null=null,wavUrl:string|null=null,wavTimer:ReturnType<typeof setInterval>|undefined;
let importBusy=false,videoBusy=false,videoUrl:string|null=null,videoTimer:ReturnType<typeof setInterval>|undefined;
let videoStarted=0;
const fileName=(extension:string)=>'jacktools-sound-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+extension;
function downloadBlob(blob:Blob,name:string){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
$('#files-open').addEventListener('click',()=>filesDialog.showModal());
$('#files-close').addEventListener('click',()=>filesDialog.close());
filesDialog.addEventListener('click',event=>{if(event.target===filesDialog){const r=filesDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)filesDialog.close();}});
$('#json-export').addEventListener('click',()=>{
 try{
  downloadBlob(new Blob([JSON.stringify(snapshotSettings(true),null,2)],{type:'application/json'}),fileName('json'));
  $('#file-status').textContent=files.exported;
 }catch{$('#file-status').textContent=files.error;}
});
$('#json-import').addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',async()=>{
 const file=fileInput.files?.[0];fileInput.value='';if(!file||importBusy||videoBusy||wavBusy)return;
 importBusy=true;syncFileButtons();
 try{
  if(file.size>1024*1024){$('#file-status').textContent=files.invalid;return;}
  const saved=decodeSettings(await file.text());
  if(!saved){$('#file-status').textContent=files.invalid;return;}
  stop();applySettings(saved);persistSettings();$('#file-status').textContent=files.imported;
 }catch{$('#file-status').textContent=files.error;}
 finally{importBusy=false;syncFileButtons();}
});
function syncFileButtons(){
 $<HTMLButtonElement>('#json-import').disabled=importBusy||videoBusy||wavBusy;
 const active=videoRecording?.state==='recording';
 $<HTMLButtonElement>('#video-record').disabled=importBusy||wavBusy||(videoBusy&&!active)||!mp4Type();
 labelAction('#video-record',active?files.stop:files.record);
 const wavActive=wavRecording?.state==='recording';
 $<HTMLButtonElement>('#wav-record').disabled=importBusy||videoBusy||(wavBusy&&!wavActive)||!wavSupported();
 labelAction('#wav-record',wavActive?files.stop:files.wavRecord);
 $('#files-open').dataset.recording=String(videoBusy||wavBusy);
}
function finishVideoRecording(){
 if(!videoRecording)return;
 $('#video-status').textContent=files.preparing;
 $<HTMLButtonElement>('#video-stop').disabled=true;
 videoRecording.stop();syncFileButtons();
}
function finishVideoUi(){
 videoRecording=null;videoBusy=false;
 if(videoTimer)clearInterval(videoTimer);videoTimer=undefined;
 $('#video-stop').hidden=true;$('#video-dismiss').hidden=false;
 $('#video-record').setAttribute('aria-pressed','false');syncFileButtons();
}
function clearVideoDownload(){
 if(videoUrl)URL.revokeObjectURL(videoUrl);videoUrl=null;
 $('#video-download').removeAttribute('href');$('#video-download').hidden=true;
}
$('#video-dismiss').addEventListener('click',()=>{clearVideoDownload();$('#video-session').hidden=true;});
$('#video-stop').addEventListener('click',finishVideoRecording);
$('#video-record').addEventListener('click',async()=>{
 if(videoRecording?.state==='recording'){finishVideoRecording();filesDialog.close();return;}
 if(videoBusy||wavBusy||importBusy||!mp4Type())return;
 videoBusy=true;syncFileButtons();clearVideoDownload();
 $('#video-status').textContent=files.preparing;$('#video-session').hidden=false;
 $('#video-dismiss').hidden=true;$('#video-stop').hidden=true;
 try{
  if(!playing)await start();
  if(!audio||!recordingOutput||!playing||document.hidden)throw Error('Audio unavailable');
  videoRecording=createMp4Recording({
   audio,output:recordingOutput,
   paint:ctx=>paintVideo(ctx,orbit,atmosphere,backgroundMode!=='off'),
   ready:(blob,limited)=>{
    finishVideoUi();videoUrl=URL.createObjectURL(blob);
    const link=$<HTMLAnchorElement>('#video-download');link.href=videoUrl;link.download=fileName('mp4');link.hidden=false;
    $('#video-status').textContent=limited?files.limit:files.ready;
    link.click();
   },
   error:()=>{finishVideoUi();$('#video-status').textContent=files.videoError;}
  });
  videoStarted=performance.now();$('#video-time').textContent='00:00';$('#video-time').hidden=false;
  videoTimer=setInterval(()=>{
   const seconds=Math.floor((performance.now()-videoStarted)/1000);
   $('#video-time').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  },500);
  $('#video-status').textContent=files.recording;$('#video-stop').hidden=false;
  $<HTMLButtonElement>('#video-stop').disabled=false;
  $('#video-record').setAttribute('aria-pressed','true');syncFileButtons();filesDialog.close();
 }catch{finishVideoUi();$('#video-time').hidden=true;$('#video-status').textContent=files.videoError;}
});
if(!mp4Type())$('#video-support').textContent=files.unsupported;
if(!wavSupported())$('#wav-support').textContent=files.wavUnsupported;
syncFileButtons();

window.addEventListener('beforeunload',event=>{if(videoBusy||wavBusy)event.preventDefault();});


function finishWavRecording(){
 if(!wavRecording){if(wavBusy)wavAbort?.abort();return;}
 $('#wav-status').textContent=files.wavPreparing;
 $<HTMLButtonElement>('#wav-stop').disabled=true;
 wavRecording.stop();syncFileButtons();
}
function finishWavUi(){
 wavRecording=null;wavBusy=false;wavAbort=null;
 if(wavTimer)clearInterval(wavTimer);wavTimer=undefined;
 $('#wav-stop').hidden=true;$('#wav-dismiss').hidden=false;
 $('#wav-record').setAttribute('aria-pressed','false');syncFileButtons();
}
function clearWavDownload(){
 if(wavUrl)URL.revokeObjectURL(wavUrl);wavUrl=null;
 $('#wav-download').removeAttribute('href');$('#wav-download').hidden=true;
}
$('#wav-dismiss').addEventListener('click',()=>{clearWavDownload();$('#wav-session').hidden=true;});
$('#wav-stop').addEventListener('click',finishWavRecording);
$('#wav-record').addEventListener('click',async()=>{
 if(wavRecording?.state==='recording'){finishWavRecording();filesDialog.close();return;}
 if(wavBusy||videoBusy||importBusy||!wavSupported())return;
 wavBusy=true;const controller=new AbortController();wavAbort=controller;
 syncFileButtons();clearWavDownload();$('#wav-support').textContent='';
 $('#wav-status').textContent=files.wavPreparing;$('#wav-session').hidden=false;
 $('#wav-dismiss').hidden=true;$('#wav-stop').hidden=true;$('#wav-time').hidden=true;
 try{
  if(!playing)await start();
  if(!audio||!recordingOutput||!playing||document.hidden||controller.signal.aborted)throw Error('Audio unavailable');
  wavRecording=await createWavRecording({
   audio,output:recordingOutput,signal:controller.signal,
   ready:(blob,limited)=>{
    finishWavUi();wavUrl=URL.createObjectURL(blob);
    const link=$<HTMLAnchorElement>('#wav-download');link.href=wavUrl;link.download=fileName('wav');link.hidden=false;
    $('#wav-status').textContent=limited?files.wavLimit:files.wavReady;link.click();
   },
   error:()=>{finishWavUi();$('#wav-status').textContent=files.wavError;$('#wav-support').textContent=files.wavError;}
  });
  const began=performance.now();$('#wav-time').textContent='00:00';$('#wav-time').hidden=false;
  wavTimer=setInterval(()=>{
   const seconds=Math.floor((performance.now()-began)/1000);
   $('#wav-time').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  },500);
  $('#wav-status').textContent=files.wavRecording;$('#wav-stop').hidden=false;
  $<HTMLButtonElement>('#wav-stop').disabled=false;
  $('#wav-record').setAttribute('aria-pressed','true');syncFileButtons();filesDialog.close();
 }catch{finishWavUi();$('#wav-time').hidden=true;const message=controller.signal.aborted?files.wavCancelled:files.wavError;$('#wav-status').textContent=message;$('#wav-support').textContent=message;}
});
