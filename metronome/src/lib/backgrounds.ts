export const backgrounds=['landscape','mountains','sea','city','sky','pattern','forest','stars','dunes','aurora','lake','gradient'] as const;
export type Background=typeof backgrounds[number];
export const backgroundCopy={
 de:{label:'Hintergrund',none:'Kein Hintergrund',strength:'Bild beruhigen',hint:'Höhere Werte hellen das Bild im hellen Theme auf und dunkeln es im dunklen Theme ab. Alle Motive bleiben statisch.',names:['Landschaft','Berge','Meer','Stadt','Himmel','Muster','Wald','Sternennacht','Dünen','Polarlichter','See','Farbverlauf']},
 en:{label:'Background',none:'No background',strength:'Soften image',hint:'Higher values lighten the image in light mode and darken it in dark mode. All backgrounds remain static.',names:['Landscape','Mountains','Sea','City','Sky','Pattern','Forest','Starry night','Dunes','Northern lights','Lake','Gradient']},
 es:{label:'Fondo',none:'Sin fondo',strength:'Suavizar imagen',hint:'Los valores altos aclaran la imagen en modo claro y la oscurecen en modo oscuro. Todos los fondos son estáticos.',names:['Paisaje','Montañas','Mar','Ciudad','Cielo','Patrón','Bosque','Noche estrellada','Dunas','Aurora boreal','Lago','Degradado']},
 fr:{label:'Arrière-plan',none:'Sans arrière-plan',strength:'Atténuer l’image',hint:'Les valeurs élevées éclaircissent l’image en mode clair et l’assombrissent en mode sombre. Tous les fonds restent statiques.',names:['Paysage','Montagnes','Mer','Ville','Ciel','Motif','Forêt','Nuit étoilée','Dunes','Aurores boréales','Lac','Dégradé']}
};
