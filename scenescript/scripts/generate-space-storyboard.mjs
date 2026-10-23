/** Offline packaging only: artwork was generated using the built-in image tool. */
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parseStoryboard,importStoryboard,exportStoryboard} from '../src/lib/storyboard.ts';
const root=new URL('../public/examples/space-adventure-storyboard/',import.meta.url);
const source=JSON.parse(await readFile(new URL('space-adventure.plan.json',root),'utf8'));
const board=parseStoryboard(source.board),prompts=JSON.parse(await readFile(new URL('prompts.json',root),'utf8'));
for(const [i,shot]of board.shots.entries()){
 const imageId='sketch-'+shot.id,file=String(i+1).padStart(2,'0')+'-'+shot.id+'.jpg';
 const data=await readFile(new URL(file,root));board.images[imageId]={name:file,data:'data:image/jpeg;base64,'+data.toString('base64')};shot.image=imageId;
}
for(const [id,shot]of [['pilot','cockpit-mission'],['hero-fighter','arrival-hook'],['sector-targets','torpedo-third-target'],['enemy-fleet','fifth-target-fleet-arrival']])board.characters.find(c=>c.id===id).image='sketch-'+shot;
for(const [id,shot]of [['relay-sector','laser-double-strike'],['fighter-cockpit','cockpit-mission'],['wormhole-design','arrival-hook']])board.settings.find(s=>s.id===id).image='sketch-'+shot;
const validated=parseStoryboard(board),output=exportStoryboard(validated,true);
// The response retains the exported revision; the application increments it upon import.
assert.equal(validated.id,source.board.id);assert.equal(validated.revision,7);assert.equal(validated.shots.reduce((n,s)=>n+s.duration,0),30);
const original=structuredClone(validated);original.images={};for(const list of [original.shots,original.characters,original.settings])for(const item of list)item.image=null;
assert.deepEqual(parseStoryboard(original),parseStoryboard(source.board));assert.equal(Object.keys(validated.images).length,8);
assert.equal(validated.characters.filter(c=>c.kind==='character').length,1);
assert.equal(validated.characters.filter(c=>c.kind==='object').length,3);
assert.equal(validated.settings.length,3);
assert.ok([...validated.characters,...validated.settings,...validated.shots].every(item=>item.status==='draft'));
for(const current of [null,parseStoryboard(source.board),validated]){const imported=importStoryboard(output,current);assert.equal(imported.revision,8);assert.equal(imported.shots.length,8);assert.equal(Object.keys(imported.images).length,8);assert.equal(imported.comments[0].resolved,false);}
await writeFile(new URL('space-adventure.storyboard.json',root),output+'\n');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const cards=validated.shots.map((shot,i)=>`<article><a href="${escape(validated.images[shot.image].name)}"><img src="${escape(validated.images[shot.image].name)}" alt="${escape(shot.title)}" loading="lazy"></a><h2>${i+1}. ${escape(shot.title)} <small>${shot.duration} s</small></h2><p>${escape(shot.action)}</p></article>`).join('\n');
await writeFile(new URL('index.html',root),`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Space adventure – Storyboard-Skizzen</title><style>body{margin:0;padding:24px;background:#0b1320;color:#e4eaf0;font:16px/1.55 system-ui}header{max-width:1000px;margin:0 auto 24px}a{color:#83e5ee}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px;max-width:1500px;margin:auto}article{padding:12px;border:1px solid #354354;border-radius:12px;background:#142030}img{display:block;width:100%;aspect-ratio:9/16;object-fit:contain;border-radius:8px}h2{font-size:1.05rem}small{color:#99b0c2;font-weight:400}p{font-size:.9rem}.notice{border-left:3px solid #83e5ee;padding-left:14px}</style><header><h1>Space adventure · Storyboard-Skizzen</h1><p>1 Charakter · 3 Objekte · 3 Kulissen · 8 Szenen mit KI-generierten Konzeptbildern · Hochformat 9:16 · 30 Sekunden geplant</p><p><a href="space-adventure.storyboard.json" download>Storyboard-JSON mit allen Bildern herunterladen</a> · <a href="prompts.json">Verwendete Bildprompts (built-in image_gen)</a></p><p class="notice">Im Storyboard-Dialog über das Ordner-Symbol „JSON-Datei öffnen“ in der oberen Toolbar importieren, nicht als Video-SceneScript. Anschließend „Änderungen speichern“. ID und Revision 7 bleiben im Antwort-JSON erhalten. Falls du seit dem Export weitergearbeitet oder schon eine KI-Antwort importiert hast, bitte das aktuelle Feedback-JSON bereitstellen, statt den Versionsschutz zu umgehen.</p><p>Die Bilder sind visuelle Entwürfe, keine fertigen 3D-Ressourcen oder exakten Animationsframes. Bewegungsfolge, Anzahl der Ziele und vier Begleitschiffe richten sich nach dem Storyboard-Text. Vorhandenes Video und Startprojekt werden nicht geändert. Charakter, Objekte und Kulissen verwenden passende Szenenbilder als Referenz, keine zusätzlichen Modellblätter. Der Pilot ist nur als Cockpit-Perspektive angelegt, ohne erfundenes Porträt. Alle Einträge sind Entwürfe; Freigaben erteilt der Anwender nach der Prüfung in den jeweiligen Tabs.</p></header><main class="cards">${cards}</main></html>\n`);
assert.equal(prompts.images.length,8);console.log(`Validated storyboard: ${Buffer.byteLength(output)} bytes, eight embedded images, 30 seconds, revision 7. Existing descriptions and comments unchanged.`);
