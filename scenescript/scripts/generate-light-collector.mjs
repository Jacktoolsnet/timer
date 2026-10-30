import {writeFile} from 'node:fs/promises';
import {lightCollectorProject} from '../src/lib/light-collector-example.ts';
import {lightCollectorPublishing} from '../src/lib/light-collector-publishing.ts';
import {validateProject} from '../src/lib/model.ts';
const project=validateProject(lightCollectorProject());
await writeFile(new URL('../public/examples/light-collector.scenescript.json',import.meta.url),JSON.stringify(project,null,2)+'\n');
console.log('Generated light-collector.scenescript.json');

await writeFile(new URL('../public/examples/light-collector-publishing.md',import.meta.url),`# ${project.title}

## Kurzbeschreibung

${lightCollectorPublishing.shortDescription}

## Projektbeschreibung

${project.description}

## Erster Kommentar

${project.firstComment}

## Hashtags

${project.hashtags}

## Cover

![Der kleine Lichtsammler – Roboter, Lichtstern und Schmetterlinge im Wald](${project.thumbnail?.name??'der-kleine-lichtsammler-cover.png'})

1280 × 720 Pixel, PNG, 16:9. Aus den tatsächlichen 2D-Ressourcen komponiert; als Projekt-Cover eingebettet.

Die Texte und Hashtags sind thematisch abgestimmt, garantieren aber keine Suchplatzierungen oder Reichweite. Es wurde nichts veröffentlicht.
`);
