import {demoProject,newScene,newElement,type Project,type Element} from './model.ts';
import {newStoryboard,type Storyboard} from './storyboard.ts';
import {defaultBoardDesign} from './storyboard-design.ts';
import {defaultPart2D,parseModel2D,type Part2D,type Model2D} from './model2d.ts';
import {defaultObject2D,defaultStage2DResource,defaultStage2D,defaultActor2D,defaultAction2D,type Actor2D} from './stage2d.ts';
import {defaultMusic,presetInstrument,type Note} from './music.ts';
import {defaultSound2D} from './sound2d.ts';
import {defaultTextEffects} from './text-effects.ts';
export type FlightArtwork={name:string;data:string;width:number;height:number};
export type FlightAssets=Record<'forest'|'pumpkin'|'witch'|'child-skeleton'|'child-witch'|'child-vampire'|'bat-face'|'spider-body'|'spider-leg',FlightArtwork>;
const gold='#ffe3a0',violet='#ba91ff';
const filmDuration=14.8;
const part=(id:string,shape:Part2D['shape'],extra:Partial<Part2D>={}):Part2D=>({...defaultPart2D(id),shape,fill:null,...extra});
const group=(id:string,extra:Partial<Part2D>={})=>part(id,'group',extra);
const track=(part:string,property:'x'|'y'|'opacity'|'rotation'|'scaleX'|'scaleY',frames:[number,number][])=>({part,property,keys:frames.map(([at,value])=>({at,value,easing:'smooth' as const}))});
const glow=(id:string,x:number,y:number,width:number,height:number,color:string,opacity:number,extra:Partial<Part2D>={})=>part(id,'ellipse',{x,y,width,height,fill:'#000000',blend:'screen',opacity,gradient:{type:'radial',x0:.5,y0:.5,x1:1,y1:.5,stops:[{at:0,color},{at:1,color:'#000000'}]},...extra});
const path=(id:string,points:[string,number[]][],extra:Partial<Part2D>={})=>part(id,'path',{path:points.map(([op,values])=>({op:op as 'M'|'L'|'Q'|'C'|'Z',values})),...extra});
function model(width:number,height:number,parts:Part2D[],animations:Model2D['animations'],image?:FlightArtwork,stage=false){return parseModel2D({width,height,originX:stage?0:width/2,originY:stage?0:height/2,parts,animations,...(image?{images:{art:{name:image.name,data:image.data}}}:{})});}
// Shared deterministic combustion envelope: warm spill and carved openings breathe together.
// No flame geometry and no full-screen flash; irregular, smoothly eased local light only.
const fireFrames:[number,number][]=[[0,.24],[.18,.53],[.38,.31],[.67,.68],[.88,.39],[1.12,.59],[1.39,.28],[1.64,.72],[1.91,.43],[2.17,.63],[2.46,.32],[2.74,.56],[3,.24]];
function forest(image:FlightArtwork){
 const parts=[part('forest-art','sprite',{image:'art',width:540,height:960}),glow('moon-aura',148,42,245,245,'#ac91f4',.19),glow('pumpkin-reflection',83,743,374,139,'#ff921e',.42)];
 const tracks=[track('moon-aura','opacity',[[0,.12],[3,.28],[5,.16],[8,.12]]),track('pumpkin-reflection','opacity',Array.from({length:3},(_,i)=>fireFrames.filter(([t])=>t+i*3<=8).map(([t,v]):[number,number]=>[t+i*3,.18+v*.66])).flat().filter(([t],i,all)=>!i||t>all[i-1][0]))];
 // The moon disc ends near y=225. Every aurora primitive stays below y=285,
 // including conservative blur spread, at EVERY key and interpolated pose.
 // Traveling phase offsets deform a curtain silhouette without moving the moon/camera.
 const wave=(fn:(time:number)=>number):[number,number][]=>Array.from({length:17},(_,i)=>[i/2,fn(i/2)]);
 for(let i=0;i<4;i++){
  const id='aurora-ribbon-'+i,color=['#53d9ac','#66bfe7','#ad79ed','#67d9c2'][i],y=355+i*29;
  parts.push(path(id,[['M',[-70,5]],['C',[65,-28,128,79,268,18]],['C',[396,-32,479,65,610,2]],['L',[610,32]],['C',[478,96,398,1,270,51]],['C',[130,112,63,8,-70,38]],['Z',[]]],{y,blend:'screen',blur:6,opacity:.28,gradient:{type:'linear',x0:0,y0:0,x1:0,y1:1,stops:[{at:0,color:'#000000'},{at:.5,color},{at:1,color:'#000000'}]}}));
  tracks.push(track(id,'x',wave(t=>Math.sin(t*Math.PI/4+i*.8)*28)),track(id,'y',wave(t=>y+Math.sin(t*Math.PI/4+i*.9)*12)),track(id,'scaleY',wave(t=>.98+Math.sin(t*Math.PI/4+i*.7)*.25)),track(id,'opacity',wave(t=>.25+Math.sin(t*Math.PI/2-i*.8)*.1)));
 }
 for(let i=0;i<6;i++){
  const id='aurora-fold-'+i,x=40+i*85,y=321+(i%3)*19;parts.push(glow(id,x,y,40,170+i%2*35,i%2?'#9a7ce4':'#61dbb4',.14,{blur:4}));
  tracks.push(track(id,'x',wave(t=>x+Math.sin(t*Math.PI/4-i*.7)*20)),track(id,'scaleY',wave(t=>.86+Math.sin(t*Math.PI/4-i*.6)*.24)),track(id,'opacity',wave(t=>.13+Math.sin(t*Math.PI/2-i*.6)*.07)));
 }
 // Narrow, soft-edged pleats form a ripple that travels across the sky. Radial
 // paint supplies feathered edges without adding 24 post-processing filters.
 for(let i=0;i<24;i++){
  const id='aurora-pleat-'+i,x=-18+i*24+Math.sin(i*.72)*8,y=354+Math.sin(i*.43)*49;
  parts.push(glow(id,x,y,30+i%4*7,118+i%5*13,i%4===0?'#b58aeb':i%3===0?'#63bfe4':'#65e3bb',.22));
  tracks.push(track(id,'x',wave(t=>x+Math.sin(t*Math.PI/2-i*.35)*11)),track(id,'y',wave(t=>y+Math.sin(t*Math.PI/4-i*.43)*17)),track(id,'scaleY',wave(t=>.9+Math.sin(t*Math.PI/2-i*.43)*.32)),track(id,'opacity',wave(t=>.12+Math.sin(t*Math.PI/2-i*.43)*.07)));
 }
 for(let i=0;i<3;i++){
  const id='moon-ray-'+i;parts.push(part(id,'polygon',{points:[245+i*15,226,260+i*15,226,480-i*90,790,240-i*90,790],fill:violet,blend:'screen',blur:12,opacity:.025,rotation:-6+i*3}));tracks.push(track(id,'opacity',[[0,.018],[4,.055-i*.008],[8,.018]]),track(id,'rotation',[[0,-6+i*3],[4,-3+i*3],[8,-6+i*3]]));
 }
 for(let i=0;i<5;i++){
  const id='mist-'+i,x=-160+i*123,y=640+(i%3)*70;parts.push(glow(id,x,y,350,76,i%2?'#8787be':'#b1a3de',.12,{layer:'foreground'}));tracks.push(track(id,'x',[[0,x],[8,x+75]]),track(id,'opacity',[[0,.04],[2+i*.3,.15],[6,.1],[8,.04]]));
 }
 for(let i=0;i<26;i++){
  const id='mote-'+i,x=25+(i*97)%480,y=310+(i*61)%530;parts.push(glow(id,x,y,8+(i%3)*3,8+(i%3)*3,i%3?gold:violet,.4,{layer:i%3?'background':'foreground'}));tracks.push(track(id,'x',[[0,x],[4,x+Math.sin(i)*24],[8,x]]),track(id,'y',[[0,y],[4,y-25-i%7],[8,y]]),track(id,'opacity',[[0,.08],[1+i*.17,.6],[7.8,.08],[8,.08]]));
 }
 // Delicate quarter-web attached to the upper-right edge of the opening lettering.
 // It belongs only to the opening clip; idle/lower never show it in later scenes.
 parts.push(group('opening-web',{x:452,y:154,opacity:0}));
 const polar=(radius:number,angle:number)=>[Math.cos(angle)*radius,Math.sin(angle)*radius];
 for(let i=0;i<=5;i++)parts.push(path('web-ray-'+i,[['M',[0,0]],['L',polar(66,i*Math.PI/10)]],{parent:'opening-web',stroke:'#e6daf6',strokeWidth:.7,opacity:.8}));
 for(let ring=1;ring<=4;ring++){
  const radius=ring*16,points:[string,number[]][]=[['M',polar(radius,0)]];
  for(let i=1;i<=5;i++)points.push(['Q',[...polar(radius*.89,(i-.5)*Math.PI/10),...polar(radius,i*Math.PI/10)]]);
  parts.push(path('web-ring-'+ring,points,{parent:'opening-web',stroke:'#e6daf6',strokeWidth:.65,opacity:.85}));
 }
 const webFade=track('opening-web','opacity',[[0,0],[.15,0],[.45,1],[4.35,1],[4.6,0],[5,0]]);webFade.keys.forEach(k=>{Object.assign(k,{easing:'linear'});});
 return model(540,960,parts,{idle:{duration:8,loop:true,tracks},opening:{duration:8,loop:false,tracks:[...tracks,webFade]}},image,true);
}
function pumpkin(image:FlightArtwork){
 const parts=[glow('outer-firelight',-32,48,368,240,'#ff821a',.2),glow('underlight',-46,202,392,88,'#ff9a24',.42),part('art','sprite',{image:'art',width:300,height:250}),group('fire',{opacity:.35}),glow('left-eye',86,107,75,46,'#ffe89a',1,{parent:'fire'}),glow('right-eye',205,90,56,54,'#ffe89a',1,{parent:'fire'}),glow('mouth',88,159,171,43,'#ffc84f',1,{parent:'fire'})];
 return model(300,250,parts,{idle:{duration:3,loop:true,tracks:[track('fire','opacity',fireFrames),track('underlight','opacity',fireFrames.map(([t,v])=>[t,.22+v*.7])),track('outer-firelight','opacity',fireFrames.map(([t,v])=>[t,.08+v*.24]))]}},image);
}
function bat(image:FlightArtwork){
 const parts=[group('left-wing'),group('right-wing'),path('left-membrane',[['M',[0,0]],['Q',[-28,-39,-77,-24]],['Q',[-57,-9,-64,14]],['Q',[-43,-4,-38,23]],['Q',[-23,6,-10,24]],['Z',[]]],{parent:'left-wing',fill:'#261b39',stroke:'#a58aba',strokeWidth:1.3}),path('right-membrane',[['M',[0,0]],['Q',[28,-39,77,-24]],['Q',[57,-9,64,14]],['Q',[43,-4,38,23]],['Q',[23,6,10,24]],['Z',[]]],{parent:'right-wing',fill:'#261b39',stroke:'#a58aba',strokeWidth:1.3}),part('body','ellipse',{x:-10,y:-8,width:20,height:37,fill:'#100f22'}),part('head','ellipse',{x:-14,y:-20,width:28,height:24,fill:'#242039'}),part('ears','polygon',{points:[-13,-16,-12,-34,-2,-23,3,-23,13,-34,14,-16],fill:'#242039'}),part('eye-left','ellipse',{x:-8,y:-12,width:4,height:4,fill:gold}),part('eye-right','ellipse',{x:5,y:-12,width:4,height:4,fill:gold})];
 // Local origin is the body, not the resource thumbnail's corner.
 for(const p of parts)if(!p.parent){p.x+=90;p.y+=45;p.parent='flight';}parts.unshift(group('flight',{x:90,y:45,pivotX:90,pivotY:45}));
 const tracks=[track('left-wing','scaleY',[[0,1],[.12,.14],[.25,1]]),track('right-wing','scaleY',[[0,1],[.12,.14],[.25,1]]),track('left-wing','rotation',[[0,-8],[.12,22],[.25,-8]]),track('right-wing','rotation',[[0,8],[.12,-22],[.25,8]])];
 // Textured facial detail appears near the lens; native wings still flap independently.
 parts.push(group('close-face',{parent:'flight',x:90,y:30,opacity:0}),part('close-face-art','sprite',{parent:'close-face',image:'art',x:-30,y:-36,width:60,height:60*image.height/image.width}));
 for(const id of ['left-membrane','right-membrane']){const wing=parts.find(p=>p.id===id)!;wing.strokeWidth=.6;wing.stroke='#655477';wing.gradient={type:'linear',x0:0,y0:0,x1:1,y1:1,stops:[{at:0,color:'#4a3357'},{at:1,color:'#130c1d'}]};}
 // Finger struts and small membrane veins retain detail when wings fill the frame.
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const parent=side<0?'left-wing':'right-wing',x=[64,38,10][i],y=[14,23,24][i];parts.push(path('wing-finger-'+side+'-'+i,[['M',[0,0]],['Q',[side*x*.58,-13+i*3,side*x,y]]],{parent,stroke:'#82647e',strokeWidth:.7,opacity:.7}));
  for(let j=0;j<2;j++)parts.push(path('wing-vein-'+side+'-'+i+'-'+j,[['M',[side*x*.65,2+i*4]],['Q',[side*(x*.77+4),-3+j*6,side*(x*.9+5),5+j*8]]],{parent,stroke:'#92758b',strokeWidth:.28,opacity:.34}));
 }
 const growth:[number,number][]=[[0,1],[1.8,1],[2.5,1.9],[3.1,4],[3.6,7],[4.05,10],[5,10]];
 const approach={duration:5,loop:false,tracks:[track('flight','scaleX',growth),track('flight','scaleY',growth),track('flight','rotation',[[0,0],[2,0],[3.2,-5],[4.05,0],[5,-12]]),track('close-face','opacity',[[0,0],[2.15,0],[2.9,1],[5,1]]),track('close-face','scaleX',[[0,1],[3,1],[4.05,1.22],[5,1.22]]),track('close-face','scaleY',[[0,1],[3,1],[4.05,1.22],[5,1.22]]),track('body','opacity',[[0,1],[2.15,1],[2.9,0],[5,0]]),track('head','opacity',[[0,1],[2.15,1],[2.9,0],[5,0]]),track('ears','opacity',[[0,1],[2.15,1],[2.9,0],[5,0]]),track('eye-left','opacity',[[0,1],[2.15,1],[2.9,0],[5,0]]),track('eye-right','opacity',[[0,1],[2.15,1],[2.9,0],[5,0]])]};
 // Perching overrides the flapping only in the first scene. The close-up bat remains unchanged.
 const perchTracks:Model2D['animations'][string]['tracks']=[];
 for(const side of ['left','right'] as const){
  const sign=side==='left'?-1:1;
  for(const property of ['scaleY','rotation'] as const){
   const frames:[number,number][]=Array.from({length:15},(_,i)=>[i*.125,property==='scaleY'?(i%2?.14:1):sign*(i%2?-22:8)]);
   frames.push([2.1,property==='scaleY'?.75:sign*18],[4.35,property==='scaleY'?.75:sign*18],[4.75,property==='scaleY'?1:sign*8],[4.875,property==='scaleY'?.14:-sign*22],[5,property==='scaleY'?1:sign*8]);perchTracks.push(track(side+'-wing',property,frames));
  }
  perchTracks.push(track(side+'-wing','scaleX',[[0,1],[1.75,1],[2.1,.18],[4.35,.18],[4.75,1],[5,1]]));
 }
 return model(180,90,parts,{idle:{duration:.25,loop:true,tracks},approach,perch:{duration:5,loop:false,tracks:perchTracks}},image);
}
/** Textured layers, eight independently moving legs; origin is the silk attachment. */
function spider(body:FlightArtwork,leg:FlightArtwork){
 const parts=[group('spider',{x:110,y:55})],tracks:Model2D['animations'][string]['tracks']=[];
 for(const side of [-1,1])for(let i=0;i<4;i++){
  const id='leg-'+(side<0?'l':'r')+i,angle=[-65,-35,-5,25][i];
  parts.push(group(id,{parent:'spider',x:side*18,y:-8+i*7,scaleX:side,rotation:side*angle}),part(id+'-art','sprite',{parent:id,image:'leg',x:-3,y:-10,width:78,height:78*leg.height/leg.width}));
  // Alternating phases prevent the legs from moving like one rigid silhouette.
  const swing=(i%2?1:-1)*4;
  tracks.push(track(id,'rotation',[[0,side*(angle-swing)],[.6,side*(angle+swing)],[1.2,side*(angle-swing)]]));
 }
 parts.push(part('body-art','sprite',{parent:'spider',image:'body',x:-33,y:-48,width:66,height:66*body.height/body.width}));
 return parseModel2D({width:220,height:180,originX:110,originY:8,parts,images:{body:{name:body.name,data:body.data},leg:{name:leg.name,data:leg.data}},animations:{idle:{duration:1.2,loop:true,tracks}}});
}
function flyingSprite(image:FlightArtwork,santa=false){
 const width=santa?460:310,height=width*image.height/image.width,parts=[group('rider'),part('art','sprite',{parent:'rider',image:'art',width,height})],tracks=[track('rider','rotation',[[0,-2],[1,2],[2,-2]]),track('rider','y',[[0,0],[1,-7],[2,0]])];
 // Sparkles are a separate wake behind the travel direction; no baked background.
 for(let i=0;i<16;i++){
  const id='wake-'+i;parts.push(glow(id,width-30+(i*23)%140,height*.58+Math.sin(i*1.9)*29,6+i%4*3,6+i%4*3,santa?gold:'#aeefb8',.6));tracks.push(track(id,'opacity',[[0,.08],[.3+i*.07,.7],[1.95,.08],[2,.08]]),track(id,'x',[[0,width-30+(i*23)%140],[2,width+15+(i*23)%140]]));
 }
 const animations:Model2D['animations']={idle:{duration:2,loop:true,tracks}};
 if(!santa){
  // Mirror the complete rider/lantern/wake around the resource origin, not the canvas.
  for(const p of parts)if(!p.parent)p.parent='moon-flight-root';
  parts.unshift(group('moon-flight-root',{x:width/2,y:height/2,pivotX:width/2,pivotY:height/2}));
  const distance:[number,number][]=[[0,1],[1.1,1],[1.35,.95],[2.4,.48],[3.35,.17],[4.35,.028],[4.8,.006],[5,.006]];
  animations['moon-flight']={duration:5,loop:false,tracks:[track('moon-flight-root','scaleX',distance.map(([t,v])=>[t,-v])),track('moon-flight-root','scaleY',distance),track('moon-flight-root','rotation',[[0,0],[1.1,0],[2.4,-18],[3.35,-12],[5,-12]]),track('moon-flight-root','opacity',[[0,1],[4.4,1],[4.9,0],[5,0]])]};
 }
 return model(width,height,parts,animations,image);
}
/** Feet remain planted in idle; walk is a separate reusable entrance clip. */
function child(image:FlightArtwork){
 const width=170,height=340,parts=[group('child',{x:width/2,y:height,pivotX:width/2,pivotY:height}),part('costume','sprite',{parent:'child',image:'art',width,height})];
 return model(width,height,parts,{idle:{duration:2.4,loop:true,tracks:[track('child','rotation',[[0,-.5],[1.2,.5],[2.4,-.5]])]},walk:{duration:.6,loop:true,tracks:[track('child','y',[[0,height],[.15,height-6],[.3,height],[.45,height-6],[.6,height]]),track('child','rotation',[[0,-2],[.3,2],[.6,-2]])]}},image);
}
function caption(id:string,text:string,y:number,size:number,h:number,at:number,until:number,font:Element['font']='Arial',color=gold){const e=newElement('text',id);Object.assign(e,{text,name:text.replaceAll('\n',' '),x:8,y,width:80,height:h,font,fontSize:size,color,align:'center',at,until,animation:'fade',animationDuration:.3,exitAnimation:'fade',exitDuration:.25,space:'screen'});e.textEffects={...defaultTextEffects(),shadow:{enabled:true,color:'#080715',blur:10,x:0,y:4,opacity:.95}};return e;}
const actor=(object:string,x:number,y:number,scale=1):Actor2D=>({...defaultActor2D(object,object),name:object,x,y,scale});
function move(a:Actor2D,at:number,duration:number,toX:number,toY:number){a.actions.push({...defaultAction2D('move'),at,duration,toX,toY});return a;}
function score(){
 const music=defaultMusic();Object.assign(music,{mode:'score',volume:.45,fadeIn:.3,fadeOut:.8,tempo:100,key:60});
 const pad=presetInstrument('pad','moon'),pluck=presetInstrument('kalimba','spooky'),wind=presetInstrument('pad','wind');Object.assign(pad,{name:'Mystischer Mondakkord',volume:.19,cutoff:1100});Object.assign(pluck,{name:'Verspielte Halloween-Zauberfunken',volume:.29});Object.assign(wind,{name:'Leiser Nachtwind',wave:'noise',volume:.065,cutoff:700,attack:1,release:1});music.instruments=[pad,pluck,wind];const notes:Note[]=[];
 const n=(instrument:string,at:number,duration:number,pitch:number,velocity=.6)=>notes.push({instrument,at,duration,pitch,velocity});
 for(let at=0;at<filmDuration;at+=4){for(const pitch of at<10?[48,55,60,63]:[48,55,60,67])n('moon',at,Math.min(3,filmDuration-at),pitch,.45);n('wind',at,Math.min(2,filmDuration-at),48,.3);}
 for(let i=0;i*.46+.15<=filmDuration;i++)n('spooky',i*.46,.15,(i<22?[72,75,79,78,75,67]:[72,79,84,79,76,79])[i%6],.35+(i%3)*.07);
 music.notes=notes;return music;
}
/** A separate finished starter. All animation stays editable; saved user projects are never migrated. */
export function halloweenNightFlight(art:FlightAssets,references:Storyboard['images']={}):Project{
 const p=demoProject();p.title='Halloween After Dark';p.description='A mystical Halloween forest comes alive with a glowing pumpkin, a flying witch, a bat and a dangling spider. Three cheerful trick-or-treaters meet beneath the moon for a magical Halloween greeting.';p.format='portrait';p.scenes=[];p.assets={};p.objects2d={};p.stages2d={};p.music=score();p.audios={};p.narration=null;p.audioDucking=true;
 const models={pumpkin:pumpkin(art.pumpkin),bat:bat(art['bat-face']),witch:flyingSprite(art.witch),spider:spider(art['spider-body'],art['spider-leg']),'child-skeleton':child(art['child-skeleton']),'child-witch':child(art['child-witch']),'child-vampire':child(art['child-vampire'])};
 const descriptions={pumpkin:'Gruseliger orangefarbener Kürbis: gezacktes Grinsen, heller Innenraum. Kräftiges, unregelmäßiges Feuerlicht aus Augen und Mund, ohne sichtbare Flammen. Separate Lichtmasken, warmes Streulicht und Bodenschein flackern gemeinsam; die Kürbisschale bleibt erhalten. Der Körper bleibt fest.',bat:'Kleine dunkle Fledermaus. Zwei getrennte Flügel schlagen viermal pro Sekunde. Sie fliegt zuerst in einem Bogen auf die Anfangsschrift, faltet die Flügel ein und sitzt dort. Clip perch lässt sie sitzen und anschließend mit erneutem Flügelschlag abheben, während Schrift und Spinnennetz ausblenden. Dieselbe Fledermaus setzt ihren Flug im nächsten Bild ohne Positions-, Größen- oder Posensprung fort. Im zweiten Bild fliegt sie direkt auf die Kamera zu und wird stark größer; ein malerisch texturiertes gruseliges Fledermausgesicht mit leuchtenden Augen und kleinen Fangzähnen wird sichtbar. Anschließend fliegt sie knapp über die Kamera hinaus. Clip approach läuft zusätzlich zum Flügelschlag; keine Blut- oder Blitz-Effekte.',witch:'Malerische Hexe auf einem Besen mit violettem Umhang und grüner Laterne. Fliegt von links herein, steigt zum Mond auf und wird perspektivisch immer kleiner, bis sie dort verschwindet. Clip moon-flight spiegelt Hexe, Laterne und nachlaufende Partikel gemeinsam nach rechts; das vollständige Ensemble schrumpft um denselben Mittelpunkt, ohne das Bild zu verzerren. Leichtes Neigen und eigene magische Partikelspur bleiben erhalten.',spider:'Große, detailreiche, etwas gruselige Spinne mit malerischen Felltexturen, violettem Mondlichtsaum, bernsteinfarbenen Glanzaugen und kleinen hellen Fangzähnen; acht separat phasenversetzt bewegte, behaarte Beine. Keine Gewalt oder Blut. Der Faden ist eine eigene Szenenebene und bleibt beim Abseilen mit dem Körper verbunden.','child-skeleton':'Fröhlicher Junge im Skelettkostüm mit freundlicher Totenkopf-Schminke und Kürbiseimer. Kommt von links, trifft die anderen Kinder im Wald. Eigener walk-Clip mit rhythmischem Wippen, danach ruhige freudige Körperbewegung.','child-witch':'Fröhliches Mädchen als kleine Hexe in violettem Samtkleid, gestreiften Strümpfen, Spitzenhut und Katzen-/Sternenschminke. Kommt von rechts in die Mitte, ohne überlappende Gesichter.','child-vampire':'Gut gelaunter Junge im Vampirkostüm, dunkelblauer Umhang mit bordeauxrotem Futter, freundliche Theaterschminke und kleine Kostümzähne. Kommt von rechts, bleibt rechts neben der kleinen Hexe stehen. Keine Gewalt.'};
 for(const[id,m]of Object.entries(models))p.objects2d[id]={...defaultObject2D('custom'),name:({pumpkin:'Gruselkürbis',bat:'Fledermaus',witch:'Fliegende Hexe',spider:'Abseilende Spinne','child-skeleton':'Skelettkind','child-witch':'Kleine Hexe','child-vampire':'Kleiner Vampir'} as Record<string,string>)[id],model:m};
 p.stages2d.forest={...defaultStage2DResource('custom'),name:'Mystischer Mondwald · 9:16',model:forest(art.forest)};
 const swoosh=defaultSound2D('broom-whoosh');Object.assign(swoosh,{name:'Besenflug',action:'move',trigger:'start'});Object.assign(swoosh.instrument,{name:'Besenflug',wave:'noise',volume:.12,attack:.15,release:.45,cutoff:1500});swoosh.notes=[{at:0,duration:.45,pitch:60,velocity:.5}];p.objects2d.witch.sounds=[swoosh];
 const b=newStoryboard(p.title,'portrait','English');b.id='halloween-night-flight';b.duration=filmDuration;b.story='Eine mystische Halloween-Nacht wird lebendig: Flackernder Kürbis, Fledermaus, eine von links zum Mond fliegende und in der Ferne verschwindende Hexe und abseilende Spinne. Die Fledermaus fliegt zum Abschluss direkt auf die Kamera zu, zeigt kurz ihr gruseliges Gesicht und fliegt über die Linse hinaus. Zum Schluss kommen drei fröhliche, gruselig geschminkte Kinder von links und rechts ins Bild und treffen sich unter dem englischen Happy-Halloween-Gruß im Mondwald. Arbeitsbeschreibungen bleiben auf Deutsch.';b.message='Happy Halloween!';b.audience='TikTok und YouTube Shorts; märchenhaft-gruselig, humorvoll, ohne Gewalt.';b.style='Hochwertige malerische Filmwelt mit satten Texturen und vielen getrennten Animationsebenen. Kein Foliensatz, keine Balken, keine flächige Nachzeichnung der Illustrationen.';b.look={palette:'Mitternachtsblau, sattes Violett, brennendes Kürbisorange; bei den Kinderkostümen Samtviolett, Nachtblau und warmes Orange.',perspective:'Vertikale 540×960-Bühne. Hintergrund vollflächig, bewegliche Figuren transparent und räumlich darüber.',lighting:'Pulsierende warme Kürbisreflexe, langsame Mondlichtstrahlen, wandernde türkis-violette Nordlicht-Bänder unterhalb des Mondes, mit 24 phasenversetzt schwingenden Lichtfalten und durchlaufenden Helligkeitswellen; der Mond bleibt frei, wandernder Bodennebel, einzelne Glühpartikel; warme Reflexe auf den Kinderkostümen. Keine harten Stroboskopblitze.',atmosphere:'Mystisch, lebendig, geheimnisvoll. Die gut gelaunten Kinder verwandeln den Grusel in einen warmen, freundlichen Halloween-Gruß.'};b.production={renderMode:'2d',dialogue:false,music:true,sfx:true};b.images=references;
 for(const[id,obj]of Object.entries(p.objects2d)){const design={...defaultBoardDesign(),mode:'2d' as const,details:descriptions[id as keyof typeof descriptions]};b.characters.push({id,name:obj.name,kind:'character',description:descriptions[id as keyof typeof descriptions],image:id==='bat'&&references['reference-bat-face']?'reference-bat-face':references['reference-'+id]?'reference-'+id:null,resource2d:id,design,status:'draft',comments:[]});}
 b.settings=[{id:'forest',name:p.stages2d.forest.name,description:'Vollflächige 9:16-Mondwald-Kulisse, ohne eingebrannte Figuren. Animierte türkis-violette Nordlicht-Schleier ausschließlich unterhalb des Mondes (geschützter Bereich bis y=285), mit durchlaufenden Wellen in 24 unabhängigen Lichtfalten, Mondstrahlen, Nebel und Glühpartikel ergänzen das unveränderte Hintergrundbild.',image:references['reference-forest']?'reference-forest':null,resource2d:'forest',objects:[],design:{...defaultBoardDesign(),mode:'2d',details:'540×960, Ursprung 0,0. Kein Letterboxing. Nur Umgebung, Figuren bleiben eigenständige Ressourcen.'},status:'draft',comments:[]}];
 const specs=[['awakening','Der Wald erwacht',5],['visitors','Hexenflug und Spinnenfaden',5],['meeting','Die Kinder treffen sich',3.8],['greeting','Happy Halloween im Mondwald',1]] as const;
 for(const[id,name,duration]of specs){const s=newScene(id);Object.assign(s,{name,duration,background:'#101021',transition:'none'});s.stage2d=defaultStage2D('forest');s.stage2d.actors=[actor('pumpkin',270,800,.78)];p.scenes.push(s);}
 const [first,second,third,last]=p.scenes;
 const small=actor('bat',-80,390,.55);small.layer='foreground';move(small,0,1.25,225,230);move(small,1.25,.85,399,128);small.actions.push({...defaultAction2D('play'),clip:'perch',at:0,duration:5});move(small,4.35,.65,365,210);first.stage2d!.stageClip='opening';first.stage2d!.actors.push(small);first.elements.push(caption('opening','A little Halloween\nmagic…',12,112,17,.15,4.6,'Creepster'));
 // Same bat, exact endpoint and size: no second arrival or hidden replacement.
 const continuedBat={...small,x:365,y:210,actions:[] as Actor2D['actions']};
 move(continuedBat,0,1.8,140,420);move(continuedBat,1.8,1.8,270,515);move(continuedBat,4.15,.85,305,-1250);continuedBat.actions.push({...defaultAction2D('play'),clip:'approach',at:0,duration:5});second.stage2d!.actors.push(continuedBat);
 const witch=actor('witch',-250,470,1.1);move(witch,.15,1.2,160,395);move(witch,1.35,2,270,210);move(witch,3.35,1.35,270,154);witch.actions.push({...defaultAction2D('play'),clip:'moon-flight',at:0,duration:5});second.stage2d!.actors.push(witch);
 // Thread and spider share an identical native y track: the anchor never detaches.
 const threadModel=model(540,960,[path('thread',[['M',[405,0]],['L',[405,530]]],{stroke:'#d7c7e6',strokeWidth:1.4,opacity:0})],{lower:{duration:8,loop:false,tracks:[track('thread','opacity',[[0,.72],[5,.72]]),track('thread','scaleY',[[0,-155/530],[1.7,495/530],[3.1,1],[5,-155/530]])]}},undefined,true);
 p.stages2d.forest.model=parseModel2D({...p.stages2d.forest.model!,parts:[...p.stages2d.forest.model!.parts,...threadModel.parts],animations:{...p.stages2d.forest.model!.animations,lower:{...threadModel.animations.lower,tracks:[...p.stages2d.forest.model!.animations.idle.tracks,...threadModel.animations.lower.tracks]}}});second.stage2d!.stageClip='lower';
 const spiderActor=actor('spider',405,-155,.95);move(spiderActor,0,1.7,405,495);move(spiderActor,1.7,1.4,405,530);move(spiderActor,3.1,1.9,405,-155);second.stage2d!.actors.push(spiderActor);
 // Three independent resources enter from BOTH sides. Final scene starts at the exact endpoints.
 for(const[id,startX,endX,at,duration]of [['child-skeleton',-130,145,.2,2.6],['child-witch',780,270,.35,3.1],['child-vampire',980,395,.6,3.2]] as const){
  const arriving=actor(id,startX,568,1);move(arriving,at,duration,endX,568);arriving.actions.push({...defaultAction2D('play'),clip:'walk',at,duration});third.stage2d!.actors.push(arriving);
  last.stage2d!.actors.push(actor(id,endX,568,1));
 }
 for(const scene of [third,last]){
  const pumpkin=scene.stage2d!.actors.find(a=>a.object==='pumpkin')!;pumpkin.y=833;pumpkin.scale=.62;pumpkin.layer='foreground';
  scene.elements.push(caption(scene===last?'happy':'meeting-happy','Happy Halloween!',10,108,12,.1,scene.duration-.3,'Creepster','#ffa947'));
  const title=scene.elements.find(e=>e.type==='text')!;title.until=null;title.exitAnimation='none';if(scene===last){title.at=0;title.animation='none';}title.textEffects.outline={enabled:true,color:'#261023',width:1.6};title.textEffects.glow={enabled:true,color:'#c76113',intensity:10};
 }
 // Caption contrast is a gradient scrim, never a full-width letterbox bar.
 for(const s of p.scenes)if(s.elements.length){const e=newElement('shape',s.id+'-caption-shade');Object.assign(e,{name:'Weicher Textkontrast',x:0,y:4,width:100,height:32,color:'#100c22',borderColor:'none',opacity:.58,animation:'none',fillGradient:{type:'linear',angle:180,x:50,y:0,stops:[{color:'#100c22',position:0,opacity:1},{color:'#100c22',position:65,opacity:.5},{color:'#100c22',position:100,opacity:0}]}});s.elements.unshift(e);}
 for(const[i,s]of p.scenes.entries())b.shots.push({id:s.id,title:s.name,duration:s.duration,settings:['forest'],characters:[...new Set(s.stage2d!.actors.map(a=>a.object))],image:references['reference-forest']?'reference-forest':null,status:'draft',comments:[],action:[
 'Sofort lebendige Atmosphäre: Kürbis glüht wie von einem kräftigen Feuer im Inneren; keine Flammen zeigen. Unregelmäßiges Licht aus Augen und Mund und synchroner Bodenschein. Unterhalb des freien Mondes wandern türkis-violette Nordlichter: 24 Lichtfalten bewegen sich phasenversetzt in Höhe, Länge und Helligkeit, darüber laufen Wellen durch die Bänder, Nebel zieht vorbei. Eine kleine Fledermaus fliegt von links in einem Bogen zum Anfangstext und landet nach 2,1 Sekunden auf dem letzten Wort der ersten Zeile (x=399, y=128; Füße an der Buchstabenoberkante). Dort faltet sie die Flügel ein und bleibt sitzen. Ein feines Spinnennetz hängt rechts an der Schrift. Ab 4,35 Sekunden blenden nur Schrift und Netz bis 4,6 Sekunden aus. Die Fledermaus bleibt sichtbar, entfaltet die Flügel und hebt nach x=365, y=210 ab. Genau dort beginnt im folgenden Bild derselbe Flug mit unveränderter Größe und Pose; keine zweite Fledermaus. Englischer Hook in derselben Creepster-Schrift wie der Halloween-Schlussgruß: A little Halloween magic…',
 'Die Hexe fliegt von links ins Bild (Beginn x=-250, y=470), wird kurz groß sichtbar und steigt dann in einer Bogenbahn zum Mond (x=270, y=154). Clip moon-flight spiegelt die vollständige Ressource nach rechts; Hexe, Laterne und grüne Funkenspur werden proportional immer kleiner. Erst in der Ferne am Mond verblasst die wenige Pixel kleine Silhouette vollständig. Kein seitlicher Abflug und kein plötzliches Verschwinden in voller Größe. Gleichzeitig seilt sich rechts eine Spinne ab, bewegt alle acht Beine und zieht sich wieder hoch. Ihr separater Faden verändert synchron seine Länge. Dieselbe Fledermaus vom Anfangstext startet nahtlos bei x=365, y=210, ohne neuen Einflug von rechts. Sie dreht ab 1,8 Sekunden zur Kamera, wächst mit Clip approach bis zur Nahaufnahme und zeigt kurz leuchtende Augen und kleine Fangzähne. Sie fliegt ab 4,15 Sekunden über die Linse aus dem Bild. Als Vordergrundinstanz überdeckt sie die entfernte Hexe räumlich korrekt. Hier keinen Text über die Aktion setzen.',
 'Drei gut gelaunte, gruselig geschminkte Kinder treten auf: Skelettkind von links, kleine Hexe und Vampirkind zeitversetzt von rechts. Sie kommen unter dem Happy-Halloween-Schriftzug zusammen. Eigene Bewegungsbahnen und rhythmisches Wippen beim Eintritt, Füße auf gleicher Bodenhöhe. Der Vordergrundkürbis glüht weiter. Keine Stimme; das mystische Instrumental wird freundlich-verspielter, mit eigener Halloween-Melodie.',
 'Anschluss ohne Positionssprung: Die Kinder stehen bei x=145, 270 und 395 unter dem Happy-Halloween-Gruß, Köpfe etwa auf Höhe y=400. Leichte einzelne Körperbewegungen, keine erneute Einlaufbewegung und kein Herausrutschen. Der Mond bleibt sichtbar. Typografie: Happy Halloween! als editierbarer Creepster-Text in Kürbisorange mit sanftem Glühen; kein weiterer Schlusstext. Nebel, Nordlichter und Kürbislicht bewegen sich weiter. Genau eine Sekunde Schlussbild nach Abschluss der letzten Einlaufanimation (3,8 Sekunden nach Beginn der Kindersequenz); danach endet das Video bei insgesamt 14,8 Sekunden. Der Happy-Halloween-Schriftzug bleibt ab der Begegnung bis zum Videoende durchgängig sichtbar: kein Ausblenden am Szenenende und kein erneutes Einblenden im Schlussbild.'
 ][i],camera:'Stabile vertikale Filmkomposition; Bewegung durch Figuren und getrennte Licht-/Nebelebenen, kein hektisches Kamera-Zoomen.',audio:'Mystisches Instrumental mit Nachtwind und verspielten Kalimba-Zauberfunken; keine Sprache.',soundEffects:i===1?['Besenflug']:[]});
 b.comments=[{id:'children-note',text:'Drei eigenständige Kinderressourcen mit transparenten Kostümtexturen, separaten Einlaufbahnen und wiederverwendbaren walk-Clips. Schlussbild schließt positionsgenau an und dauert nur eine Sekunde nach Ankunft des letzten Kindes. Referenzen und Freigaben bleiben zur eigenen Prüfung offen.',resolved:false,reply:''}];p.storyboard=b;
 p.publishing={youtube:{title:'Happy Halloween! A Magical Moonlit Forest 🎃',description:'A glowing jack-o’-lantern, a flying witch, a bat and a dangling spider bring a moonlit forest to life. Three cheerful trick-or-treaters meet for a magical Halloween greeting.\n\nHappy Halloween!\n\n#Halloween #SpookySeason #TrickOrTreat #Animation #Shorts',firstComment:'Which Halloween costume would you choose? 🎃',tags:'Halloween animation, Happy Halloween, trick or treat, Halloween costumes, magical forest, flying witch, glowing pumpkin, animated short'},tiktok:{description:'A little spooky magic, a moonlit forest and three happy trick-or-treaters 🎃🦇\nHappy Halloween!\n#Halloween #SpookySeason #TrickOrTreat #Animation',firstComment:'Skeleton, witch or vampire — which one are you? 🎃',cover:null}};return p;
}
