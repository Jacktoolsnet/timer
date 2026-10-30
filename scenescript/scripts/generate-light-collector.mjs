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

## YouTube-Beschreibung inklusive Hashtags

${project.publishing.youtube.description}

## YouTube: erster Kommentar

${project.firstComment}

## YouTube-Tags (kommagetrennt, ohne #)

${project.publishing.youtube.tags}

## YouTube-Cover (16:9)

![Der kleine Lichtsammler – Roboter, Lichtstern und Schmetterlinge im Wald](${project.thumbnail?.name??'der-kleine-lichtsammler-cover.png'})

1280 × 720 Pixel, PNG, 16:9. Aus den tatsächlichen 2D-Ressourcen komponiert; als Projekt-Cover eingebettet.

## TikTok-Caption inklusive Hashtags

${project.publishing.tiktok.description}

## TikTok: erster Kommentar

${project.publishing.tiktok.firstComment}

## TikTok-Cover (9:16)

![Der kleine Lichtsammler – Hochformat](${project.publishing.tiktok.cover?.name??''})

1080 × 1920 Pixel, PNG. Separat herunterladen und manuell hochladen; das Filmformat bleibt unverändert.

Die Texte und Hashtags sind thematisch abgestimmt, garantieren aber keine Suchplatzierungen oder Reichweite. Es wurde nichts veröffentlicht.
`);
