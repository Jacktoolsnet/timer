import {writeFile} from 'node:fs/promises';
import {free2DProject} from '../src/lib/free2d-example.ts';
import {validateProject} from '../src/lib/model.ts';
await writeFile(new URL('../public/examples/free-vector-2d.scenescript.json',import.meta.url),JSON.stringify(validateProject(free2DProject()),null,2)+'\n');
