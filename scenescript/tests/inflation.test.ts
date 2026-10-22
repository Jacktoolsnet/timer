import {profileSample3D} from '../src/lib/profile3d.ts';
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {inflationExample,inflationDuration,inflationTimelineSeconds,inflationHeight,inflationProfilePoints} from '../src/lib/inflation-example.ts';
import {parseProject,validateProject,projectJsonBytes} from '../src/lib/model.ts';
import {modelPose3D} from '../src/lib/model3d.ts';import {parseStage3D} from '../src/lib/stage3d.ts';
import {DEFAULT_PROJECT_URL,resolveStartupProject} from '../src/lib/startup-project.ts';
const project=()=>validateProject(inflationExample);
test('default is a one-second title card, short mesh morph and exactly three-second text-free material simulation',async()=>{
 const p=project(),native=parseProject(readFileSync(new URL('../public'+DEFAULT_PROJECT_URL,import.meta.url),'utf8'));
 assert.equal(p.format,'portrait');assert.equal(p.scenes.length,2);assert.equal(p.scenes[0].duration,1);assert.equal(p.scenes[1].transition,'morph');assert.equal(p.scenes[1].transitionDuration,.3);assert.equal(p.scenes[1].duration-.3,inflationTimelineSeconds);assert.equal(inflationTimelineSeconds,3);assert.equal(p.scenes.reduce((n,s)=>n+s.duration,0),inflationDuration);assert.equal(inflationDuration,4.3);
 assert.ok(p.scenes.every(s=>s.elements.length===0));assert.equal(p.music,null);assert.equal(p.scenes[1].narration?.asset,'whoosh');assert.equal(p.scenes[1].narration?.at,.3);assert.equal(p.audios.whoosh.duration,3);
 assert.deepEqual({...native,thumbnail:null,assets:{...native.assets,cover:p.assets.cover}},{...p,thumbnail:null,assets:{...p.assets}});assert.equal(native.thumbnail!.data,native.assets.cover.data);assert.equal(native.thumbnail!.data,'data:image/jpeg;base64,'+readFileSync(new URL('../public/examples/inflation-cover-en.jpg',import.meta.url)).toString('base64'));
 assert.ok(projectJsonBytes(native)<4*1024*1024);assert.deepEqual(parseProject(JSON.stringify(native)),native);assert.equal((await resolveStartupProject(null,async()=>native)).project.title,p.title);assert.ok(p.description.includes('not historical inflation data'));
 const wav=Buffer.from(p.audios.whoosh.data.split(',')[1],'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),22050);assert.equal(wav.readUInt32LE(40),22050*3*2);assert.ok([...wav.subarray(20000,22000)].some(x=>x>150));
});
test('continuous material profiles morph in opposite directions with an anchored baseline and held final pose',()=>{
 const p=project(),scene=p.scenes[1];
 for(const actor of scene.stage3d!.actors){const model=p.characters[actor.character].model!,money=actor.id==='money',area=model.parts.find(p=>p.id==='area')!;assert.equal(area.shape,'profile');assert.equal(model.parts.length,2);assert.equal(model.animations.flow.tracks.length,1);assert.equal(area.profile!.heights.length,inflationProfilePoints);
  for(let i=0;i<inflationProfilePoints;i++){const x=i/(inflationProfilePoints-1);let previous=inflationHeight(money,x,0);for(const t of [0,.15,.3,.31,.6,1,1.8,2.7,3.299,3.3,5]){const pose=modelPose3D(model,actor.joints,actor.motions,t),h=profileSample3D(area.profile!,x,pose.get('fillMorph')).height*area.size.y;assert.ok(money?h>=previous-1e-8:h<=previous+1e-8);assert.ok(Math.abs(h-inflationHeight(money,x,Math.min(1,Math.max(0,(t-.3)/3))))<1e-7);previous=h;}assert.ok(Math.abs(previous-inflationHeight(money,x,1))<1e-7);}
  assert.equal(area.position.y,2);assert.deepEqual([...modelPose3D(model,actor.joints,actor.motions,3.3)],[...modelPose3D(model,actor.joints,actor.motions,10)]);
 }
 const values=Array.from({length:inflationProfilePoints},(_,i)=>inflationHeight(true,i/(inflationProfilePoints-1),1));assert.ok(values.slice(1,-1).some((n,i)=>Math.abs(n-(values[i]+values[i+2])/2)>.005));
});
test('glass plinth, polished areas and extruded title are embedded declarative geometry',()=>{
 const p=project(),parts=p.stages.chart.model!.parts;assert.equal(parts.find(x=>x.id==='plinth')!.finish,'glass');assert.equal(parts.filter(x=>x.id.startsWith('headline')&&!x.id.includes('Depth')).length,30);for(const [prefix,line]of [['subtitle','EXPLAINED WITH'],['titleChocolate','CHOCOLATE']])for(const [index,letter]of [...line].entries())if(letter!==' ')assert.ok(parts.some(p=>p.id.startsWith(prefix+index+'_')),line+' letter '+index);assert.equal(p.title,'Inflation Explained with Chocolate');assert.ok(parts.find(p=>p.id==='headlineDepth0_0')!.size.z>=.8);assert.equal(parts.find(p=>p.id==='letteringRig')!.rotation.y,0);const coverText=Buffer.from(p.assets.cover.data.split(',')[1],'base64').toString();assert.ok(coverText.includes('EXPLAINED WITH'));assert.ok(coverText.includes('CHOCOLATE'));assert.ok(!coverText.includes('DUMMIES'));assert.ok(parts.some(x=>x.id==='glassGrid0'));assert.ok(parts.every(x=>!x.id.startsWith('headline')||x.finish==='polished'));assert.ok(p.characters.chocolate.model!.parts.some(x=>x.finish==='polished'));assert.ok(p.characters.money.model!.parts.some(x=>x.finish==='polished'));assert.ok(p.characters.chocolate.model!.parts.some(x=>x.texture?.asset==='chocolateTexture'));assert.ok(p.characters.money.model!.parts.some(x=>x.texture?.asset==='moneyTexture'));for(const [id,file]of [['chocolateTexture','inflation-chocolate-texture.jpg'],['moneyTexture','inflation-money-texture.jpg']])assert.equal(p.assets[id].data,'data:image/jpeg;base64,'+readFileSync(new URL('../public/examples/'+file,import.meta.url)).toString('base64'));
});
test('transparent 3D background is strictly optional, bounded and round-trips without changing opaque stages',()=>{
 const stage={name:'Layer',model:{parts:[{id:'box'}]}};assert.ok(!Object.hasOwn(parseStage3D(stage),'transparentBackground'));assert.ok(!Object.hasOwn(parseStage3D({...stage,transparentBackground:false}),'transparentBackground'));
 const transparent=parseStage3D({...stage,transparentBackground:true});assert.equal(transparent.transparentBackground,true);assert.deepEqual(parseStage3D(JSON.parse(JSON.stringify(transparent))),transparent);for(const value of ['true',1,null])assert.throws(()=>parseStage3D({...stage,transparentBackground:value}),/expected boolean/);
});

test('glossy tiled floor is instanced, grouted and supports the glass plinth within the stage budget',()=>{
 const p=project(),parts=p.stages.chart.model!.parts,tiles=parts.filter(p=>p.id.startsWith('floorTile')),bed=parts.find(p=>p.id==='floorGrout')!,base=parts.find(p=>p.id==='baseShadow')!;
 assert.equal(tiles.length,4);assert.equal(tiles.reduce((n,p)=>n+p.instances!.length,0),143);
 assert.ok(parts.reduce((n,p)=>n+Math.max(1,p.instances?.length??0),0)<=512);
 for(const tile of tiles){assert.equal(tile.shape,'box');assert.equal(tile.finish,'polished');assert.ok(tile.roughness<.35);assert.ok(tile.size.x<2.6);assert.ok(tile.size.z<2.6);assert.ok(bed.position.y+bed.size.y/2<=tile.position.y-tile.size.y/2+1e-8);assert.ok(Math.abs(tile.position.y+tile.size.y/2-(base.position.y-base.size.y/2))<1e-8);}
 const positions=tiles.flatMap(p=>p.instances!);assert.equal(new Set(positions.map(p=>p.x+','+p.z)).size,143);assert.ok(positions.some(p=>p.z>15));assert.ok(positions.some(p=>p.z< -10));
});

test('cover-aligned camera looks from the left and the grid sits on a raised glass backboard',()=>{
 const p=project(),parts=p.stages.chart.model!.parts,glass=parts.find(p=>p.id==='diagramGlass')!,floor=parts.find(p=>p.id==='floorTile0')!;
 assert.equal(glass.finish,'glass');assert.ok(glass.position.y-glass.size.y/2>floor.position.y+floor.size.y/2);for(const grid of parts.filter(p=>/^grid\d+$/.test(p.id))){assert.ok(grid.position.z>glass.position.z+glass.size.z/2);assert.ok(grid.position.y<glass.position.y+glass.size.y/2);}
 assert.ok(p.scenes[1].stage3d!.camera.keys![0].position.x<0);assert.ok(p.scenes[1].morph!.points.length>=6);
});
