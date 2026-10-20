/** Rebuild the native project offline, preserving its authored, generated publication cover. */
import {readFile,writeFile} from 'node:fs/promises';
import {validateProject} from '../src/lib/model.ts';
import {race3DExample,raceDuration3D} from '../src/lib/race3d-example.ts';
import {raceEffectsWav} from '../src/lib/race3d-audio.ts';
const cover=await readFile(new URL('../public/examples/monstertruck-race-cover-en.jpg',import.meta.url));
const project=validateProject({...race3DExample,
 thumbnail:{name:'Monster-Truck-Race-Red-vs-Blue-Cover.jpg',data:'data:image/jpeg;base64,'+cover.toString('base64')},
 audios:{racefx:{name:'Engines, start signal & crowd (synthetic).wav',duration:raceDuration3D,data:'data:audio/wav;base64,'+Buffer.from(raceEffectsWav(raceDuration3D)).toString('base64')}},
 narration:{asset:'racefx',volume:.65,fadeIn:.05,fadeOut:1,instructions:'Synthetic sound effects; no spoken narration.'}
});
await writeFile(new URL('../public/examples/monstertruck-race.scenescript.json',import.meta.url),JSON.stringify(project,null,2)+'\n');
