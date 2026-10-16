import {defaultPaper,paperPolygon,paperInset,paperGrain} from '../src/lib/paper.ts';
import {defaultExposure,exposureCSS,exposureModes} from '../src/lib/exposure.ts';
import {defaultLiquid,liquidState} from '../src/lib/liquid.ts';
import {particleProgress,fragmentState} from '../src/lib/particles.ts';
import {applyTextPreset,textPresets} from '../src/lib/text-presets.ts';
import {defaultTextEffects,parseTextEffects,textEffectsCSS,textOutlineCSS} from '../src/lib/text-effects.ts';
import {validateSvg,svgDataURL,svgSource} from '../src/lib/svg.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fonts,demoProject,parseProject,animationState,newElement,locateTime,validateImage,sceneTransitions,sceneTransitionState} from '../src/lib/model.ts';
const serialize=(value:unknown)=>JSON.stringify(value);
test('complete demo round trips and schema covers every exported field',()=>{
 const p=demoProject();assert.deepEqual(JSON.parse(serialize(parseProject(serialize(p)))),p);
 const schema=JSON.parse(readFileSync(new URL('../public/schema.json',import.meta.url),'utf8'));
 assert.deepEqual(Object.keys(p).sort(),Object.keys(schema.properties).sort());
 assert.deepEqual(Object.keys(p.scenes[0]).sort(),Object.keys(schema.properties.scenes.items.properties).sort());
 assert.deepEqual(Object.keys(p.scenes[0].elements[0]).sort(),Object.keys(schema.properties.scenes.items.properties.elements.items.properties).sort());
});
test('minimal AI project gets documented defaults',()=>{
 const p=parseProject(serialize({version:'1.0',title:'Minimal',format:'portrait',scenes:[{id:'one',elements:[{id:'text',type:'text'}]}]}));assert.equal(p.scenes[0].duration,5);assert.equal(p.scenes[0].elements[0].fontSize,90);assert.equal(p.scenes[0].background,'#263b42');
});
test('rejects malformed, unsupported and unsafe input',()=>{
 assert.throws(()=>parseProject('{'));const p=demoProject();
 for(const mutate of [(p:any)=>p.version='2.0',(p:any)=>p.html='<script>',(p:any)=>p.scenes=[],(p:any)=>p.scenes[0].duration=-1,(p:any)=>p.scenes[0].elements[0].x='50',(p:any)=>p.scenes[0].elements[0].font='Remote font',(p:any)=>p.scenes[0].elements[0].animation='eval',(p:any)=>p.scenes[0].elements[0].asset='missing',(p:any)=>p.scenes[1].id=p.scenes[0].id,(p:any)=>p.scenes[1].elements[0].id=p.scenes[0].elements[0].id,(p:any)=>p.scenes[0].elements[0].at=6,(p:any)=>p.scenes[0].background='red']){const changed=structuredClone(p);mutate(changed);assert.throws(()=>parseProject(serialize(changed)));}
 for(const value of ['https://example.com/a.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,','data:image/png;base64,invalid!'])assert.throws(()=>validateImage(value));
});
test('images are retained once and asset references checked using own keys',()=>{
 const p=demoProject();p.assets.pixel={name:'pixel.png',data:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='};p.scenes.forEach(s=>s.backgroundAsset='pixel');assert.equal(Object.keys(parseProject(serialize(p)).assets).length,1);
 p.scenes[0].backgroundAsset='constructor';assert.throws(()=>parseProject(serialize(p)),/missing asset/);
});
test('scene timing boundary and end are deterministic',()=>{
 const p=demoProject();assert.deepEqual(locateTime(p,0),{index:0,local:0,ended:false});assert.deepEqual(locateTime(p,5),{index:1,local:0,ended:false});assert.deepEqual(locateTime(p,10),{index:1,local:5,ended:true});
});
test('animation progress, opacity, motion and Unicode typewriter',()=>{
 const e=newElement('text');e.at=2;assert.equal(animationState(e,1).visible,false);assert.equal(animationState(e,2).opacity,0);assert.equal(animationState(e,2.5).opacity,.5);assert.equal(animationState(e,4).opacity,1);
 e.animation='typewriter';e.text='😀ab';assert.equal(animationState(e,2.5).text,'😀');assert.equal(animationState(e,3).text,'😀ab');e.animation='slide-up';assert.match(animationState(e,3).transform,/0px/);
});

test('rich text inherits defaults, rejects unsafe styles and preserves Unicode timing',()=>{
 const p=demoProject(),e=p.scenes[0].elements[0];e.runs=[{text:'😀 '},{text:'World',font:'Georgia',fontSize:120,color:'#ff8800',bold:true}];e.text='old';
 const parsed=parseProject(serialize(p)).scenes[0].elements[0];assert.equal(parsed.text,'😀 World');assert.deepEqual(parsed.runs,e.runs);
 parsed.animation='typewriter';parsed.at=0;parsed.animationDuration=1;assert.equal(animationState(parsed,.5).text,'😀 W');
 for(const run of [{text:'x',html:'<script>'},{text:'x',font:'Unknown'},{text:'x',fontSize:0},{text:'x',bold:'yes'}]){e.runs=[run as any];assert.throws(()=>parseProject(serialize(p)));}
});

test('scene transitions validate, clamp and resolve all directions deterministically',()=>{
 const p=demoProject(),scene=p.scenes[1];scene.transitionDuration=2;
 for(const kind of sceneTransitions){scene.transition=kind;assert.equal(parseProject(serialize(p)).scenes[1].transition,kind);const state=sceneTransitionState(scene,1);assert.equal(state.progress,.5);assert.equal(sceneTransitionState(scene,-1).progress,0);assert.equal(sceneTransitionState(scene,3).progress,1);}
 scene.transition='crossfade';assert.equal(sceneTransitionState(scene,1).opacity,.5);
 scene.transition='slide-left';assert.equal(sceneTransitionState(scene,1).incoming,'translate(50%, 0%)');assert.equal(sceneTransitionState(scene,1).outgoing,'translate(-50%, 0%)');
 scene.transition='slide-down';assert.equal(sceneTransitionState(scene,1).incoming,'translate(0%, -50%)');
 scene.transition='wipe-down';assert.equal(sceneTransitionState(scene,1).clip,'inset(0% 0% 50% 0%)');
 scene.transition='wipe-left';assert.equal(sceneTransitionState(scene,1).clip,'inset(0% 0% 0% 50%)');
 (scene as any).transition='unknown';assert.throws(()=>parseProject(serialize(p)));
});

test('zoom and through-black scene transitions include precise midpoint and endpoints',()=>{
 const scene=demoProject().scenes[1];scene.transitionDuration=2;
 scene.transition='zoom-in';assert.equal(sceneTransitionState(scene,0).incoming,'scale(0.7)');assert.equal(sceneTransitionState(scene,1).incoming,'scale(0.85)');assert.equal(sceneTransitionState(scene,2).incoming,'scale(1)');
 scene.transition='zoom-out';assert.equal(sceneTransitionState(scene,0).incoming,'scale(1.3)');assert.equal(sceneTransitionState(scene,2).incoming,'scale(1)');assert.equal(sceneTransitionState(scene,1).opacity,.5);
 scene.transition='through-black';for(const [time,outgoing,incoming] of [[0,1,0],[.5,.5,0],[1,0,0],[1.5,0,.5],[2,0,1]]){const state=sceneTransitionState(scene,time);assert.equal(state.outgoingOpacity,outgoing);assert.equal(state.opacity,incoming);}
});

test('shape fill and border validate independently and preserve legacy color',()=>{
 const p=demoProject();const shape=newElement('shape','rectangle');p.scenes[0].elements=[shape];
 shape.fillColor='none';shape.borderColor='#ff8800';shape.borderWidth=12;assert.deepEqual(parseProject(serialize(p)).scenes[0].elements[0],shape);
 const legacy=JSON.parse(serialize(p));delete legacy.scenes[0].elements[0].fillColor;delete legacy.scenes[0].elements[0].borderColor;delete legacy.scenes[0].elements[0].borderWidth;legacy.scenes[0].elements[0].color='#123456';const parsed=parseProject(serialize(legacy)).scenes[0].elements[0];assert.equal(parsed.fillColor,'#123456');assert.equal(parsed.borderColor,'none');
 for(const [key,value] of [['fillColor','red'],['borderColor','transparent'],['borderWidth',-1],['borderWidth',501]]){const invalid=structuredClone(p);(invalid.scenes[0].elements[0] as any)[key]=value;assert.throws(()=>parseProject(serialize(invalid)));}
});

test('border line styles round trip, default to solid and reject unknown values',()=>{
 const p=demoProject(),e=newElement('shape');p.scenes[0].elements=[e];
 for(const style of ['solid','dashed','dotted','double'] as const){e.borderStyle=style;assert.equal(parseProject(serialize(p)).scenes[0].elements[0].borderStyle,style);}
 const legacy=JSON.parse(serialize(p));delete legacy.scenes[0].elements[0].borderStyle;assert.equal(parseProject(serialize(legacy)).scenes[0].elements[0].borderStyle,'solid');
 (e as any).borderStyle='unknown';assert.throws(()=>parseProject(serialize(p)));
});

test('built-in shape types round trip and legacy shapes stay rectangles',()=>{
 const p=demoProject(),e=newElement('shape');p.scenes[0].elements=[e];
 for(const kind of ['rectangle','ellipse','triangle','diamond','star','arrow'] as const){e.shapeType=kind;assert.equal(parseProject(serialize(p)).scenes[0].elements[0].shapeType,kind);}
 const old=JSON.parse(serialize(p));delete old.scenes[0].elements[0].shapeType;assert.equal(parseProject(serialize(old)).scenes[0].elements[0].shapeType,'rectangle');
 (e as any).shapeType='external-svg';assert.throws(()=>parseProject(serialize(p)));
});

test('safe SVG supports graphics, local gradients, text and deterministic SMIL',()=>{
 const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="paint"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="#000"/></linearGradient></defs><circle cx="20" cy="50" r="10" fill="url(#paint)"><animate attributeName="cx" from="20" to="80" dur="2s" repeatCount="indefinite"/></circle><text x="5" y="15">Grüße 😀</text></svg>';
 const data=svgDataURL(validateSvg(source));assert.equal(validateImage(data),data);assert.match(svgSource(data),/Grüße 😀/);
 const p=demoProject();p.assets.vector={name:'vector.svg',data};p.scenes[0].backgroundAsset='vector';assert.deepEqual(parseProject(serialize(p)).assets.vector,p.assets.vector);
 assert.match(validateSvg('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="40" height="30" style="fill: red;stroke: blue"/></svg>'),/viewBox="0 0 100 50"/);
});
test('unsafe, unsupported and malformed SVG is rejected before rendering',()=>{
 const wrap=(content:string)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+content+'</svg>';
 for(const content of ['<script>alert(1)</script>','<foreignObject/>','<image href="https://example.com/x.png"/>','<use href="#x"/>','<rect onclick="alert(1)"/>','<rect fill="url(https://example.com/x)"/>','<rect style="background:url(https://example.com/x)"/>','<style>@import "x";</style>','<rect fill="url(#missing)"/>','<rect id="x"/><circle id="x"/>','<rect><animate attributeName="href" from="x" to="y" dur="1s"/></rect>','<rect><animate attributeName="opacity" from="0" to="1" begin="click" dur="1s"/></rect>','<rect><animate attributeName="opacity" from="0" to="1" dur="0s"/></rect>','<rect><animate attributeName="opacity" from="0" to="1" dur="1s" onbegin="alert(1)"/></rect>','<rect width="1e999"/>','<rect>','<filter/>','<mask/>','<g xmlns="http://www.w3.org/1999/xhtml"><script/></g>'])assert.throws(()=>validateImage(svgDataURL(wrap(content))),/SVG/,content);
 assert.throws(()=>validateSvg('<!DOCTYPE svg [<!ENTITY x "secret">]>'+wrap('<text>&x;</text>')));
 assert.throws(()=>validateSvg(wrap('<rect/>'.repeat(2001))));assert.throws(()=>validateSvg(wrap('<desc>'+'x'.repeat(1024*1024)+'</desc>')));
});

test('gradients validate, default, round trip and reject malformed stops',()=>{
 const p=demoProject();const g={type:'conic',angle:45,x:20,y:70,stops:[{color:'#ff0000',position:0,opacity:1},{color:'#0000ff',position:100,opacity:0}]};
 const raw=JSON.parse(serialize(p));raw.scenes[0].backgroundGradient=g;raw.scenes[0].elements.push({...newElement('shape','gradient-shape'),fillGradient:g});
 const parsed=parseProject(serialize(raw));assert.deepEqual(parsed.scenes[0].backgroundGradient,g);assert.deepEqual(parsed.scenes[0].elements.at(-1)!.fillGradient,g);
 delete raw.scenes[0].backgroundGradient;assert.equal(parseProject(serialize(raw)).scenes[0].backgroundGradient,null);
 for(const change of [{type:'evil'},{angle:361},{x:-1},{stops:[]},{stops:[{color:'url(evil)',position:0},{color:'#ffffff',position:100}]},{stops:[{color:'#ffffff',position:90},{color:'#000000',position:10}]},{stops:[{color:'#ffffff',position:0,opacity:2},{color:'#000000',position:100}]},{extra:true}]){
  raw.scenes[0].backgroundGradient={...g,...change};assert.throws(()=>parseProject(serialize(raw)),/backgroundGradient/);
 }
});

test('simulation defaults, validation, opacity and particle budgets',()=>{
 const raw=JSON.parse(serialize(demoProject()));
 raw.backgroundSimulation={type:'snow'};
 raw.scenes[0].backgroundOpacity=0;
 raw.scenes[0].elements.push({id:'effect',type:'simulation'});
 const parsed=parseProject(serialize(raw));
 assert.equal(parsed.backgroundSimulation!.type,'snow');assert.equal(parsed.backgroundSimulation!.count,60);
 assert.equal(parsed.scenes[0].elements.at(-1)!.simulation!.type,'particles');assert.equal(parsed.scenes[0].backgroundOpacity,0);
 assert.deepEqual(parseProject(serialize(parsed)),parsed);
 for(const change of [{type:'fire'},{color:'red'},{count:0},{count:2.5},{speed:0},{size:101},{opacity:2},{seed:-1},{seed:1.5},{script:'evil'}]){
  raw.backgroundSimulation={type:'particles',...change};assert.throws(()=>parseProject(serialize(raw)),/backgroundSimulation/);
 }
 raw.backgroundSimulation=null;raw.scenes[0].elements.at(-1).simulation=null;assert.throws(()=>parseProject(serialize(raw)),/simulation/);
 raw.scenes[0].elements=Array.from({length:26},(_,i)=>({id:'effect-'+i,type:'simulation',simulation:{type:'snow',count:200}}));
 assert.throws(()=>parseProject(serialize(raw)),/5000/);
});

test('background switch defaults on and requires a boolean',()=>{
 const p=JSON.parse(serialize(demoProject()));delete p.scenes[0].backgroundEnabled;
 assert.equal(parseProject(serialize(p)).scenes[0].backgroundEnabled,true);
 p.scenes[0].backgroundEnabled=false;assert.equal(parseProject(serialize(p)).scenes[0].backgroundEnabled,false);
 p.scenes[0].backgroundEnabled='false';assert.throws(()=>parseProject(serialize(p)),/backgroundEnabled/);
});

test('publication metadata round trips, defaults for legacy projects and validates types and lengths',()=>{
 const p=demoProject();p.description='A description\nwith a second line';p.hashtags='#Video, #SceneScript';
 assert.equal(parseProject(serialize(p)).description,p.description);assert.equal(parseProject(serialize(p)).hashtags,p.hashtags);
 const legacy=JSON.parse(serialize(p));delete legacy.description;delete legacy.hashtags;const parsed=parseProject(serialize(legacy));assert.equal(parsed.description,'');assert.equal(parsed.hashtags,'');
 for(const key of ['description','hashtags'] as const){for(const invalid of [null,[],42])assert.throws(()=>parseProject(serialize({...p,[key]:invalid})),new RegExp(key));}
 assert.throws(()=>parseProject(serialize({...p,description:'x'.repeat(5001)})),/description/);assert.throws(()=>parseProject(serialize({...p,hashtags:'x'.repeat(2001)})),/hashtags/);
});
test('publication thumbnail defaults, embeds independently and validates strictly',()=>{
 const p=demoProject();assert.equal(p.thumbnail,null);const legacy=JSON.parse(JSON.stringify(p));delete legacy.thumbnail;assert.equal(parseProject(JSON.stringify(legacy)).thumbnail,null);
 const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';p.thumbnail={name:'cover.png',data};assert.deepEqual(parseProject(JSON.stringify(p)).thumbnail,p.thumbnail);assert.equal(Object.keys(p.assets).length,0);
 for(const value of ['image-id',{}, {name:'cover',data:null},{name:null,data},{name:'cover',data:'https://example.com/image.png'},{name:'cover',data:svgDataURL('<svg xmlns="http://www.w3.org/2000/svg"/>')},{name:'cover',data,extra:true}])assert.throws(()=>parseProject(JSON.stringify({...p,thumbnail:value})));
});

test('all offered fonts round trip in elements and rich text and match the schema',()=>{
 const schema=JSON.parse(readFileSync(new URL('../public/schema.json',import.meta.url),'utf8'));
 const properties=schema.properties.scenes.items.properties.elements.items.properties;
 assert.deepEqual(properties.font.enum,[...fonts]);
 assert.deepEqual(properties.runs.items.properties.font.enum,[...fonts]);
 assert.equal(new Set(fonts).size,fonts.length);
 for(const font of fonts){
  const p=demoProject(),e=p.scenes[0].elements[0];e.font=font;e.runs=[{text:'ÄÖÜ äöü ß',font}];
  const parsed=parseProject(serialize(p)).scenes[0].elements[0];
  assert.equal(parsed.font,font);assert.deepEqual(parsed.runs,e.runs);
 }
});

test('text effects default off, round trip and reject invalid input',()=>{
 const p=demoProject(),e=p.scenes[0].elements[0];assert.equal(textEffectsCSS(e.textEffects),'none');
 const legacy=JSON.parse(serialize(p));delete legacy.scenes[0].elements[0].textEffects;
 assert.deepEqual(parseProject(serialize(legacy)).scenes[0].elements[0].textEffects,defaultTextEffects());
 e.textEffects.glow.enabled=true;e.textEffects.shadow.enabled=true;
 assert.deepEqual(parseProject(serialize(p)).scenes[0].elements[0].textEffects,e.textEffects);
 assert.match(textEffectsCSS(e.textEffects),/0 0 16px #ff66cc/);assert.match(textEffectsCSS(e.textEffects,.5),/2px 2px 3px rgba/);
 for(const v of [null,[],{unknown:true},{glow:{enabled:'yes'}},{glow:{color:'red'}},{glow:{intensity:101}},{shadow:{blur:-1}},{shadow:{x:101}},{shadow:{y:-101}},{shadow:{opacity:2}},{shadow:{opacity:NaN}}])assert.throws(()=>parseTextEffects(v,'effects'));
 assert.equal(textEffectsCSS(parseTextEffects({glow:{enabled:true,intensity:0},shadow:{enabled:true,opacity:0}},'effects')),'none');
});

test('text outlines validate, scale and default off in older effect settings',()=>{
 const effects=parseTextEffects({glow:{enabled:true}},'effects');assert.deepEqual(effects.outline,{enabled:false,color:'#000000',width:2});assert.equal(textOutlineCSS(effects),'0px transparent');
 effects.outline={enabled:true,color:'#ff0000',width:12};assert.equal(textOutlineCSS(effects,.5),'6px #ff0000');
 const p=demoProject();p.scenes[0].elements[0].textEffects=effects;assert.deepEqual(parseProject(serialize(p)).scenes[0].elements[0].textEffects,effects);
 for(const outline of [null,[],{enabled:'true'},{color:'red'},{width:-1},{width:21},{width:Infinity},{extra:true}])assert.throws(()=>parseTextEffects({outline},'effects'));
 effects.outline.width=0;assert.equal(textOutlineCSS(effects),'0px transparent');
});

test('text gradients round trip, default off and validate with the existing gradient rules',()=>{
 const p=demoProject(),e=p.scenes[0].elements[0];assert.equal(e.textGradient,null);const legacy=JSON.parse(serialize(p));delete legacy.scenes[0].elements[0].textGradient;assert.equal(parseProject(serialize(legacy)).scenes[0].elements[0].textGradient,null);
 for(const type of ['linear','radial','conic'] as const){e.textGradient={type,angle:90,x:50,y:50,stops:[{color:'#ff0000',position:0,opacity:1},{color:'#0000ff',position:100,opacity:1}]};assert.deepEqual(parseProject(serialize(p)).scenes[0].elements[0].textGradient,e.textGradient);}
 for(const value of [{type:'invalid'}, {type:'linear',stops:[]},{type:'linear',stops:[{color:'red',position:0},{color:'#ffffff',position:100}]}]){const raw=JSON.parse(serialize(p));raw.scenes[0].elements[0].textGradient=value;assert.throws(()=>parseProject(serialize(raw)));}
});

test('text presets round trip, replace old effects and preserve content and layout',()=>{
 const p=demoProject(),e=p.scenes[0].elements[0];e.font='Allura';e.runs=[{text:'Hello',color:'#ff0000',font:'Parisienne',italic:true,bold:false}];
 const original=serialize(e);
 for(const preset of textPresets){const next=applyTextPreset(e,preset);p.scenes[0].elements[0]=next;const parsed=parseProject(serialize(p)).scenes[0].elements[0];assert.deepEqual(parsed.textEffects,next.textEffects);assert.deepEqual(parsed.textGradient,next.textGradient);
  for(const key of ['id','font','x','y','width','height','animation','at','animationDuration'] as const)assert.equal(next[key],e[key]);
  assert.equal(next.runs[0].text,'Hello');assert.equal(next.runs[0].font,'Parisienne');assert.equal(next.runs[0].italic,true);assert.equal(next.runs[0].color,undefined);
 }
 assert.equal(serialize(e),original);const comic=applyTextPreset(e,'comic');assert.equal(comic.bold,true);assert.equal(comic.runs[0].bold,undefined);
 const neon=applyTextPreset(comic,'neonBlue');assert.equal(neon.textEffects.outline.enabled,false);assert.equal(neon.textEffects.shadow.enabled,false);assert.equal(neon.textGradient,null);
 const a=applyTextPreset(e,'gold'),b=applyTextPreset(e,'gold');a.textGradient!.stops[0].color='#000000';assert.notEqual(a.textGradient!.stops[0].color,b.textGradient!.stops[0].color);
});

test('first comment metadata is optional, bounded plain text and round trips',()=>{
 const p=demoProject();p.firstComment='Your thoughts?\n<img src=x onerror=alert(1)>';
 assert.equal(parseProject(serialize(p)).firstComment,p.firstComment);
 const legacy=JSON.parse(serialize(p));delete legacy.firstComment;
 assert.equal(parseProject(serialize(legacy)).firstComment,'');
 for(const firstComment of [null,42,[],{},'x'.repeat(5001)])
  assert.throws(()=>parseProject(serialize({...p,firstComment})),/firstComment/);
 p.firstComment='x'.repeat(5000);assert.equal(parseProject(serialize(p)).firstComment.length,5000);
});

test('line drawing animation persists on shapes and is excluded from group animations',()=>{
 const p=demoProject(),shape=newElement('shape');shape.animation='draw';p.scenes[0].elements=[shape];
 assert.equal(parseProject(serialize(p)).scenes[0].elements[0].animation,'draw');
 p.scenes[0].groups=[{id:'draw-group',name:'Group',members:[shape.id],pivot:{x:0,y:0},x:0,y:0,rotation:0,opacity:1,animation:'draw',at:0,until:null,animationDuration:1,exitAnimation:'none',exitDuration:.5,motionPath:null}];
 assert.throws(()=>parseProject(serialize(p)),/groups\[0\].animation/);
});

test('particle exits round trip and reject unsupported elements and groups',()=>{
 const p=demoProject(),e=newElement('shape');p.scenes[0].elements=[e];
 for(const exit of ['particles-dust','particles-sparks','particles-confetti'] as const){
  e.exitAnimation=exit;assert.equal(parseProject(serialize(p)).scenes[0].elements[0].exitAnimation,exit);
  for(const type of ['text','image'] as const){e.type=type;assert.equal(parseProject(serialize(p)).scenes[0].elements[0].exitAnimation,exit);}e.type='shape';
  for(const type of ['bubble','video','simulation'] as const)assert.throws(()=>parseProject(serialize({...p,scenes:[{...p.scenes[0],elements:[{...newElement(type),exitAnimation:exit}]}]})),/exitAnimation/);
  p.scenes[0].groups=[{id:'particle-group',name:'Group',members:[e.id],pivot:{x:0,y:0},x:0,y:0,rotation:0,opacity:1,animation:'none',at:0,until:null,animationDuration:1,exitAnimation:exit,exitDuration:1,motionPath:null}];
  assert.throws(()=>parseProject(serialize(p)),/groups\[0\].exitAnimation/);p.scenes[0].groups=[];
 }
});

test('particle timing clamps exit duration and fragment motion is reproducible',()=>{
 assert.equal(particleProgress(2,null,5,2,2),0);
 assert.equal(particleProgress(2,null,5,2,4),.5);
 assert.equal(particleProgress(2,4,8,10,3),.5);
 assert.equal(particleProgress(2,4,8,10,5),1);
 const a=fragmentState('stable',17,'particles-dust',.5,800,400);
 assert.deepEqual(a,fragmentState('stable',17,'particles-dust',.5,800,400));
 assert.notDeepEqual(a,fragmentState('other',17,'particles-dust',.5,800,400));
 for(const kind of ['particles-dust','particles-sparks','particles-confetti'] as const){
  assert.equal(fragmentState('id',0,kind,0,800,400).opacity,1);
  assert.equal(fragmentState('id',0,kind,1,800,400).opacity,0);
 }
});

test('liquid distortion defaults, round trips and strict field validation',()=>{
 const p=demoProject(),e=p.scenes[0].elements[0];e.liquid={enabled:true,style:'melt',strength:35,wavelength:90,speed:.7};
 assert.deepEqual(parseProject(serialize(p)).scenes[0].elements[0].liquid,e.liquid);
 const legacy=JSON.parse(serialize(p));delete legacy.scenes[0].elements[0].liquid;
 assert.deepEqual(parseProject(serialize(legacy)).scenes[0].elements[0].liquid,{enabled:false,style:'water',strength:24,wavelength:120,speed:1});
 for(const value of [null,[],42,{enabled:'yes'},{style:'unknown'},{strength:-1},{strength:101},{wavelength:9},{wavelength:501},{speed:-1},{speed:6},{speed:null},{unknown:1}]){
  const invalid=JSON.parse(serialize(p));invalid.scenes[0].elements[0].liquid=value;
  assert.throws(()=>parseProject(serialize(invalid)),/liquid/);
 }
 const partial=JSON.parse(serialize(p));partial.scenes[0].elements[0].liquid={enabled:true};
 assert.equal(parseProject(serialize(partial)).scenes[0].elements[0].liquid.strength,24);
});

test('liquid motion is timeline-driven, freezes at speed zero and disables cleanly',()=>{
 const e={...defaultLiquid(),enabled:true};
 assert.deepEqual(liquidState(e,-1),liquidState(e,0));
 assert.deepEqual(liquidState(e,1),liquidState(e,1));
 assert.notDeepEqual(liquidState(e,1),liquidState(e,2));
 assert.deepEqual(liquidState({...e,speed:0},1),liquidState({...e,speed:0},100));
 assert.equal(liquidState({...e,enabled:false},1).strength,0);
 assert.equal(liquidState({...e,strength:0},1).strength,0);
});

test('double exposure validates strictly and preserves legacy rendering',()=>{
 const p=demoProject(),e=p.scenes[0].elements[0];e.exposure={enabled:true,mode:'screen',strength:.7};
 assert.deepEqual(parseProject(serialize(p)).scenes[0].elements[0].exposure,e.exposure);
 const legacy=JSON.parse(serialize(p));delete legacy.scenes[0].elements[0].exposure;
 assert.deepEqual(parseProject(serialize(legacy)).scenes[0].elements[0].exposure,defaultExposure());
 for(const value of [null,[],42,{enabled:'yes'},{mode:'unknown'},{strength:-.1},{strength:1.1},{strength:null},{unknown:1}]){
  const invalid=JSON.parse(serialize(p));invalid.scenes[0].elements[0].exposure=value;
  assert.throws(()=>parseProject(serialize(invalid)),/exposure/);
 }
 for(const mode of exposureModes){e.exposure.mode=mode;assert.equal(parseProject(serialize(p)).scenes[0].elements[0].exposure.mode,mode);}
 const partial=JSON.parse(serialize(p));partial.scenes[0].elements[0].exposure={enabled:true};
 assert.equal(parseProject(serialize(partial)).scenes[0].elements[0].exposure.strength,.65);
 assert.deepEqual(exposureCSS({enabled:true,mode:'multiply',strength:.5},.4),{mixBlendMode:'multiply',opacity:'0.2'});
 assert.deepEqual(exposureCSS({enabled:false,mode:'multiply',strength:0},.4),{mixBlendMode:'normal',opacity:'0.4'});
 assert.equal(exposureCSS({enabled:true,mode:'screen',strength:0},1).opacity,'0');
});

test('paper collage defaults, strict validation and supported element types',()=>{
 const p=demoProject(),e=p.scenes[0].elements[0];e.paper={...defaultPaper(),enabled:true,edge:'cut',seed:123};
 assert.deepEqual(parseProject(serialize(p)).scenes[0].elements[0].paper,e.paper);
 const legacy=JSON.parse(serialize(p));delete legacy.scenes[0].elements[0].paper;
 assert.deepEqual(parseProject(serialize(legacy)).scenes[0].elements[0].paper,defaultPaper());
 for(const value of [null,[],42,{enabled:'yes'},{edge:'bad'},{color:'red'},{padding:-1},{padding:101},{roughness:41},{texture:1.1},{shadow:41},{seed:1.5},{seed:65536},{seed:null},{unknown:1}]){
  const invalid=JSON.parse(serialize(p));invalid.scenes[0].elements[0].paper=value;assert.throws(()=>parseProject(serialize(invalid)),/paper/);
 }
 for(const type of ['bubble','video','simulation'] as const){
  const invalid=demoProject(),element=newElement(type);element.paper.enabled=true;invalid.scenes[0].elements=[element];assert.throws(()=>parseProject(serialize(invalid)),/paper/);
 }
 for(const type of ['text','image','shape'] as const){e.type=type;assert.equal(parseProject(serialize(p)).scenes[0].elements[0].paper.enabled,true);}
});

test('paper edge and grain are seeded, bounded and stable for small elements',()=>{
 const p={...defaultPaper(),enabled:true};
 assert.equal(paperPolygon(p,800,400),paperPolygon(p,800,400));
 assert.notEqual(paperPolygon(p,800,400),paperPolygon({...p,seed:18},800,400));
 assert.notEqual(paperPolygon(p,800,400),paperPolygon({...p,edge:'cut'},800,400));
 assert.equal(paperPolygon({...p,roughness:0},800,400),'polygon(0% 0%,100% 0%,100% 100%,0% 100%)');
 for(const size of [1,2,10,400]){
  const coords=paperPolygon(p,size,size).match(/[0-9.]+(?=%)/g)!.map(Number);
  assert.ok(coords.every(n=>n>=0&&n<=100));assert.ok(paperInset(p,size,size)<=Math.max(0,(size-1)/2));
 }
 assert.equal(paperGrain(17),paperGrain(17));assert.notEqual(paperGrain(17),paperGrain(18));
});
