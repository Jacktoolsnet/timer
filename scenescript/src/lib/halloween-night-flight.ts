import {demoProject,newScene,newElement,type Project,type Element} from './model.ts';
import {newStoryboard,type Storyboard} from './storyboard.ts';
import {defaultBoardDesign} from './storyboard-design.ts';
import {defaultPart2D,parseModel2D,type Part2D,type Model2D} from './model2d.ts';
import {defaultObject2D,defaultStage2DResource,defaultStage2D,defaultActor2D,defaultAction2D,type Actor2D} from './stage2d.ts';
import {defaultMusic,presetInstrument,type Note} from './music.ts';
import {defaultNarration,type AudioAsset} from './audio.ts';
import {defaultSound2D} from './sound2d.ts';
import {defaultTextEffects} from './text-effects.ts';
export type FlightArtwork={name:string;data:string;width:number;height:number};
export type FlightAssets=Record<'forest'|'pumpkin'|'witch'|'santa'|'bat-face',FlightArtwork>;
const gold='#ffe3a0',violet='#ba91ff';
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
 return model(540,960,parts,{idle:{duration:8,loop:true,tracks}},image,true);
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
 return model(180,90,parts,{idle:{duration:.25,loop:true,tracks},approach},image);
}
function spider(){
 const parts=[group('spider',{x:40,y:28})],tracks:Model2D['animations'][string]['tracks']=[];
 for(let side=-1;side<=1;side+=2)for(let i=0;i<4;i++){
  const id='leg-'+(side<0?'l':'r')+i;parts.push(group(id,{parent:'spider',y:i*5}),path(id+'-line',[['M',[side*5,0]],['Q',[side*(20+i*2),-17+i*3,side*(29+i*2),-10+i*5]],['L',[side*(33+i*3),12+i*4]]],{parent:id,stroke:'#1c122b',strokeWidth:3.5}));tracks.push(track(id,'rotation',[[0,-side*7],[.4,side*7],[.8,-side*7]]));
 }
 parts.push(part('abdomen','ellipse',{parent:'spider',x:-13,y:-14,width:26,height:32,fill:'#292037',stroke:'#aa83bd',strokeWidth:1.5}),part('head','ellipse',{parent:'spider',x:-10,y:9,width:20,height:17,fill:'#151323'}),part('eye-left','ellipse',{parent:'spider',x:-6,y:15,width:4,height:4,fill:'#f8b876'}),part('eye-right','ellipse',{parent:'spider',x:3,y:15,width:4,height:4,fill:'#f8b876'}));return model(80,80,parts,{idle:{duration:.8,loop:true,tracks}});
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
function caption(id:string,text:string,y:number,size:number,h:number,at:number,until:number,font:Element['font']='Arial',color=gold){const e=newElement('text',id);Object.assign(e,{text,name:text.replaceAll('\n',' '),x:8,y,width:80,height:h,font,fontSize:size,color,align:'center',at,until,animation:'fade',animationDuration:.3,exitAnimation:'fade',exitDuration:.25,space:'screen'});e.textEffects={...defaultTextEffects(),shadow:{enabled:true,color:'#080715',blur:10,x:0,y:4,opacity:.95}};return e;}
const actor=(object:string,x:number,y:number,scale=1):Actor2D=>({...defaultActor2D(object,object),name:object,x,y,scale});
function move(a:Actor2D,at:number,duration:number,toX:number,toY:number){a.actions.push({...defaultAction2D('move'),at,duration,toX,toY});return a;}
function score(){
 const music=defaultMusic();Object.assign(music,{mode:'score',volume:.5,fadeIn:.3,fadeOut:.6,tempo:100,key:60});
 const pad=presetInstrument('pad','moon'),pluck=presetInstrument('kalimba','spooky'),bell=presetInstrument('bell','bells'),wind=presetInstrument('pad','wind');Object.assign(pad,{name:'Mystischer Mondakkord',volume:.19,cutoff:1100});Object.assign(pluck,{name:'Zauberfunken',volume:.29});Object.assign(bell,{name:'Weihnachtliche Schlittenglocken',volume:.26,release:.65});Object.assign(wind,{name:'Leiser Nachtwind',wave:'noise',volume:.065,cutoff:700,attack:1,release:1});music.instruments=[pad,pluck,bell,wind];const notes:Note[]=[];
 const n=(instrument:string,at:number,duration:number,pitch:number,velocity=.6)=>notes.push({instrument,at,duration,pitch,velocity});
 for(let at=0;at<12;at+=4){for(const pitch of [48,55,60,63])n('moon',at,3,pitch,.45);n('wind',at,2.5,48,.3);}
 for(let i=0;i<24;i++)n('spooky',i*.46,.15,[72,75,79,78,75,67][i%6],.4+(i%3)*.1);
 for(let at=12;at<22;at+=3){for(const pitch of [48,55,60,64])n('moon',at,2,pitch,.42);}
 const tune=[76,76,76,76,76,76,76,79,72,74,76];for(let i=0;i<tune.length;i++)n('bells',12.2+i*.36,.16,tune[i],.68);
 for(let i=0;i<12;i++)n('bells',17.1+i*.36,.12,[84,79,88,79][i%4],.4);
 music.notes=notes;return music;
}
/** A separate finished starter. All animation stays editable; saved user projects are never migrated. */
export function halloweenNightFlight(art:FlightAssets,voice:AudioAsset,references:Storyboard['images']={}):Project{
 const p=demoProject();p.title='Halloween After Dark';p.description='A mystical Halloween night takes an unexpected Christmas turn. An animated pumpkin, a bat, a flying witch, a dangling spider… and one very early visitor.';p.format='portrait';p.scenes=[];p.assets={};p.objects2d={};p.stages2d={};p.music=score();p.audios={'santa-laugh':voice};p.narration=null;p.audioDucking=true;
 const models={pumpkin:pumpkin(art.pumpkin),bat:bat(art['bat-face']),witch:flyingSprite(art.witch),spider:spider(),santa:flyingSprite(art.santa,true)};
 const descriptions={pumpkin:'Gruseliger orangefarbener Kürbis: gezacktes Grinsen, heller Innenraum. Kräftiges, unregelmäßiges Feuerlicht aus Augen und Mund, ohne sichtbare Flammen. Separate Lichtmasken, warmes Streulicht und Bodenschein flackern gemeinsam; die Kürbisschale bleibt erhalten. Der Körper bleibt fest.',bat:'Kleine dunkle Fledermaus. Zwei getrennte Flügel schlagen viermal pro Sekunde. Sie fliegt zuerst entlang mehrerer Kurven. Im zweiten Bild fliegt sie direkt auf die Kamera zu und wird stark größer; ein malerisch texturiertes gruseliges Fledermausgesicht mit leuchtenden Augen und kleinen Fangzähnen wird sichtbar. Anschließend fliegt sie knapp über die Kamera hinaus. Clip approach läuft zusätzlich zum Flügelschlag; keine Blut- oder Blitz-Effekte.',witch:'Malerische Hexe auf einem Besen mit violettem Umhang und grüner Laterne. Fliegt von links herein, steigt zum Mond auf und wird perspektivisch immer kleiner, bis sie dort verschwindet. Clip moon-flight spiegelt Hexe, Laterne und nachlaufende Partikel gemeinsam nach rechts; das vollständige Ensemble schrumpft um denselben Mittelpunkt, ohne das Bild zu verzerren. Leichtes Neigen und eigene magische Partikelspur bleiben erhalten.',spider:'Kleine achtbeinige Spinne: getrennte bewegte Beine, leuchtende Augen. Der Faden ist eine eigene Szenenebene und bleibt beim Abseilen mit dem Körper verbunden.',santa:'Weihnachtsmann im roten Schlitten mit zwei Rentieren. Eine zusammenhängende transparente Bildressource mit animierter Flugbahn, Neigung und goldener Partikelspur. Hörbarer synthetischer Ho-ho-ho-Einspieler, austauschbar in Audio.'};
 for(const[id,m]of Object.entries(models))p.objects2d[id]={...defaultObject2D('custom'),name:({pumpkin:'Gruselkürbis',bat:'Fledermaus',witch:'Fliegende Hexe',spider:'Abseilende Spinne',santa:'Santa mit Rentierschlitten'} as Record<string,string>)[id],model:m};
 p.stages2d.forest={...defaultStage2DResource('custom'),name:'Mystischer Mondwald · 9:16',model:forest(art.forest)};
 const swoosh=defaultSound2D('broom-whoosh');Object.assign(swoosh,{name:'Besenflug',action:'move',trigger:'start'});Object.assign(swoosh.instrument,{name:'Besenflug',wave:'noise',volume:.12,attack:.15,release:.45,cutoff:1500});swoosh.notes=[{at:0,duration:.45,pitch:60,velocity:.5}];p.objects2d.witch.sounds=[swoosh];
 const b=newStoryboard(p.title,'portrait','English');b.id='halloween-night-flight';b.duration=22;b.story='Eine mystische Halloween-Nacht wird lebendig: Flackernder Kürbis, Fledermaus, eine von links zum Mond fliegende und in der Ferne verschwindende Hexe und abseilende Spinne. Die Fledermaus fliegt zum Abschluss direkt auf die Kamera zu, zeigt kurz ihr gruseliges Gesicht und fliegt über die Linse hinaus. Dann erscheinen goldene Funken und Schlittenglocken: Santa fliegt viel zu früh mit seinem Rentierschlitten herein und lacht hörbar „Ho ho ho!“ in enger Folge ohne lange Pausen. Der englische Schlussgruß verbindet Halloween mit der nahenden Weihnachtszeit. Arbeitsbeschreibungen bleiben auf Deutsch.';b.message='Happy Halloween! But don’t forget… Christmas is coming! Ho ho ho!';b.audience='TikTok und YouTube Shorts; märchenhaft-gruselig, humorvoll, ohne Gewalt.';b.style='Hochwertige malerische Filmwelt mit satten Texturen und vielen getrennten Animationsebenen. Kein Foliensatz, keine Balken, keine flächige Nachzeichnung der Illustrationen.';b.look={palette:'Mitternachtsblau, sattes Violett, brennendes Kürbisorange; beim Santa-Auftritt Rot und Gold.',perspective:'Vertikale 540×960-Bühne. Hintergrund vollflächig, bewegliche Figuren transparent und räumlich darüber.',lighting:'Pulsierende warme Kürbisreflexe, langsame Mondlichtstrahlen, wandernde türkis-violette Nordlicht-Bänder unterhalb des Mondes, mit 24 phasenversetzt schwingenden Lichtfalten und durchlaufenden Helligkeitswellen; der Mond bleibt frei, wandernder Bodennebel, einzelne Glühpartikel; ab Santa goldener Funkenschweif. Keine harten Stroboskopblitze.',atmosphere:'Mystisch, lebendig, geheimnisvoll. Der überraschende Weihnachtsmann löst die Spannung humorvoll auf.'};b.production={renderMode:'2d',dialogue:true,music:true,sfx:true};b.images=references;
 for(const[id,obj]of Object.entries(p.objects2d)){const design={...defaultBoardDesign(),mode:'2d' as const,details:descriptions[id as keyof typeof descriptions]};b.characters.push({id,name:obj.name,kind:'character',description:descriptions[id as keyof typeof descriptions],image:id==='bat'&&references['reference-bat-face']?'reference-bat-face':references['reference-'+id]?'reference-'+id:null,resource2d:id,design,status:'draft',comments:[]});}
 b.settings=[{id:'forest',name:p.stages2d.forest.name,description:'Vollflächige 9:16-Mondwald-Kulisse, ohne eingebrannte Figuren. Animierte türkis-violette Nordlicht-Schleier ausschließlich unterhalb des Mondes (geschützter Bereich bis y=285), mit durchlaufenden Wellen in 24 unabhängigen Lichtfalten, Mondstrahlen, Nebel und Glühpartikel ergänzen das unveränderte Hintergrundbild.',image:references['reference-forest']?'reference-forest':null,resource2d:'forest',objects:[],design:{...defaultBoardDesign(),mode:'2d',details:'540×960, Ursprung 0,0. Kein Letterboxing. Nur Umgebung, Figuren bleiben eigenständige Ressourcen.'},status:'draft',comments:[]}];
 const specs=[['awakening','Der Wald erwacht',5],['visitors','Hexenflug und Spinnenfaden',5],['unexpected','Ein unerwarteter Besucher',5],['greeting','Halloween trifft Weihnachten',7]] as const;
 for(const[id,name,duration]of specs){const s=newScene(id);Object.assign(s,{name,duration,background:'#101021',transition:'none'});s.stage2d=defaultStage2D('forest');s.stage2d.actors=[actor('pumpkin',270,800,.78)];p.scenes.push(s);}
 const [first,second,third,last]=p.scenes;
 const small=actor('bat',-80,390,.55);move(small,0,1.8,340,340);move(small,1.8,1.5,180,490);move(small,3.3,1.7,590,350);first.stage2d!.actors.push(small);first.elements.push(caption('opening','A little Halloween\nmagic…',12,112,17,.15,4.6,'Allura'));
 const bat2=actor('bat',570,360,.47);bat2.layer='foreground';move(bat2,0,1.8,140,420);move(bat2,1.8,1.8,270,515);move(bat2,4.15,.85,305,-1250);bat2.actions.push({...defaultAction2D('play'),clip:'approach',at:0,duration:5});second.stage2d!.actors.push(bat2);
 const witch=actor('witch',-250,470,1.1);move(witch,.15,1.2,160,395);move(witch,1.35,2,270,210);move(witch,3.35,1.35,270,154);witch.actions.push({...defaultAction2D('play'),clip:'moon-flight',at:0,duration:5});second.stage2d!.actors.push(witch);
 // Thread and spider share an identical native y track: the anchor never detaches.
 const threadModel=model(540,960,[path('thread',[['M',[465,0]],['L',[465,530]]],{stroke:'#d7c7e6',strokeWidth:1.4,opacity:0})],{lower:{duration:8,loop:false,tracks:[track('thread','opacity',[[0,.72],[5,.72]]),track('thread','scaleY',[[0,15/530],[1.7,495/530],[3.1,1],[5,15/530]])]}},undefined,true);
 p.stages2d.forest.model=parseModel2D({...p.stages2d.forest.model!,parts:[...p.stages2d.forest.model!.parts,...threadModel.parts],animations:{...p.stages2d.forest.model!.animations,lower:{...threadModel.animations.lower,tracks:[...p.stages2d.forest.model!.animations.idle.tracks,...threadModel.animations.lower.tracks]}}});second.stage2d!.stageClip='lower';
 const spiderActor=actor('spider',465,15,.95);move(spiderActor,0,1.7,465,495);move(spiderActor,1.7,1.4,465,530);move(spiderActor,3.1,1.9,465,15);second.stage2d!.actors.push(spiderActor);
 const santa=actor('santa',850,470,1.05);move(santa,.65,2.35,280,560);move(santa,3,2,270,580);third.stage2d!.actors.push(santa);third.elements.push(caption('surprise','Wait…\nwrong holiday?!',12,100,16,1,4.65,'Allura'));
 third.narration={...defaultNarration(),asset:'santa-laugh',at:.85,volume:.95,text:'Ho! Ho! Ho!',speaker:'Santa · synthetische Demostimme',instructions:'Lokaler synthetischer Einspieler; bei Bedarf durch eine menschliche oder KI-Sprecheraufnahme ersetzen.',fadeIn:.03,fadeOut:.15};
 const finalSanta=actor('santa',270,580,1.05);move(finalSanta,0,3.5,250,590);move(finalSanta,3.5,3.5,-650,350);last.stage2d!.actors.push(finalSanta);
 last.elements.push(caption('happy','Happy Halloween!',10,108,12,.1,6.7,'Creepster','#ffa947'),caption('remember','But don’t forget…',24,50,5,.7,6.7),caption('christmas','Christmas is coming!',31,88,8.5,1.15,6.7,'Mountains of Christmas','#fff1c1'),caption('ho-ho-ho','Ho ho ho!',40,88,9,1.7,6.7,'Allura'));
 // Distinct seasonal typography remains real editable text in preview and export.
 const halloweenTitle=last.elements.find(e=>e.id==='happy')!,christmasTitle=last.elements.find(e=>e.id==='christmas')!;
 halloweenTitle.textEffects.outline={enabled:true,color:'#261023',width:1.6};halloweenTitle.textEffects.glow={enabled:true,color:'#c76113',intensity:10};
 christmasTitle.bold=true;christmasTitle.textEffects.outline={enabled:true,color:'#18352b',width:1.4};christmasTitle.textEffects.glow={enabled:true,color:'#bd913e',intensity:7};
 // Caption contrast is a gradient scrim, never a full-width letterbox bar.
 for(const s of p.scenes)if(s.elements.length){const e=newElement('shape',s.id+'-caption-shade');Object.assign(e,{name:'Weicher Textkontrast',x:0,y:4,width:100,height:s===last?47:32,color:'#100c22',borderColor:'none',opacity:.58,animation:'none',fillGradient:{type:'linear',angle:180,x:50,y:0,stops:[{color:'#100c22',position:0,opacity:1},{color:'#100c22',position:65,opacity:.5},{color:'#100c22',position:100,opacity:0}]}});s.elements.unshift(e);}
 for(const[i,s]of p.scenes.entries())b.shots.push({id:s.id,title:s.name,duration:s.duration,settings:['forest'],characters:[...new Set(s.stage2d!.actors.map(a=>a.object))],image:references['reference-forest']?'reference-forest':null,status:'draft',comments:[],action:[
 'Sofort lebendige Atmosphäre: Kürbis glüht wie von einem kräftigen Feuer im Inneren; keine Flammen zeigen. Unregelmäßiges Licht aus Augen und Mund und synchroner Bodenschein. Unterhalb des freien Mondes wandern türkis-violette Nordlichter: 24 Lichtfalten bewegen sich phasenversetzt in Höhe, Länge und Helligkeit, darüber laufen Wellen durch die Bänder, Nebel zieht vorbei. Eine kleine Fledermaus beschreibt drei Flugsegmente mit echtem Flügelschlag. Englischer Hook: A little Halloween magic…',
 'Die Hexe fliegt von links ins Bild (Beginn x=-250, y=470), wird kurz groß sichtbar und steigt dann in einer Bogenbahn zum Mond (x=270, y=154). Clip moon-flight spiegelt die vollständige Ressource nach rechts; Hexe, Laterne und grüne Funkenspur werden proportional immer kleiner. Erst in der Ferne am Mond verblasst die wenige Pixel kleine Silhouette vollständig. Kein seitlicher Abflug und kein plötzliches Verschwinden in voller Größe. Gleichzeitig seilt sich rechts eine Spinne ab, bewegt alle acht Beine und zieht sich wieder hoch. Ihr separater Faden verändert synchron seine Länge. Die Fledermaus dreht ab 1,8 Sekunden zur Kamera, wächst mit Clip approach bis zur Nahaufnahme und zeigt kurz leuchtende Augen und kleine Fangzähne. Sie fliegt ab 4,15 Sekunden über die Linse aus dem Bild. Als Vordergrundinstanz überdeckt sie die entfernte Hexe räumlich korrekt. Hier keinen Text über die Aktion setzen.',
 'Ein überraschender musikalischer Wechsel ab Sekunde zwölf: Goldene Glocken statt nur mystischer Klänge. Santa und zwei Rentiere kommen von rechts ins Bild, werden mittig klar erkennbar und gleiten nach unten. Hörbar: Ho! Ho! Ho! Englischer Text: Wait… wrong holiday?!',
 'Anschluss ohne Positionssprung: Santa schwebt unterhalb der gut lesbaren Schrift, fliegt dann links hinaus. Kürbis und Nebel bleiben lebendig. Typografie: Happy Halloween! in Creepster mit Kürbisorange und sanftem Glühen, Christmas is coming! in fetter Mountains of Christmas mit warmem Gold-/Elfenbeinton. Beide bleiben editierbarer Text. Englischer Schluss: Happy Halloween! But don’t forget… Christmas is coming! Ho ho ho! Mindestens fünf Sekunden Lesezeit.'
 ][i],camera:'Stabile vertikale Filmkomposition; Bewegung durch Figuren und getrennte Licht-/Nebelebenen, kein hektisches Kamera-Zoomen.',audio:i===2?'Synthetischer Santa lacht hörbar Ho! Ho! Ho!; Musik wird unter der Stimme automatisch abgesenkt.':'Mystisches Instrumental mit Nachtwind; ab dem Santa-Auftritt Weihnachtsglocken.',soundEffects:i===1?['Besenflug']:[]});
 b.comments=[{id:'voice-note',text:'Santa ist bereits als hörbare synthetische Demostimme eingebettet (lokales eSpeak NG, kein Stimmenklon). Die kurze Aufnahme kann im Audiobereich ersetzt werden. Referenzen und ausführbare Ressourcen gehören zu diesem neuen Projekt; Freigaben bleiben zur eigenen Prüfung offen.',resolved:false,reply:''}];p.storyboard=b;
 p.publishing={youtube:{title:'Halloween After Dark… Then Santa Shows Up! 🎃🎅',description:'A glowing jack-o’-lantern, a flying witch, a tiny bat and a dangling spider set the Halloween mood… until Santa arrives a little too early.\n\nHappy Halloween! But don’t forget… Christmas is coming!\n\n#Halloween #ChristmasIsComing #Animation #Shorts',firstComment:'Team Halloween or already waiting for Christmas? 🎃🎄',tags:'Halloween animation, Halloween greeting, Santa Claus, Christmas is coming, flying witch, spooky pumpkin, animated short'},tiktok:{description:'The Halloween vibes were perfect… then HE showed up 🎃🎅\nHappy Halloween — Christmas is coming!\n#Halloween #SpookySeason #ChristmasIsComing #Animation',firstComment:'Too early for Santa? 🎅😂',cover:null}};return p;
}
