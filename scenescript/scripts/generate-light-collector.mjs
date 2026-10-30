import {writeFile} from 'node:fs/promises';
import {lightCollectorProject} from '../src/lib/light-collector-example.ts';
import {validateProject} from '../src/lib/model.ts';
const project=validateProject(lightCollectorProject());
await writeFile(new URL('../public/examples/light-collector.scenescript.json',import.meta.url),JSON.stringify(project,null,2)+'\n');
console.log('Generated light-collector.scenescript.json');
