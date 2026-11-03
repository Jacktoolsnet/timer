export const visualizationModes=['orbit','landscape'] as const;
export type VisualizationMode=typeof visualizationModes[number];
export const visualizationCopy={
 de:{title:'Darstellung',orbit:'Orbit',landscape:'Klanglandschaft',description:'Klanglandschaft: neun farbige Klangspuren zeigen Tonhöhe, Länge und Lautstärke der gespielten Noten. Die Eingabeflächen bleiben unverändert.',orbitOnly:'Diese Effekte gehören zur Orbit-Ansicht.'},
 en:{title:'Visualization',orbit:'Orbit',landscape:'Sound landscape',description:'Sound landscape: nine coloured streams show the pitch, length and level of the notes being played. The input surfaces are unchanged.',orbitOnly:'These effects belong to the orbit view.'},
 es:{title:'Visualización',orbit:'Órbita',landscape:'Paisaje sonoro',description:'Paisaje sonoro: nueve corrientes de color muestran la altura, duración y volumen de las notas. Las superficies de entrada no cambian.',orbitOnly:'Estos efectos pertenecen a la vista orbital.'},
 fr:{title:'Visualisation',orbit:'Orbite',landscape:'Paysage sonore',description:'Paysage sonore : neuf courants colorés montrent la hauteur, la durée et le volume des notes jouées. Les surfaces de saisie restent inchangées.',orbitOnly:'Ces effets appartiennent à la vue orbitale.'}
} as const;
