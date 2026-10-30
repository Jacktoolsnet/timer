const words={
 de:{clip:'Animationsclip',create:'2D-Ressource erstellen / verfeinern',resource:'2D-Ressource',assign:'2D-Ressource zuordnen',none:'Keine zugeordnete 2D-Ressource vorhanden.',hint:'Tatsächliche Projektressource, ohne Szenenaktionen oder Kamerabewegung.',missing:'Die zugeordnete Ressource ist nicht mehr im Projekt vorhanden.'},
 en:{clip:'Animation clip',create:'Create / refine 2D resource',resource:'2D resource',assign:'Assign 2D resource',none:'No 2D resource assigned yet.',hint:'Actual project resource, without scene actions or camera movement.',missing:'The assigned resource is no longer available in this project.'},
 es:{clip:'Clip de animación',create:'Crear / refinar recurso 2D',resource:'Recurso 2D',assign:'Asignar recurso 2D',none:'Todavía no hay recurso 2D asignado.',hint:'Recurso real del proyecto, sin acciones ni movimientos de cámara.',missing:'El recurso asignado ya no está disponible en este proyecto.'},
 fr:{clip:'Clip d’animation',create:'Créer / affiner la ressource 2D',resource:'Ressource 2D',assign:'Associer une ressource 2D',none:'Aucune ressource 2D associée.',hint:'Ressource réelle du projet, sans actions ni mouvements de caméra.',missing:'La ressource associée n’est plus disponible dans ce projet.'}
};
export function storyboardResourceWords(locale:string){return words[locale as keyof typeof words]??words.en;}
