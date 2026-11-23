import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const base=fileURLToPath(new URL('..',import.meta.url));const dir=base+'/public/images/galleries/messagedrop';await mkdir(dir,{recursive:true});
const variants=[
 ['Karte erkunden','Vom Kartenausschnitt zum Inhalt',['Ausschnitt wählen','Pins erkunden','Details lesen'],'Pins richten sich nach Ausschnitt, Zoom und Suche. Das Schaubild enthält keine echte Karte oder realen Beiträge.'],
 ['Beitrag vorbereiten','Vor dem Veröffentlichen bewusst prüfen',['Ort kontrollieren','Text und Medien prüfen','Sichtbarkeit wählen'],'Ort, Inhalt und Sichtbarkeit gehören zusammen. Schematische Darstellung, keine echte App-Ansicht.'],
 ['Öffentlich und privat','Unterschiedliche Bereiche, unterschiedliche Zwecke',['Öffentliche Beiträge','Private Notizen','Kontakt-Chats'],'Öffentliche Beiträge, private Notizen und Kontakt-Chats haben unterschiedliche Zwecke. Keine echten Nutzerinhalte.'],
 ['Orte wiederfinden','Eine Position für später vormerken',['Ort suchen','Ort speichern','Auf Karte anspringen'],'Gespeicherte Orte helfen beim Wiederfinden. Das Speichern eines Ortes veröffentlicht nicht automatisch eine Nachricht.'],
];const data=[];
for(const [i,[title,headline,labels,caption]] of variants.entries()){
 const symbols=[
  '<path d="M0-40c-30 0-46 22-46 45 0 32 46 70 46 70S46 37 46 5C46-18 30-40 0-40Z"/><circle cy="5" r="14"/>',
  '<rect x="-44" y="-36" width="88" height="92" rx="10"/><path d="M-25-12h50M-25 10h50M-25 32h30"/>',
  '<path d="m0-42 43 19v33c0 30-43 56-43 56s-43-26-43-56v-33Z"/><path d="m-18 12 13 13L22-8"/>',
  '<path d="M-35-40h70v110L0 48-35 70Z"/>',
 ];
 const colors=['#416b4b','#2b6091','#725098','#256f68'];const color=colors[i];
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600" viewBox="0 0 1000 600"><rect width="1000" height="600" rx="24" fill="#f4f7f3"/><text x="50" y="60" font-family="Arial" font-size="18" fill="${color}">MESSAGEDROP · SCHAUBILD</text><text x="50" y="112" font-family="Arial" font-weight="bold" font-size="30" fill="#24392a">${headline}</text><g transform="translate(500 228)" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${symbols[i]}</g>${labels.map((text,j)=>`<rect x="${35+j*325}" y="350" width="280" height="130" rx="14" fill="white" stroke="${color}" stroke-width="2"/><text x="${175+j*325}" y="423" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="22" fill="${color}">${text}</text>`).join('')}<text x="500" y="548" text-anchor="middle" font-family="Arial" font-size="18" fill="#52654c">Schematische Illustration · keine echte App-Ansicht oder Nutzerdaten</text></svg>`;
 const src=`/images/galleries/messagedrop/${i+1}.svg`,thumb=`/images/galleries/messagedrop/${i+1}-thumb.webp`;
 await writeFile(base+'/public'+src,svg);await sharp(Buffer.from(svg)).resize({width:240,height:170,fit:'cover'}).webp({quality:75}).toFile(base+'/public'+thumb);
 data.push({id:`messagedrop-${i+1}`,title,caption,alt:title+'. '+caption,src,thumb,width:1000,height:600});
}
const file=base+'/src/lib/tool-galleries.json';const galleries=JSON.parse(await readFile(file,'utf8'));galleries.messagedrop=data;await writeFile(file,JSON.stringify(galleries,null,2)+'\n');
